"""Prueba opt-in sobre una API real. Crea y elimina solo sus propios registros QA."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from getpass import getpass
import json
import secrets
from urllib.error import HTTPError
from urllib.request import Request, urlopen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:3001")
    args = parser.parse_args()
    email = input("Correo del administrador existente: ").strip()
    password = getpass("Contraseña: ")

    def call(method, path, data=None, token=None):
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = "Bearer " + token
        request = Request(args.base_url.rstrip("/") + path, method=method, headers=headers,
                          data=json.dumps(data).encode() if data is not None else None)
        try:
            with urlopen(request, timeout=30) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            return error.code, json.load(error)

    status, admin = call("POST", "/api/auth/login", {"correo": email, "password": password})
    if status != 200 or admin["usuario"]["id_rol"] != 1:
        raise RuntimeError("Se necesita una sesión administrativa válida.")
    token = admin["access_token"]
    status, health = call("GET", "/api/health")
    if status != 200 or health["motor_bd"].lower() != "mysql":
        raise RuntimeError("Esta prueba requiere MySQL real.")
    _, shelters = call("GET", "/api/consultas-juntas/refugios-directorio")
    if not shelters:
        raise RuntimeError("No hay refugios para alojar el registro QA.")
    user_ids, animal_ids, sessions = [], [], []
    stamp = secrets.token_hex(8)
    try:
        for i in range(2):
            user_password = secrets.token_urlsafe(24)
            email = f"qa-race-{stamp}-{i}@example.com"
            status, user = call("POST", "/api/auth/register", {
                "nombre_completo": "QA Concurrencia", "correo": email, "password": user_password,
                "telefono": "0000000000", "ciudad": "Querétaro",
            })
            assert status == 201, user
            user_ids.append(user["id_usuario"])
            status, login = call("POST", "/api/auth/login", {"correo": email, "password": user_password})
            assert status == 200, login
            sessions.append(login["access_token"])
        status, animal = call("POST", "/api/animales", {
            "id_refugio": shelters[0]["id_refugio"], "nombre": f"QA Race {stamp}", "especie": "Perro",
            "raza": "Mestizo", "sexo": "Hembra", "edad_estimada": "2 años", "tamano": "Mediano",
        }, token)
        assert status == 201, animal
        animal_ids.append(animal["id_animal"])
        requests = []
        for session in sessions:
            status, request = call("POST", "/api/solicitudes", {
                "id_animal": animal["id_animal"], "mensaje": "Prueba temporal de concurrencia con una vivienda segura y tiempo para cuidar.",
                "tipo_vivienda": "casa-patio", "experiencia": "si", "telefono_contacto": "0000000000",
            }, session)
            assert status == 201, request
            requests.append(request["id_solicitud"])
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda request_id: call("PUT", f"/api/solicitudes/{request_id}/estado",
                {"estado_solicitud": "aprobada", "notas_internas": "QA privado"}, token), requests))
        assert sorted(status for status, _ in results) == [200, 409], results
        status, records = call("GET", f"/api/solicitudes?id_animal={animal['id_animal']}", token=token)
        assert status == 200
        assert sorted(row["estado_solicitud"] for row in records) == ["aprobada", "rechazada"], records
        for session in sessions:
            _, mine = call("GET", "/api/solicitudes/relacion/mis-solicitudes", token=session)
            assert "QA privado" not in json.dumps(mine)
        print("OK: MySQL devolvió 200/409; una aprobada, una rechazada; notas privadas.")
    finally:
        failures = []
        for animal_id in animal_ids:
            status, _ = call("DELETE", f"/api/animales/{animal_id}", token=token)
            if status != 200:
                failures.append(f"animal {animal_id}")
        for user_id in user_ids:
            status, _ = call("DELETE", f"/api/usuarios/{user_id}", token=token)
            if status != 200:
                failures.append(f"usuario {user_id}")
        if failures:
            raise RuntimeError("Revisar limpieza de registros propios QA: " + ", ".join(failures))


if __name__ == "__main__":
    main()
