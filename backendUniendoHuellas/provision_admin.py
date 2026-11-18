"""Alta administrativa local, explícita y sin contraseñas en argumentos."""
import argparse
import getpass
import json
import secrets
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from auth import hash_password
from database import Base, SessionLocal, engine
from migrations import migrate
import models
import schemas


def create_administrator(db, data: schemas.UsuarioRegisterPublic):
    correo = str(data.correo).lower()
    if db.query(models.Usuario).filter(models.Usuario.correo == correo).first():
        raise ValueError("El correo ya existe. No se sobrescribió ni se elevó el rol de esa cuenta.")
    role = db.get(models.Rol, 1)
    if role is None:
        db.add(models.Rol(id_rol=1, nombre_rol="Administrador"))
        db.flush()
    elif role.nombre_rol != "Administrador":
        raise ValueError("El rol 1 tiene un uso desconocido; no se ha modificado.")
    user = models.Usuario(
        id_rol=1, id_refugio=None, nombre_completo=data.nombre_completo,
        correo=correo, telefono=data.telefono, ciudad=data.ciudad,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("No se pudo crear la cuenta. Revisa los roles y que el correo sea único.")
    db.refresh(user)
    return user


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--correo", required=True)
    parser.add_argument("--nombre", required=True)
    parser.add_argument("--telefono", required=True)
    parser.add_argument("--generate-password", action="store_true",
                        help="Genera una contraseña aleatoria y la muestra una sola vez al crear la cuenta.")
    args = parser.parse_args()
    if args.generate_password:
        password = secrets.token_urlsafe(24)
    else:
        password = getpass.getpass("Contraseña del administrador: ")
        if password != getpass.getpass("Repite la contraseña: "):
            parser.error("Las contraseñas no coinciden.")
    try:
        data = schemas.UsuarioRegisterPublic(
            nombre_completo=args.nombre, correo=args.correo,
            telefono=args.telefono, password=password,
        )
    except ValidationError as error:
        # No imprimir ValidationError: incluye valores de entrada sensibles.
        fields = ", ".join(str(issue["loc"][0]) for issue in error.errors())
        parser.error(f"Revisa estos campos: {fields}. Contraseña: mínimo 8 caracteres y máximo 72 bytes UTF-8.")
    Base.metadata.create_all(bind=engine)
    migrate(engine)
    try:
        with SessionLocal() as db:
            user = create_administrator(db, data)
            result = {"correo": user.correo, "id_usuario": user.id_usuario, "rol": "Administrador"}
            if args.generate_password:
                result["password"] = password
            print(json.dumps(result, ensure_ascii=False))
    except ValueError as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
