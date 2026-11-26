"""Carga opcional, transaccional e idempotente. Nunca se ejecuta al arrancar."""
import argparse
from collections import Counter
from datetime import datetime, timedelta
from getpass import getpass
import json
import os

from sqlalchemy import text
from database import Base, engine, SessionLocal
from auth import hash_password
from migrations import migrate
import models
import schemas
from demo_presentation import APPLICATION_MESSAGES, SHELTER_ADDRESSES, refresh_presentation


def seed_demo(db, password):
    # Misma validación que el registro público (incluye límite UTF-8 de bcrypt).
    schemas.UsuarioRegisterPublic(nombre_completo="Persona Demo", correo="demo@example.com",
                                  password=password, telefono="0000000000")
    created = Counter()
    password_hash = None

    def ensure(key, model, values):
        marker = db.get(models.DemoRegistro, key)
        if marker:
            record = db.get(model, marker.registro_id)
            if marker.tabla != model.__tablename__ or record is None:
                raise ValueError(f"La semilla {key} fue eliminada o alterada. No se recreará automáticamente.")
            return record
        record = model(**values)
        db.add(record)
        db.flush()
        primary_key = model.__mapper__.primary_key[0].name
        db.add(models.DemoRegistro(clave=key, tabla=model.__tablename__, registro_id=getattr(record, primary_key)))
        db.flush()
        created[model.__tablename__] += 1
        return record

    role = db.get(models.Rol, 3)
    if role is None or role.nombre_rol != "Usuario":
        raise ValueError("Primero aplica las migraciones de roles.")

    cities = [("Ciudad de México", "Ciudad de México"), ("Puebla", "Puebla"),
              ("Querétaro", "Querétaro"), ("Mérida", "Yucatán"), ("Toluca", "Estado de México")]
    shelters = [ensure(f"review-v1/refugio/{i}", models.Refugio, {
        "nombre_organizacion": name, "direccion": SHELTER_ADDRESSES[i],
        "ciudad": city, "estado": state, "telefono": "0000000000", "estado_cuenta": "activo",
    }) for i, ((city, state), name) in enumerate(zip(cities, [
        "Patitas del Sol", "Segunda Oportunidad", "Hogar Ñandú", "Amigos del Mayab", "Bosque de Huellas"]))]

    users = []
    for i, name in enumerate(["Ana Muñoz", "Diego Peña", "Sofía León", "Mateo Ríos", "Valeria Díaz", "Emilio Gómez"]):
        key = f"review-v1/usuario/{i}"
        email = f"demo{i + 1}@example.com"
        if not db.get(models.DemoRegistro, key) and db.query(models.Usuario).filter_by(correo=email).first():
            raise ValueError(f"El correo {email} ya existe y no pertenece a esta carga. No se modificó.")
        if password_hash is None and not db.get(models.DemoRegistro, key):
            password_hash = hash_password(password)
        users.append(ensure(key, models.Usuario, {
            "id_rol": 3, "nombre_completo": name, "correo": email,
            "telefono": "0000000000", "ciudad": cities[i % 5][0], "password_hash": password_hash,
        }))

    names = ["Nala", "Bruno", "Mía", "Toby", "Kiara", "Simón", "Coco", "Olivia", "Bimba", "Max",
             "Ñoño", "Frida", "Leo", "Kira", "Rocky", "Duna", "Nube", "Chispa", "Benito", "Ámbar",
             "Mora", "Pancho", "Lía", "Gala", "Trufa"]
    dog_photos = ["1543466835-00a7907e9de1", "1552053831-71594a27632d", "1583511655857-d19b40a7a54e"]
    cat_photos = ["1514888286974-6c03e2ca1dba", "1573865526739-10659fec78a5", "1518791841217-8f162f1e1131"]
    animals = []
    for i, name in enumerate(names):
        species = "Perro" if i % 2 == 0 else "Gato"
        photos = dog_photos if species == "Perro" else cat_photos
        animals.append(ensure(f"review-v1/animal/{i}", models.Animal, {
            "id_refugio": shelters[i % 5].id_refugio, "nombre": name, "especie": species,
            "raza": "Mestizo" if species == "Perro" else "Doméstico", "sexo": "Hembra" if i % 3 else "Macho",
            "edad_estimada": ["4 meses", "1 año", "3 años", "6 años", "9 años"][i % 5],
            "tamano": ["Pequeño", "Mediano", "Grande"][i % 3] if species == "Perro" else "Pequeño",
            "descripcion": f"{name} "
                           + ["disfruta los paseos tranquilos y necesita adaptación gradual.",
                              "busca compañía paciente y un hogar seguro con protecciones.",
                              "es curioso y disfruta el juego; requiere acompañamiento diario.",
                              "prefiere un ambiente sereno y cuidados acordes con su edad.",
                              "necesita una familia comprometida con sus revisiones veterinarias."][i % 5],
            "foto_url": f"https://images.unsplash.com/photo-{photos[i % 3]}?w=600",
            "es_urgente": i in (0, 4, 9, 14),
            "vacunado": None if i % 4 == 0 else True,
            "esterilizado": None if i % 5 == 0 else i % 3 != 0,
            "desparasitado": i % 4 != 0,
            "estado_adopcion": "adoptado" if i >= 23 else "en_proceso" if i >= 20 else "disponible",
        }))

    # Dos adopciones cerradas, varias pendientes y rechazadas para revisar.
    for i, (animal_index, state) in enumerate([(0, "pendiente"), (0, "pendiente"), (1, "pendiente"),
                                              (2, "pendiente"), (3, "pendiente"), (20, "pendiente"),
                                              (5, "rechazada"), (6, "rechazada"),
                                              (23, "aprobada"), (24, "aprobada")]):
        animal = animals[animal_index]
        key = f"review-v1/adopcion/{i}"
        if not db.get(models.DemoRegistro, key):
            expected = "adoptado" if state == "aprobada" else ("disponible", "en_proceso")
            if (animal.estado_adopcion != expected if isinstance(expected, str) else animal.estado_adopcion not in expected):
                raise ValueError("El estado de una mascota demo cambió. No se añadirán solicitudes incompatibles.")
        ensure(key, models.SolicitudAdopcion, {
            "id_usuario": users[i % 6].id_usuario, "id_animal": animal.id_animal,
            "mensaje": APPLICATION_MESSAGES[i],
            "tipo_vivienda": ["casa-patio", "depto-malla", "depto-sin-malla", "parcela"][i % 4],
            "experiencia": "no" if i == 4 else "si", "telefono_contacto": "0000000000",
            "estado_solicitud": state, "notas_internas": "Revisar disponibilidad para la entrevista y confirmar los cuidados necesarios.",
            "respuesta_publica": None if state == "pendiente" else "Consulta los siguientes pasos con el refugio desde tu perfil.",
            "fecha_solicitud": datetime.utcnow() - timedelta(days=12 - i),
        })
    for i, user in enumerate(users):
        ensure(f"review-v1/favorito/{i}", models.Favorito, {
            "id_usuario": user.id_usuario, "id_animal": animals[i + 7].id_animal,
        })
        ensure(f"review-v1/voluntariado/{i}", models.SolicitudVoluntariado, {
            "id_usuario": user.id_usuario, "id_refugio": shelters[i % 5].id_refugio,
            "modalidad": ["paseos", "traslados", "hogar_temporal"][i % 3],
            "disponibilidad": "Sábados de 9:00 a 13:00",
            "comentarios": "Puedo apoyar los fines de semana y recibir orientación antes de comenzar.",
            "estado": ["pendiente", "aprobada", "rechazada"][i % 3],
        })
    refresh_presentation(db)
    return dict(created)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Valida y revierte todos los inserts.")
    parser.add_argument("--refresh-presentation", action="store_true", help="Actualiza solo textos de muestra antiguos; no crea registros ni cambia cuentas.")
    args = parser.parse_args()
    password = None if args.refresh_presentation else os.getenv("DEMO_PASSWORD") or getpass("Contraseña para cuentas demo (mínimo 8 caracteres): ")
    Base.metadata.create_all(engine)
    migrate(engine)
    # Una única carga a la vez también cuando la invocan dos terminales.
    with engine.connect() as lock:
        mysql = engine.dialect.name == "mysql"
        if mysql and lock.execute(text("SELECT GET_LOCK('huellas_seed_demo_v1', 10)")).scalar() != 1:
            raise RuntimeError("Otra carga de datos está en ejecución.")
        try:
            with SessionLocal() as db:
                result = {"campos_actualizados": refresh_presentation(db)} if args.refresh_presentation else seed_demo(db, password)
                if args.dry_run:
                    db.rollback()
                else:
                    db.commit()
                print(json.dumps({"simulacion": args.dry_run, "nuevos": result}, ensure_ascii=False))
        finally:
            if mysql:
                lock.execute(text("SELECT RELEASE_LOCK('huellas_seed_demo_v1')"))


if __name__ == "__main__":
    main()
