"""Pruebas aisladas: nunca utilizan la base de datos de desarrollo."""
import os
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET"] = "isolated-test-key-not-used-by-real-services"

import hashlib
from io import BytesIO
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from PIL import Image
from sqlalchemy.exc import SQLAlchemyError
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from database import Base, get_db
from main import app
from auth import create_access_token, hash_password, verify_password
from migrations import migrate
from provision_admin import create_administrator
import models
import schemas
from seed_demo import seed_demo
from demo_presentation import refresh_presentation, SHELTER_ADDRESSES


PASSWORD = "Pruebas123!"
HASH = hash_password(PASSWORD)


class AppTests(unittest.TestCase):
    def setUp(self):
        self.images = tempfile.TemporaryDirectory()
        self.previous_upload_dir = os.environ.get("UPLOAD_DIR")
        os.environ["UPLOAD_DIR"] = self.images.name
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        with self.sessions() as db:
            db.add_all([models.Rol(id_rol=i, nombre_rol=name) for i, name in [
                (1, "Administrador"), (2, "Refugio / Encargado"), (3, "Usuario")]])
            db.flush()
            db.add_all([models.Refugio(id_refugio=i, nombre_organizacion=f"Refugio {i}", direccion="Calle 1",
                                      ciudad="Peñamiller", estado="Querétaro", telefono="1234567890") for i in (1, 2)])
            db.flush()
            db.add_all([models.Usuario(id_usuario=i, id_rol=role, id_refugio=1 if role == 2 else None,
                                      nombre_completo=f"Persona {i}", correo=f"persona{i}@example.com",
                                      telefono="1234567890", password_hash=HASH)
                        for i, role in [(1, 1), (2, 2), (3, 3), (4, 3), (5, 3)]])
            db.add_all([models.Animal(id_animal=i, id_refugio=i, nombre=f"Mascota {i}", especie="Perro",
                                      raza="Mestizo", sexo="Macho", edad_estimada="2 años", tamano="Mediano",
                                      estado_adopcion="disponible" if i == 1 else "adoptado") for i in (1, 2)])
            db.flush()
            db.add_all([models.SolicitudAdopcion(id_solicitud=i, id_usuario=3, id_animal=i,
                                                 mensaje="Hola", estado_solicitud="pendiente") for i in (1, 2)])
            db.add(models.Favorito(id_usuario=3, id_animal=1))
            db.commit()

        def override_db():
            with self.sessions() as db:
                yield db
        app.dependency_overrides[get_db] = override_db
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.engine.dispose()
        if self.previous_upload_dir is None:
            os.environ.pop("UPLOAD_DIR", None)
        else:
            os.environ["UPLOAD_DIR"] = self.previous_upload_dir
        self.images.cleanup()

    def headers(self, user_id):
        return {"Authorization": f"Bearer {create_access_token({'sub': str(user_id)})}"}

    def registration(self, **kwargs):
        return {"nombre_completo": "Ana Muñoz", "correo": "ana@example.com", "password": PASSWORD,
                "telefono": "1234567890", "ciudad": "Peñamiller, Querétaro", **kwargs}

    def adoption_data(self, **kwargs):
        return {"id_animal": 1, "tipo_vivienda": "casa-patio", "experiencia": "si",
                "telefono_contacto": "1234567890",
                "mensaje": "Tengo tiempo para los paseos y una vivienda segura para su adaptación.", **kwargs}

    def test_register_user_and_city_survive_login(self):
        data = self.registration()
        response = self.client.post("/api/auth/register", json=data)
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()["id_rol"], 3)
        login = self.client.post("/api/auth/login", json={"correo": data["correo"], "password": PASSWORD})
        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.json()["rol_nombre"], "Usuario")
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        me = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(me.json()["ciudad"], "Peñamiller, Querétaro")
        self.assertEqual(me.json()["id_rol"], 3)
        application = self.client.post("/api/voluntariado", headers=headers, json={
            "id_refugio": 1, "modalidad": "paseos", "disponibilidad": "Sábados por la mañana",
        })
        self.assertEqual(application.status_code, 201, application.text)

    def test_public_registration_cannot_elevate_permissions(self):
        for extra in [{"tipo_cuenta": "administrador"}, {"tipo_cuenta": "voluntario"},
                      {"tipo_cuenta": "adoptante"}, {"id_rol": 1}, {"id_rol": 4}, {"id_refugio": 1}]:
            response = self.client.post("/api/auth/register", json=self.registration(**extra))
            self.assertEqual(response.status_code, 422, response.text)

    def test_validation_is_sanitized_and_minimum_is_eight(self):
        for extra in [{"password": "1234567"}, {"correo": "invalido"}, {"password": "ñ" * 37},
                      {"nombre_completo": "  "}, {"ciudad": " "}]:
            response = self.client.post("/api/auth/register", json=self.registration(**extra))
            self.assertEqual(response.status_code, 422, response.text)
            for issue in response.json()["detail"]:
                self.assertNotIn("input", issue)
                self.assertNotIn("ctx", issue)
        response = self.client.post("/api/auth/register", json=self.registration(password="12345678"))
        self.assertEqual(response.status_code, 201, response.text)

    def test_duplicate_and_invalid_login(self):
        self.client.post("/api/auth/register", json=self.registration())
        self.assertEqual(self.client.post("/api/auth/register", json=self.registration()).status_code, 400)
        self.assertEqual(self.client.post("/api/auth/login", json={"correo": "ana@example.com", "password": "mal"}).status_code, 401)
        self.assertEqual(self.client.get("/api/auth/me", headers={"Authorization": "Bearer invalido"}).status_code, 401)

    def test_legacy_password_can_still_log_in(self):
        with self.sessions() as db:
            db.get(models.Usuario, 3).password_hash = hashlib.sha256(b"corta").hexdigest()
            db.commit()
        response = self.client.post("/api/auth/login", json={"correo": "persona3@example.com", "password": "corta"})
        self.assertEqual(response.status_code, 200)
        response = self.client.put("/api/usuarios/3", headers=self.headers(3), json={"password": "corta"})
        self.assertEqual(response.status_code, 422)

    def test_administrative_and_private_endpoints(self):
        for path in ["/api/consultas-juntas/dashboard", "/api/consultas-juntas/adopciones-exitosas",
                     "/api/voluntariado", "/api/usuarios"]:
            self.assertEqual(self.client.get(path).status_code, 401, path)
            for user_id in (2, 3, 4):
                self.assertEqual(self.client.get(path, headers=self.headers(user_id)).status_code, 403, path)
            self.assertEqual(self.client.get(path, headers=self.headers(1)).status_code, 200, path)
        self.assertEqual(self.client.get("/api/refugios/1/completo").status_code, 401)
        self.assertEqual(self.client.get("/api/refugios/2/completo", headers=self.headers(2)).status_code, 403)

    def test_ownership_for_regular_users(self):
        self.assertEqual(self.client.get("/api/solicitudes/1", headers=self.headers(4)).status_code, 403)
        self.assertEqual(self.client.get("/api/favoritos", headers=self.headers(4)).json(), [])
        self.assertEqual(self.client.get("/api/usuarios/3", headers=self.headers(4)).status_code, 403)
        self.assertEqual(self.client.get("/api/solicitudes/2", headers=self.headers(2)).status_code, 403)
        items = self.client.get("/api/solicitudes/relacion/detalladas", headers=self.headers(2)).json()
        self.assertEqual([item["id_animal"] for item in items], [1])

    def test_detailed_solicitudes_include_ids(self):
        items = self.client.get("/api/solicitudes/relacion/mis-solicitudes", headers=self.headers(3)).json()
        self.assertEqual(len(items), 2)
        self.assertEqual({item["id_animal"] for item in items}, {1, 2})
        self.assertTrue(all(item["id_usuario"] == 3 for item in items))

    def test_volunteer_flow_and_isolation(self):
        data = {"id_refugio": 1, "modalidad": "hogar_temporal", "disponibilidad": "Fines de semana",
                "comentarios": "Tengo espacio seguro."}
        for user_id in (1, 2):
            self.assertEqual(self.client.post("/api/voluntariado", headers=self.headers(user_id), json=data).status_code, 403)
        self.assertEqual(self.client.post("/api/voluntariado", headers=self.headers(3), json=data).status_code, 201)
        response = self.client.post("/api/voluntariado", headers=self.headers(4), json=data)
        self.assertEqual(response.status_code, 201, response.text)
        item_id = response.json()["id_solicitud"]
        self.assertEqual(self.client.post("/api/voluntariado", headers=self.headers(4), json=data).status_code, 409)
        mine = self.client.get("/api/voluntariado/mis-solicitudes", headers=self.headers(4)).json()
        self.assertEqual(len(mine), 1)
        self.assertNotIn("usuario", mine[0])
        self.assertEqual(self.client.get("/api/voluntariado/mis-solicitudes", headers=self.headers(5)).json(), [])
        path = f"/api/voluntariado/{item_id}/estado"
        self.assertEqual(self.client.patch(path, headers=self.headers(4), json={"estado": "aprobada"}).status_code, 403)
        response = self.client.patch(path, headers=self.headers(1), json={"estado": "aprobada"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["estado"], "aprobada")
        self.assertEqual(self.client.patch(path, headers=self.headers(1), json={"estado": "rechazada"}).status_code, 409)
        self.assertEqual(self.client.get("/api/voluntariado/mis-solicitudes", headers=self.headers(4)).json()[0]["estado"], "aprobada")

    def test_volunteer_reject_invalid_shelter_and_mode(self):
        data = {"id_refugio": 999, "modalidad": "paseos", "disponibilidad": "Sábados"}
        self.assertEqual(self.client.post("/api/voluntariado", headers=self.headers(4), json=data).status_code, 404)
        self.assertEqual(self.client.post("/api/voluntariado", headers=self.headers(4),
                                          json={**data, "id_refugio": 1, "modalidad": "admin"}).status_code, 422)

    def test_volunteer_rejection_and_shelter_cleanup(self):
        data = {"id_refugio": 1, "modalidad": "paseos", "disponibilidad": "Sábados"}
        response = self.client.post("/api/voluntariado", headers=self.headers(4), json=data)
        self.assertEqual(response.status_code, 201, response.text)
        path = f"/api/voluntariado/{response.json()['id_solicitud']}/estado"
        self.assertEqual(self.client.patch(path, headers=self.headers(1), json={"estado": "pendiente"}).status_code, 422)
        self.assertEqual(self.client.patch(path, headers=self.headers(1), json={"estado": "rechazada"}).json()["estado"], "rechazada")
        self.assertEqual(self.client.delete("/api/refugios/1", headers=self.headers(1)).status_code, 200)
        self.assertEqual(self.client.get("/api/voluntariado/mis-solicitudes", headers=self.headers(4)).json(), [])

    def test_catalog_favorites_and_inventory(self):
        self.assertEqual(len(self.client.get("/api/consultas-juntas/catalogo").json()), 1)
        self.assertEqual(len(self.client.get("/api/animales/relacion/con-refugio?estado_adopcion=todos").json()), 2)
        self.assertEqual(self.client.get("/api/animales/999/detalle-completo").status_code, 404)
        data = {"id_animal": 1}
        self.assertEqual(self.client.post("/api/favoritos", headers=self.headers(4), json=data).status_code, 201)
        self.assertTrue(self.client.get("/api/favoritos/verificar/1", headers=self.headers(4)).json()["es_favorito"])
        self.assertEqual(self.client.delete("/api/favoritos/animal/1", headers=self.headers(4)).status_code, 200)
        self.assertFalse(self.client.get("/api/favoritos/verificar/1", headers=self.headers(4)).json()["es_favorito"])

    def test_migration_unifies_roles_and_is_idempotent(self):
        engine = create_engine("sqlite://")
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE usuarios (id_usuario INTEGER PRIMARY KEY, nombre_completo VARCHAR(150), id_rol INTEGER, password_hash VARCHAR(255))"))
            connection.execute(text("INSERT INTO usuarios VALUES (1, 'Ana Muñoz', 3, 'hash-original'), (2, 'Rosa Peña', 4, 'otro-hash')"))
            connection.execute(text("CREATE TABLE roles (id_rol INTEGER PRIMARY KEY, nombre_rol VARCHAR(50))"))
            connection.execute(text("INSERT INTO roles VALUES (3, 'Adoptante'), (4, 'Voluntario / Hogar temporal')"))
        migrate(engine)
        migrate(engine)
        with engine.connect() as connection:
            self.assertEqual(connection.execute(text("SELECT nombre_completo FROM usuarios WHERE id_usuario=1")).scalar(), "Ana Muñoz")
            self.assertEqual(connection.execute(text("SELECT COUNT(*) FROM roles WHERE id_rol=4")).scalar(), 0)
            self.assertEqual(connection.execute(text("SELECT nombre_rol FROM roles WHERE id_rol=3")).scalar(), "Usuario")
            self.assertEqual(connection.execute(text("SELECT COUNT(*) FROM usuarios WHERE id_rol=3")).scalar(), 2)
            self.assertEqual(connection.execute(text("SELECT password_hash FROM usuarios WHERE id_usuario=2")).scalar(), "otro-hash")
            self.assertIn("ciudad", {column["name"] for column in inspect(connection).get_columns("usuarios")})
        engine.dispose()

    def test_migration_preserves_volunteer_history(self):
        with self.sessions() as db:
            db.add(models.Rol(id_rol=4, nombre_rol="Voluntario / Hogar temporal"))
            db.flush()
            db.get(models.Usuario, 4).id_rol = 4
            db.add(models.SolicitudVoluntariado(id_usuario=4, id_refugio=1, modalidad="paseos",
                                                disponibilidad="Sábados", estado="aprobada"))
            db.commit()
        migrate(self.engine)
        migrate(self.engine)
        with self.sessions() as db:
            self.assertEqual(db.get(models.Usuario, 4).id_rol, 3)
            self.assertEqual(db.query(models.SolicitudVoluntariado).one().estado, "aprobada")
        response = self.client.get("/api/voluntariado/mis-solicitudes", headers=self.headers(4))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_provision_admin_hashes_password_and_can_log_in(self):
        with self.sessions() as db:
            user = create_administrator(db, schemas.UsuarioRegisterPublic(**self.registration()))
            self.assertEqual(user.id_rol, 1)
            self.assertTrue(user.password_hash.startswith("$2"))
            self.assertTrue(verify_password(PASSWORD, user.password_hash))
        response = self.client.post("/api/auth/login", json={"correo": "ana@example.com", "password": PASSWORD})
        self.assertEqual(response.status_code, 200, response.text)
        headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
        self.assertEqual(self.client.get("/api/consultas-juntas/dashboard", headers=headers).status_code, 200)

    def test_provision_admin_does_not_promote_or_overwrite_existing_users(self):
        for user_id in (1, 3):
            with self.sessions() as db:
                user = db.get(models.Usuario, user_id)
                before = (user.id_rol, user.password_hash, user.nombre_completo)
                with self.assertRaises(ValueError):
                    create_administrator(db, schemas.UsuarioRegisterPublic(**self.registration(correo=user.correo)))
                db.expire_all()
                user = db.get(models.Usuario, user_id)
                self.assertEqual((user.id_rol, user.password_hash, user.nombre_completo), before)

    def test_provision_admin_can_restore_missing_admin_role(self):
        with self.sessions() as db:
            db.delete(db.get(models.Usuario, 1))
            db.flush()
            db.delete(db.get(models.Rol, 1))
            db.commit()
            user = create_administrator(db, schemas.UsuarioRegisterPublic(**self.registration()))
            self.assertEqual(user.id_rol, 1)
            self.assertEqual(db.get(models.Rol, 1).nombre_rol, "Administrador")

    def animal_data(self, **kwargs):
        return {"id_refugio": 1, "nombre": "Nueva mascota", "especie": "Perro", "raza": "Mestizo",
                "sexo": "Hembra", "edad_estimada": "2 años", "tamano": "Mediano", **kwargs}

    def image_bytes(self, image_format="PNG", size=(64, 64)):
        output = BytesIO()
        Image.new("RGB", size, "#e07a5f").save(output, image_format)
        return output.getvalue()

    def test_staff_cannot_use_adoption_or_favorite_actions(self):
        for user_id in (1, 2):
            headers = self.headers(user_id)
            self.assertEqual(self.client.post("/api/solicitudes", headers=headers, json=self.adoption_data()).status_code, 403)
            self.assertEqual(self.client.post("/api/favoritos", headers=headers, json={"id_animal": 1}).status_code, 403)
            for path in ("/api/solicitudes/relacion/mis-solicitudes", "/api/favoritos/relacion/mis-favoritos",
                         "/api/favoritos/verificar/1"):
                self.assertEqual(self.client.get(path, headers=headers).status_code, 403, path)
        self.assertEqual(self.client.post("/api/solicitudes", headers=self.headers(4), json=self.adoption_data()).status_code, 201)
        self.assertEqual(self.client.post("/api/favoritos", headers=self.headers(4), json={"id_animal": 1}).status_code, 201)

    def test_urgency_is_explicit_and_filters_catalog_and_inventory(self):
        response = self.client.get("/api/consultas-juntas/catalogo?es_urgente=true")
        self.assertEqual(response.json(), [])
        response = self.client.put("/api/animales/1", headers=self.headers(1), json={"es_urgente": True})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json()["es_urgente"])
        self.assertEqual(len(self.client.get("/api/consultas-juntas/catalogo?es_urgente=true").json()), 1)
        self.assertTrue(self.client.get("/api/animales/1/detalle-completo").json()["es_urgente"])
        self.assertEqual(self.client.get("/api/consultas-juntas/catalogo?es_urgente=false").json(), [])
        self.client.put("/api/animales/1", headers=self.headers(1), json={
            "es_urgente": False, "descripcion": "No es urgente", "estado_adopcion": "en_proceso",
        })
        self.assertEqual(self.client.get("/api/animales/relacion/con-refugio?estado_adopcion=todos&es_urgente=true").json(), [])
        self.assertEqual(self.client.put("/api/animales/1", headers=self.headers(3), json={"es_urgente": True}).status_code, 403)
        self.assertEqual(self.client.put("/api/animales/2", headers=self.headers(2), json={"es_urgente": True}).status_code, 403)

    def test_image_upload_is_persisted_reencoded_and_removed_with_animal(self):
        response = self.client.post("/api/animales/ingreso", headers=self.headers(1),
                                    data={"datos": json.dumps(self.animal_data(es_urgente=True))},
                                    files={"foto": ("../../intento.png", self.image_bytes(size=(1800, 900)), "image/png")})
        self.assertEqual(response.status_code, 201, response.text)
        animal = response.json()
        self.assertTrue(animal["es_urgente"])
        self.assertRegex(animal["foto_url"], r"^/api/imagenes/[0-9a-f]{32}\.jpg$")
        response = self.client.get(animal["foto_url"])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["content-type"], "image/jpeg")
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        with Image.open(BytesIO(response.content)) as image:
            self.assertLessEqual(max(image.size), 1600)
            self.assertFalse(image.getexif())
        with TestClient(app) as other_client:
            self.assertEqual(other_client.get(animal["foto_url"]).status_code, 200)
        self.assertEqual(self.client.delete(f"/api/animales/{animal['id_animal']}", headers=self.headers(1)).status_code, 200)
        self.assertEqual(self.client.get(animal["foto_url"]).status_code, 404)
        self.assertEqual(list(Path(self.images.name).iterdir()), [])

    def test_optional_image_gets_stable_fallback(self):
        response = self.client.post("/api/animales/ingreso", headers=self.headers(1),
                                    data={"datos": json.dumps(self.animal_data(especie="Gato"))})
        self.assertEqual(response.status_code, 201, response.text)
        animal = response.json()
        self.assertTrue(animal["foto_url"].startswith("https://images.unsplash.com/"))
        self.assertEqual(self.client.get(f"/api/animales/{animal['id_animal']}").json()["foto_url"], animal["foto_url"])
        self.assertEqual(list(Path(self.images.name).iterdir()), [])

    def test_invalid_image_inputs_do_not_create_records_or_files(self):
        for file, content_type in [(b"no es una imagen", "image/jpeg"), (b"", "image/png"),
                                   (b'<svg xmlns="http://www.w3.org/2000/svg"/>', "image/svg+xml")]:
            response = self.client.post("/api/animales/ingreso", headers=self.headers(1),
                                        data={"datos": json.dumps(self.animal_data())},
                                        files={"foto": ("archivo.jpg", file, content_type)})
            self.assertEqual(response.status_code, 422, response.text)
        with patch("image_storage.MAX_IMAGE_BYTES", 64):
            response = self.client.post("/api/animales/ingreso", headers=self.headers(1),
                                        data={"datos": json.dumps(self.animal_data())},
                                        files={"foto": ("foto.png", self.image_bytes(), "image/png")})
            self.assertEqual(response.status_code, 413)
        with patch("image_storage.MAX_IMAGE_PIXELS", 100):
            response = self.client.post("/api/animales/ingreso", headers=self.headers(1),
                                        data={"datos": json.dumps(self.animal_data())},
                                        files={"foto": ("foto.png", self.image_bytes(), "image/png")})
            self.assertEqual(response.status_code, 422)
        with self.sessions() as db:
            self.assertEqual(db.query(models.Animal).count(), 2)
        self.assertEqual(list(Path(self.images.name).iterdir()), [])

    def test_multipart_request_size_is_bounded_before_parsing(self):
        with patch("image_storage.MAX_UPLOAD_BODY_BYTES", 200):
            response = self.client.post("/api/animales/ingreso", headers=self.headers(1),
                                        data={"datos": json.dumps(self.animal_data())},
                                        files={"foto": ("foto.png", self.image_bytes(), "image/png")})
            self.assertEqual(response.status_code, 413, response.text)
        self.assertEqual(list(Path(self.images.name).iterdir()), [])

    def test_ingreso_is_admin_only_and_rejects_invalid_metadata(self):
        for user_id in (None, 2, 3):
            response = self.client.post("/api/animales/ingreso", headers=self.headers(user_id) if user_id else {},
                                        data={"datos": json.dumps(self.animal_data())},
                                        files={"foto": ("foto.png", self.image_bytes(), "image/png")})
            self.assertEqual(response.status_code, 401 if user_id is None else 403)
        for data in ("no es JSON", json.dumps({"nombre": "Sin datos"}), json.dumps(self.animal_data(id_refugio=999))):
            response = self.client.post("/api/animales/ingreso", headers=self.headers(1), data={"datos": data},
                                        files={"foto": ("foto.png", self.image_bytes(), "image/png")})
            self.assertIn(response.status_code, (422, 404), response.text)
        self.assertEqual(list(Path(self.images.name).iterdir()), [])

    def test_uploaded_image_is_cleaned_up_if_database_commit_fails(self):
        with patch("sqlalchemy.orm.Session.commit", side_effect=SQLAlchemyError("Simulación de fallo")):
            with self.assertRaises(SQLAlchemyError):
                self.client.post("/api/animales/ingreso", headers=self.headers(1),
                                 data={"datos": json.dumps(self.animal_data())},
                                 files={"foto": ("foto.png", self.image_bytes(), "image/png")})
        self.assertEqual(list(Path(self.images.name).iterdir()), [])
        with self.sessions() as db:
            self.assertEqual(db.query(models.Animal).count(), 2)

    def test_shared_photo_is_not_removed_while_referenced(self):
        first = self.client.post("/api/animales/ingreso", headers=self.headers(1),
                                 data={"datos": json.dumps(self.animal_data())},
                                 files={"foto": ("foto.png", self.image_bytes(), "image/png")}).json()
        second = self.client.post("/api/animales", headers=self.headers(1),
                                  json=self.animal_data(foto_url=first["foto_url"])).json()
        self.client.delete(f"/api/animales/{first['id_animal']}", headers=self.headers(1))
        self.assertEqual(self.client.get(first["foto_url"]).status_code, 200)
        self.client.delete(f"/api/animales/{second['id_animal']}", headers=self.headers(1))
        self.assertEqual(self.client.get(first["foto_url"]).status_code, 404)

    def test_image_routes_do_not_expose_other_files(self):
        for path in ("/api/imagenes/main.py", "/api/imagenes/not-a-uuid.jpg",
                     "/api/imagenes/" + "a" * 32 + ".jpg", "/api/imagenes/%2E%2E%2Fmain.py"):
            self.assertEqual(self.client.get(path).status_code, 404, path)

    def test_urgency_migration_preserves_old_animals(self):
        engine = create_engine("sqlite://")
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE usuarios (id_usuario INTEGER PRIMARY KEY, id_rol INTEGER, ciudad VARCHAR(150))"))
            connection.execute(text("CREATE TABLE roles (id_rol INTEGER PRIMARY KEY, nombre_rol VARCHAR(50))"))
            connection.execute(text("CREATE TABLE animales (id_animal INTEGER PRIMARY KEY, nombre VARCHAR(100))"))
            connection.execute(text("INSERT INTO animales VALUES (1, 'Pequeña Ñaña')"))
        migrate(engine)
        migrate(engine)
        with engine.connect() as connection:
            self.assertEqual(connection.execute(text("SELECT nombre, es_urgente FROM animales")).one(), ("Pequeña Ñaña", 0))
        engine.dispose()

    def test_adoption_approval_closes_competitors_and_preserves_history(self):
        second = self.client.post("/api/solicitudes", headers=self.headers(4), json=self.adoption_data())
        self.assertEqual(second.status_code, 201, second.text)
        second_id = second.json()["id_solicitud"]
        response = self.client.put("/api/solicitudes/1/estado", headers=self.headers(1), json={
            "estado_solicitud": "aprobada", "notas_internas": "Información privada",
            "respuesta_publica": "Coordina la visita con el refugio.",
        })
        self.assertEqual(response.status_code, 200, response.text)
        mine = self.client.get("/api/solicitudes/relacion/mis-solicitudes", headers=self.headers(4)).json()
        self.assertEqual(mine[0]["estado_solicitud"], "rechazada")
        self.assertIn("encontró un hogar", mine[0]["respuesta_publica"])
        self.assertIsNone(mine[0]["notas_internas"])
        self.assertEqual(self.client.get("/api/animales/1").json()["estado_adopcion"], "adoptado")
        for request_id in (1, second_id):
            self.assertEqual(self.client.put(f"/api/solicitudes/{request_id}/estado", headers=self.headers(1),
                                            json={"estado_solicitud": "aprobada"}).status_code, 409)
            self.assertEqual(self.client.delete(f"/api/solicitudes/{request_id}", headers=self.headers(1)).status_code, 409)
        self.assertEqual(self.client.put("/api/animales/1", headers=self.headers(1),
                                        json={"estado_adopcion": "disponible"}).status_code, 409)
        self.assertEqual(self.client.post("/api/solicitudes", headers=self.headers(5), json=self.adoption_data()).status_code, 409)

    def test_internal_notes_are_private_on_every_personal_response(self):
        with self.sessions() as db:
            request = db.get(models.SolicitudAdopcion, 1)
            request.notas_internas = "Secreto del equipo"
            request.respuesta_publica = "Mensaje para la familia"
            db.commit()
        for path in ("/api/solicitudes/1", "/api/solicitudes/relacion/mis-solicitudes", "/api/usuarios/3/perfil-completo"):
            response = self.client.get(path, headers=self.headers(3))
            self.assertEqual(response.status_code, 200, response.text)
            self.assertNotIn("Secreto del equipo", response.text)
            self.assertIn("Mensaje para la familia", response.text)
        self.assertIn("Secreto del equipo", self.client.get("/api/solicitudes/1", headers=self.headers(1)).text)

    def test_adoption_reject_cancel_duplicates_and_availability(self):
        self.assertEqual(self.client.post("/api/solicitudes", headers=self.headers(3), json=self.adoption_data()).status_code, 400)
        self.assertEqual(self.client.delete("/api/solicitudes/1", headers=self.headers(4)).status_code, 403)
        self.assertEqual(self.client.delete("/api/solicitudes/1", headers=self.headers(3)).status_code, 200)
        new = self.client.post("/api/solicitudes", headers=self.headers(3), json=self.adoption_data())
        self.assertEqual(new.status_code, 201, new.text)
        path = f"/api/solicitudes/{new.json()['id_solicitud']}/estado"
        self.assertEqual(self.client.put(path, headers=self.headers(3), json={"estado_solicitud": "aprobada"}).status_code, 403)
        self.assertEqual(self.client.put(path, headers=self.headers(1), json={"estado_solicitud": "pendiente"}).status_code, 422)
        self.assertEqual(self.client.put(path, headers=self.headers(1), json={"estado_solicitud": "rechazada"}).status_code, 200)
        self.assertEqual(self.client.get("/api/animales/1").json()["estado_adopcion"], "disponible")
        self.client.put("/api/animales/1", headers=self.headers(1), json={"estado_adopcion": "en_proceso"})
        self.assertEqual(self.client.post("/api/solicitudes", headers=self.headers(4), json=self.adoption_data()).status_code, 409)

    def test_health_fields_roundtrip_unknown_and_validation(self):
        detail = "/api/animales/1/detalle-completo"
        self.assertIsNone(self.client.get(detail).json()["vacunado"])
        result = self.client.put("/api/animales/1", headers=self.headers(1),
                                 json={"vacunado": True, "esterilizado": False, "desparasitado": True})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertFalse(self.client.get(detail).json()["esterilizado"])
        self.assertTrue(self.client.get(detail).json()["vacunado"])
        self.client.put("/api/animales/1", headers=self.headers(1), json={"vacunado": None})
        self.assertIsNone(self.client.get(detail).json()["vacunado"])
        self.assertEqual(self.client.put("/api/animales/1", headers=self.headers(1),
                                        json={"estado_adopcion": "inventado"}).status_code, 422)

    def test_demo_seed_is_idempotent_and_does_not_overwrite_edits_or_accounts(self):
        with self.sessions() as db:
            original = db.get(models.Usuario, 3).password_hash
            result = seed_demo(db, PASSWORD)
            db.commit()
            self.assertEqual(result["animales"], 25)
            self.assertEqual(result["refugios"], 5)
            marker = db.get(models.DemoRegistro, "review-v1/animal/0")
            db.get(models.Animal, marker.registro_id).descripcion = "Edición humana"
            db.commit()
            self.assertEqual(seed_demo(db, "OtraClave123!"), {})
            db.commit()
            self.assertEqual(db.query(models.Animal).count(), 27)
            self.assertEqual(db.get(models.Animal, marker.registro_id).descripcion, "Edición humana")
            self.assertEqual(db.get(models.Usuario, 3).password_hash, original)
            demo_user = db.query(models.Usuario).filter_by(correo="demo1@example.com").one()
            self.assertTrue(verify_password(PASSWORD, demo_user.password_hash))
            self.assertFalse(verify_password("OtraClave123!", demo_user.password_hash))
            self.assertEqual(db.query(models.Usuario).filter_by(id_rol=1).count(), 1)

    def test_demo_seed_collision_rolls_back_without_promoting_user(self):
        with self.sessions() as db:
            db.get(models.Usuario, 3).correo = "demo1@example.com"
            db.commit()
            with self.assertRaises(ValueError):
                seed_demo(db, PASSWORD)
            db.rollback()
            self.assertEqual(db.query(models.Refugio).count(), 2)
            self.assertEqual(db.query(models.DemoRegistro).count(), 0)
            self.assertEqual(db.get(models.Usuario, 3).id_rol, 3)

    def test_health_endpoint_reports_database_failure(self):
        self.assertEqual(self.client.get("/api/health").status_code, 200)
        with patch("sqlalchemy.orm.Session.execute", side_effect=SQLAlchemyError("private connection string")):
            result = self.client.get("/api/health")
            self.assertEqual(result.status_code, 503)
            self.assertNotIn("private", result.text)

    def test_adoption_fields_required_and_whitespace_rejected(self):
        for field in ("tipo_vivienda", "experiencia", "telefono_contacto", "mensaje"):
            missing = self.adoption_data()
            missing.pop(field)
            self.assertEqual(self.client.post("/api/solicitudes", headers=self.headers(4), json=missing).status_code, 422, field)
        for extra in ({"mensaje": " " * 50}, {"mensaje": "Muy corto"},
                      {"tipo_vivienda": ""}, {"tipo_vivienda": "otro"}, {"experiencia": ""},
                      {"telefono_contacto": "abcdefghi"}, {"telefono_contacto": "12"},
                      {"telefono_contacto": "1" * 16}):
            response = self.client.post("/api/solicitudes", headers=self.headers(4), json=self.adoption_data(**extra))
            self.assertEqual(response.status_code, 422, response.text)
            self.assertTrue(all("input" not in item for item in response.json()["detail"]))
        with self.sessions() as db:
            self.assertEqual(db.query(models.SolicitudAdopcion).count(), 2)

    def test_structured_adoption_persists_and_legacy_history_still_reads(self):
        data = self.adoption_data(experiencia="no", telefono_contacto="+52 (442) 123-4567",
                                  mensaje="  Quiero aprender a cuidar de mi primera mascota y dedicarle tiempo cada día.  ")
        response = self.client.post("/api/solicitudes", headers=self.headers(4), json=data)
        self.assertEqual(response.status_code, 201, response.text)
        saved = response.json()
        self.assertEqual(saved["mensaje"], data["mensaje"].strip())
        self.assertEqual(saved["experiencia"], "no")
        mine = self.client.get("/api/solicitudes/relacion/mis-solicitudes", headers=self.headers(4)).json()[0]
        self.assertEqual(mine["telefono_contacto"], data["telefono_contacto"])
        staff = self.client.get("/api/solicitudes/relacion/detalladas", headers=self.headers(1)).json()[0]
        self.assertEqual(staff["tipo_vivienda"], data["tipo_vivienda"])
        old = self.client.get("/api/solicitudes/1", headers=self.headers(3)).json()
        self.assertIsNone(old["tipo_vivienda"])
        self.assertEqual(old["mensaje"], "Hola")

    def test_presentation_refresh_preserves_human_edits_and_is_repeatable(self):
        with self.sessions() as db:
            seed_demo(db, PASSWORD)
            db.commit()
            def record(key, model):
                return db.get(model, db.get(models.DemoRegistro, key).registro_id)
            shelter = record("review-v1/refugio/0", models.Refugio)
            shelter.nombre_organizacion = "[Demo] Patitas del Sol"
            shelter.direccion = "Calle de demostración 10, sin atención presencial"
            manual = record("review-v1/refugio/1", models.Refugio)
            manual.direccion = "Dirección editada por una persona"
            request = record("review-v1/adopcion/0", models.SolicitudAdopcion)
            request.mensaje = "[Demo] Tengo un hogar seguro y tiempo para adaptación. Me gustaría conocer los cuidados y coordinar una entrevista."
            edited = record("review-v1/adopcion/1", models.SolicitudAdopcion)
            edited.mensaje = "Mensaje personal que no debe modificarse."
            before_hash = db.get(models.Usuario, 3).password_hash
            db.commit()
            self.assertGreater(refresh_presentation(db), 0)
            db.commit()
            self.assertEqual(refresh_presentation(db), 0)
            self.assertEqual(shelter.nombre_organizacion, "Patitas del Sol")
            self.assertEqual(shelter.direccion, SHELTER_ADDRESSES[0])
            self.assertEqual(manual.direccion, "Dirección editada por una persona")
            self.assertNotIn("[Demo]", request.mensaje)
            self.assertEqual(edited.mensaje, "Mensaje personal que no debe modificarse.")
            self.assertEqual(db.get(models.Usuario, 3).password_hash, before_hash)
            self.assertEqual(db.query(models.SolicitudAdopcion).count(), 12)

    def test_adoption_migration_preserves_legacy_texts(self):
        engine = create_engine("sqlite://")
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE usuarios (id_usuario INTEGER PRIMARY KEY, id_rol INTEGER, ciudad VARCHAR(150))"))
            connection.execute(text("CREATE TABLE roles (id_rol INTEGER PRIMARY KEY, nombre_rol VARCHAR(50))"))
            connection.execute(text("CREATE TABLE solicitudes_adopcion (id_solicitud INTEGER PRIMARY KEY, mensaje TEXT)"))
            connection.execute(text("INSERT INTO solicitudes_adopcion VALUES (1, 'Mensaje original con ñ y tildes')"))
        migrate(engine)
        migrate(engine)
        with engine.connect() as connection:
            row = connection.execute(text("SELECT mensaje, tipo_vivienda, experiencia, telefono_contacto FROM solicitudes_adopcion")).one()
            self.assertEqual(tuple(row), ("Mensaje original con ñ y tildes", None, None, None))
        engine.dispose()


if __name__ == "__main__":
    unittest.main()
