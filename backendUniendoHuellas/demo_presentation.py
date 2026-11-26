"""Contenido de muestra y actualización conservadora de sus textos originales."""
import models

SHELTER_ADDRESSES = [
    "Calle Jacarandas 184, Colonia Jardines del Sur, C.P. 14600",
    "Avenida Los Encinos 52, Colonia Valle del Sol, C.P. 72590",
    "Calle Loma Serena 87, Colonia Mirador del Bosque, C.P. 76148",
    "Calle Almendros 216, Colonia Jardines del Mayab, C.P. 97138",
    "Avenida Las Mariposas 39, Colonia Valle de la Luna, C.P. 50170",
]
APPLICATION_MESSAGES = [
    "Vivo en una casa con patio cerrado y trabajo desde casa. Puedo acompañar la adaptación, ofrecer paseos diarios y cubrir sus revisiones veterinarias.",
    "Mi familia busca un compañero tranquilo. Tenemos espacio seguro, tiempo por las tardes y un presupuesto reservado para alimentación y cuidados.",
    "Quiero adoptar de manera responsable. El departamento tiene protecciones y organizaré una rutina de juego, descanso y seguimiento veterinario.",
    "He cuidado gatos durante varios años. Puedo ofrecer un ambiente sereno, enriquecimiento dentro de casa y una adaptación gradual con supervisión.",
    "Sería mi primera adopción y estoy dispuesto a aprender. Ya preparé un espacio de descanso y tengo apoyo familiar para sus cuidados cotidianos.",
    "Deseo conocer sus necesidades antes de adoptar. Tengo disponibilidad para una entrevista y puedo acompañar los paseos y la adaptación a su nuevo hogar.",
    "Vivo cerca del refugio y cuento con tiempo por las mañanas. Me interesa conocer su carácter y organizar los cuidados con una clínica veterinaria.",
    "Busco un compañero adulto para un hogar tranquilo. Ofrezco compañía diaria, revisiones preventivas y paciencia durante su adaptación.",
    "Tenemos experiencia con animales rescatados y un patio protegido. Podemos mantener su rutina de cuidados y acudir a las revisiones necesarias.",
    "Quiero darle un hogar estable y seguro. Cuento con tiempo para la adaptación, alimentación adecuada y acompañamiento veterinario durante toda su vida.",
]


def refresh_presentation(db):
    """Solo retira marcadores conocidos o sustituye textos idénticos a la semilla."""
    changed = 0
    for marker in db.query(models.DemoRegistro).all():
        if not marker.clave.startswith("review-v1/"):
            continue
        table = marker.tabla
        model = {"refugios": models.Refugio, "usuarios": models.Usuario, "animales": models.Animal,
                 "solicitudes_adopcion": models.SolicitudAdopcion,
                 "solicitudes_voluntariado": models.SolicitudVoluntariado}.get(table)
        if model is None:
            continue
        record = db.get(model, marker.registro_id)
        if record is None:
            continue
        index = int(marker.clave.rsplit("/", 1)[-1])

        def update(field, value):
            nonlocal changed
            if getattr(record, field) != value:
                setattr(record, field, value)
                changed += 1

        if table == "refugios":
            if record.nombre_organizacion.startswith("[Demo] "):
                update("nombre_organizacion", record.nombre_organizacion.removeprefix("[Demo] "))
            if record.direccion == f"Calle de demostración {index + 10}, sin atención presencial":
                update("direccion", SHELTER_ADDRESSES[index])
        elif table == "usuarios" and record.nombre_completo.endswith(" (Demo)"):
            update("nombre_completo", record.nombre_completo.removesuffix(" (Demo)"))
        elif table == "animales" and record.descripcion:
            update("descripcion", record.descripcion.removeprefix(
                "[Demostración: historia ficticia y fotografía ilustrativa] "))
        elif table == "solicitudes_adopcion":
            if record.mensaje == "[Demo] Tengo un hogar seguro y tiempo para adaptación. Me gustaría conocer los cuidados y coordinar una entrevista.":
                update("mensaje", APPLICATION_MESSAGES[index])
                update("tipo_vivienda", ["casa-patio", "depto-malla", "depto-sin-malla", "parcela"][index % 4])
                update("experiencia", "no" if index == 4 else "si")
                update("telefono_contacto", "0000000000")
            if record.notas_internas == "Caso ficticio para revisión; no contactar.":
                update("notas_internas", "Revisar disponibilidad para la entrevista y confirmar los cuidados necesarios.")
            if record.respuesta_publica == "Resolución de demostración. Consulta los siguientes pasos con el refugio.":
                update("respuesta_publica", "Consulta los siguientes pasos con el refugio desde tu perfil.")
        elif table == "solicitudes_voluntariado":
            if record.disponibilidad == "Sábados por la mañana (demostración)":
                update("disponibilidad", "Sábados de 9:00 a 13:00")
            if record.comentarios == "Datos ficticios para probar la revisión de voluntariado.":
                update("comentarios", "Puedo apoyar los fines de semana y recibir orientación antes de comenzar.")
    return changed
