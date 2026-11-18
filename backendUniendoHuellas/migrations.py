"""Migraciones idempotentes: conservan usuarios, solicitudes y volúmenes."""
from sqlalchemy import inspect, select, text
import models


def migrate(engine):
    with engine.begin() as connection:
        columns = {column["name"] for column in inspect(connection).get_columns("usuarios")}
        if "ciudad" not in columns:
            connection.execute(text("ALTER TABLE usuarios ADD COLUMN ciudad VARCHAR(150) NULL"))
        inspector = inspect(connection)
        if inspector.has_table("animales"):
            animal_columns = {column["name"] for column in inspector.get_columns("animales")}
            if "es_urgente" not in animal_columns:
                connection.execute(text("ALTER TABLE animales ADD COLUMN es_urgente BOOLEAN NOT NULL DEFAULT 0"))

        roles = models.Rol.__table__
        users = models.Usuario.__table__
        regular_name = connection.execute(select(roles.c.nombre_rol).where(roles.c.id_rol == 3)).scalar_one_or_none()
        volunteer_name = connection.execute(select(roles.c.nombre_rol).where(roles.c.id_rol == 4)).scalar_one_or_none()
        if regular_name not in (None, "Adoptante", "Usuario"):
            raise RuntimeError("El rol 3 tiene un uso desconocido. Revisa la migración antes de continuar.")
        if volunteer_name not in (None, "Voluntario / Hogar temporal"):
            raise RuntimeError("El rol 4 tiene un uso desconocido. Revisa la migración antes de continuar.")
        if regular_name is None:
            connection.execute(roles.insert().values(id_rol=3, nombre_rol="Usuario"))
        else:
            connection.execute(roles.update().where(roles.c.id_rol == 3).values(nombre_rol="Usuario"))
        if volunteer_name is not None:
            # Reasignar primero las FK; no se elimina ninguna cuenta ni su historial.
            connection.execute(users.update().where(users.c.id_rol == 4).values(id_rol=3))
            connection.execute(roles.delete().where(roles.c.id_rol == 4))
