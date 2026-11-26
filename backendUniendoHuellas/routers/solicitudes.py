from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from database import get_db
import models
import schemas
from auth import (
    get_current_user,
    require_usuario,
    require_refugio_or_admin,
    require_admin
)

router = APIRouter(prefix="/api/solicitudes", tags=["Solicitudes de Adopción (Separadas y Relacionales)"])


# =====================================================================
# 1. CONSULTAS DE TABLA SEPARADA (CRUD DE SOLICITUDES)
# =====================================================================

@router.get("", response_model=List[schemas.SolicitudResponse], summary="Listar solicitudes (Tabla Separada con Filtros)")
def get_solicitudes(
    estado_solicitud: Optional[str] = Query(None, description="pendiente, aprobada, rechazada"),
    id_usuario: Optional[int] = Query(None, description="Filtrar por id de usuario solicitante"),
    id_animal: Optional[int] = Query(None, description="Filtrar por id de animal"),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_refugio_or_admin)
):
    """
    Obtiene la lista de solicitudes de adopción directamente de la tabla separada `Solicitudes_Adopcion`.
    Requiere rol de Encargado de Refugio o Administrador.
    """
    query = db.query(models.SolicitudAdopcion)
    if current_user.id_rol != 1:
        query = query.join(models.Animal).filter(models.Animal.id_refugio == current_user.id_refugio)
    if estado_solicitud:
        query = query.filter(models.SolicitudAdopcion.estado_solicitud == estado_solicitud.strip())
    if id_usuario:
        query = query.filter(models.SolicitudAdopcion.id_usuario == id_usuario)
    if id_animal:
        query = query.filter(models.SolicitudAdopcion.id_animal == id_animal)

    return query.order_by(models.SolicitudAdopcion.id_solicitud.desc()).all()


@router.get("/{id_solicitud}", response_model=schemas.SolicitudResponse, summary="Obtener una solicitud por ID")
def get_solicitud_by_id(
    id_solicitud: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Obtiene una solicitud específica por su ID."""
    solicitud = db.query(models.SolicitudAdopcion).filter(models.SolicitudAdopcion.id_solicitud == id_solicitud).first()
    if not solicitud:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada")

    # Validar permisos: el solicitante, el refugio del animal o el admin
    is_owner = solicitud.id_usuario == current_user.id_usuario
    is_shelter = current_user.id_rol == 2 and solicitud.animal.id_refugio == current_user.id_refugio
    if current_user.id_rol != 1 and not is_owner and not is_shelter:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes ver la solicitud de otro usuario.")

    response = schemas.SolicitudResponse.model_validate(solicitud)
    if current_user.id_rol == 3:
        response.notas_internas = None
    return response


@router.post("", response_model=schemas.SolicitudResponse, status_code=status.HTTP_201_CREATED, summary="Enviar una nueva solicitud de adopción")
def create_solicitud(
    data: schemas.SolicitudCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_usuario)
):
    """
    Crea una nueva solicitud de adopción para una mascota.
    Toma automáticamente el `id_usuario` del usuario logueado.
    """
    # Verificar que el animal existe y está disponible
    animal = db.query(models.Animal).filter(models.Animal.id_animal == data.id_animal).with_for_update().first()
    if not animal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El animal especificado no existe.")

    if animal.estado_adopcion != "disponible":
        raise HTTPException(status_code=409, detail="Esta mascota no está disponible para nuevas solicitudes.")
    if animal.refugio.estado_cuenta != "activo":
        raise HTTPException(status_code=409, detail="El refugio no está recibiendo solicitudes.")

    # Verificar si el usuario ya tiene una solicitud pendiente para este animal
    solicitud_existente = db.query(models.SolicitudAdopcion).filter(
        models.SolicitudAdopcion.id_usuario == current_user.id_usuario,
        models.SolicitudAdopcion.id_animal == data.id_animal,
        models.SolicitudAdopcion.estado_solicitud.in_(("pendiente", "aprobada"))
    ).with_for_update().first()
    if solicitud_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya tienes una solicitud pendiente para esta mascota."
        )

    nueva_solicitud = models.SolicitudAdopcion(
        id_usuario=current_user.id_usuario,
        id_animal=data.id_animal,
        mensaje=data.mensaje,
        tipo_vivienda=data.tipo_vivienda,
        experiencia=data.experiencia,
        telefono_contacto=data.telefono_contacto,
        estado_solicitud="pendiente",
        notas_internas=None,
        fecha_solicitud=datetime.utcnow()
    )
    db.add(nueva_solicitud)
    db.commit()
    db.refresh(nueva_solicitud)
    return nueva_solicitud


@router.put("/{id_solicitud}/estado", response_model=schemas.SolicitudResponse, summary="Aprobar o Rechazar solicitud (Refugio o Admin)")
def update_solicitud_estado(
    id_solicitud: int,
    data: schemas.SolicitudUpdateEstado,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_refugio_or_admin)
):
    """
    Permite al personal del refugio o al Admin cambiar el estado de la solicitud:
    - 'aprobada' (puede cambiar automáticamente el estado_adopcion del animal a 'en_proceso' o 'adoptado')
    - 'rechazada'
    - 'pendiente'
    """
    solicitud = db.query(models.SolicitudAdopcion).filter(models.SolicitudAdopcion.id_solicitud == id_solicitud).first()
    if not solicitud:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada")

    # Todas las escrituras de adopción bloquean primero el animal. Una lectura
    # bloqueante ve el último commit incluso bajo REPEATABLE READ de MySQL.
    animal = db.query(models.Animal).filter(
        models.Animal.id_animal == solicitud.id_animal
    ).populate_existing().with_for_update().one()
    solicitud = db.query(models.SolicitudAdopcion).filter(
        models.SolicitudAdopcion.id_solicitud == id_solicitud
    ).populate_existing().with_for_update().first()
    if not solicitud:
        raise HTTPException(404, "Solicitud no encontrada")
    if current_user.id_rol != 1 and animal.id_refugio != current_user.id_refugio:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes gestionar solicitudes de mascotas de otro refugio."
        )

    estado_normalizado = data.estado_solicitud
    if solicitud.estado_solicitud != "pendiente":
        raise HTTPException(409, "Esta solicitud ya fue resuelta; su historial no se puede reabrir.")
    if estado_normalizado == "aprobada":
        approved = db.query(models.SolicitudAdopcion).filter(
            models.SolicitudAdopcion.id_animal == animal.id_animal,
            models.SolicitudAdopcion.estado_solicitud == "aprobada",
        ).with_for_update().first()
        if animal.estado_adopcion == "adoptado" or approved:
            raise HTTPException(409, "Esta mascota ya tiene una adopción aprobada.")
    solicitud.estado_solicitud = estado_normalizado
    if data.notas_internas is not None:
        solicitud.notas_internas = data.notas_internas.strip()
    solicitud.respuesta_publica = (data.respuesta_publica or (
        "Tu solicitud fue aprobada. Contacta al refugio para coordinar los siguientes pasos."
        if estado_normalizado == "aprobada" else
        "Tu solicitud no fue aprobada. Puedes contactar al refugio para más información."
    )).strip()

    # Si se aprueba la adopción, actualizar el estado del animal
    if estado_normalizado == "aprobada":
        animal.estado_adopcion = "adoptado"
        others = db.query(models.SolicitudAdopcion).filter(
            models.SolicitudAdopcion.id_animal == animal.id_animal,
            models.SolicitudAdopcion.id_solicitud != solicitud.id_solicitud,
            models.SolicitudAdopcion.estado_solicitud == "pendiente",
        ).with_for_update().all()
        for other in others:
            other.estado_solicitud = "rechazada"
            other.respuesta_publica = "Esta mascota encontró un hogar mediante otra solicitud. Gracias por tu interés; puedes conocer otros compañeros."

    db.commit()
    db.refresh(solicitud)
    return solicitud


@router.delete("/{id_solicitud}", response_model=schemas.MensajeRespuesta, summary="Cancelar o eliminar solicitud")
def delete_solicitud(
    id_solicitud: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Permite al solicitante cancelar su propia solicitud, o al administrador eliminarla."""
    solicitud = db.query(models.SolicitudAdopcion).filter(models.SolicitudAdopcion.id_solicitud == id_solicitud).first()
    if not solicitud:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada")

    if current_user.id_rol != 1 and solicitud.id_usuario != current_user.id_usuario:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes cancelar una solicitud que no te pertenece.")

    db.query(models.Animal).filter(models.Animal.id_animal == solicitud.id_animal).with_for_update().one()
    db.refresh(solicitud, with_for_update=True)
    if solicitud.estado_solicitud != "pendiente":
        raise HTTPException(409, "Solo se pueden cancelar solicitudes pendientes. Se conserva el historial resuelto.")
    db.delete(solicitud)
    db.commit()
    return schemas.MensajeRespuesta(mensaje="Solicitud eliminada o cancelada exitosamente", id=id_solicitud)


# =====================================================================
# 2. CONSULTAS DE TABLAS JUNTAS (JOINS / RELACIONALES)
# =====================================================================

@router.get("/relacion/detalladas", response_model=List[schemas.SolicitudDetalladaResponse], summary="Solicitudes Detalladas (JOIN Solicitudes + Usuarios + Animales + Refugios)")
def get_solicitudes_detalladas(
    estado_solicitud: Optional[str] = Query(None, description="Filtrar por estado"),
    db: Session = Depends(get_db),
    _current_user: models.Usuario = Depends(require_refugio_or_admin)
):
    """
    Consulta relacional completa (JOIN de 4 tablas):
    Retorna la lista de solicitudes con los datos del adoptante, de la mascota y del refugio resguardante.
    """
    query = db.query(models.SolicitudAdopcion).options(
        joinedload(models.SolicitudAdopcion.usuario),
        joinedload(models.SolicitudAdopcion.animal).joinedload(models.Animal.refugio)
    )
    if _current_user.id_rol != 1:
        query = query.join(models.Animal).filter(models.Animal.id_refugio == _current_user.id_refugio)

    if estado_solicitud:
        query = query.filter(models.SolicitudAdopcion.estado_solicitud == estado_solicitud.strip())

    solicitudes = query.order_by(models.SolicitudAdopcion.id_solicitud.desc()).all()

    resultado = []
    for s in solicitudes:
        resultado.append(
            schemas.SolicitudDetalladaResponse(
                id_solicitud=s.id_solicitud,
                id_usuario=s.id_usuario,
                id_animal=s.id_animal,
                mensaje=s.mensaje,
                tipo_vivienda=s.tipo_vivienda,
                experiencia=s.experiencia,
                telefono_contacto=s.telefono_contacto,
                estado_solicitud=s.estado_solicitud,
                notas_internas=s.notas_internas,
                respuesta_publica=s.respuesta_publica,
                fecha_solicitud=s.fecha_solicitud,
                usuario=schemas.UsuarioResponse.model_validate(s.usuario),
                animal=schemas.AnimalConRefugioResponse.model_validate(s.animal)
            )
        )
    return resultado


@router.get("/relacion/mis-solicitudes", response_model=List[schemas.SolicitudDetalladaResponse], summary="Mis solicitudes de adopción (Usuario Autenticado)")
def get_mis_solicitudes(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_usuario)
):
    """
    Retorna todas las solicitudes realizadas por el usuario actualmente logueado,
    con la información completa de la mascota solicitada y el refugio.
    """
    solicitudes = db.query(models.SolicitudAdopcion).options(
        joinedload(models.SolicitudAdopcion.usuario),
        joinedload(models.SolicitudAdopcion.animal).joinedload(models.Animal.refugio)
    ).filter(models.SolicitudAdopcion.id_usuario == current_user.id_usuario).order_by(models.SolicitudAdopcion.id_solicitud.desc()).all()

    resultado = []
    for s in solicitudes:
        resultado.append(
            schemas.SolicitudDetalladaResponse(
                id_solicitud=s.id_solicitud,
                id_usuario=s.id_usuario,
                id_animal=s.id_animal,
                mensaje=s.mensaje,
                tipo_vivienda=s.tipo_vivienda,
                experiencia=s.experiencia,
                telefono_contacto=s.telefono_contacto,
                estado_solicitud=s.estado_solicitud,
                notas_internas=None,
                respuesta_publica=s.respuesta_publica,
                fecha_solicitud=s.fecha_solicitud,
                usuario=schemas.UsuarioResponse.model_validate(s.usuario),
                animal=schemas.AnimalConRefugioResponse.model_validate(s.animal)
            )
        )
    return resultado


@router.get("/relacion/refugio/{id_refugio}", response_model=List[schemas.SolicitudDetalladaResponse], summary="Solicitudes recibidas por un refugio específico (JOIN)")
def get_solicitudes_por_refugio(
    id_refugio: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_refugio_or_admin)
):
    """
    Retorna todas las solicitudes de adopción dirigidas a los animales resguardados por el refugio.
    Permite al administrador o al encargado ver a los postulantes con su información de contacto.
    """
    if current_user.id_rol != 1 and current_user.id_refugio != id_refugio:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para ver las solicitudes de otro refugio."
        )

    solicitudes = db.query(models.SolicitudAdopcion).join(models.Animal).filter(
        models.Animal.id_refugio == id_refugio
    ).options(
        joinedload(models.SolicitudAdopcion.usuario),
        joinedload(models.SolicitudAdopcion.animal).joinedload(models.Animal.refugio)
    ).order_by(models.SolicitudAdopcion.id_solicitud.desc()).all()

    resultado = []
    for s in solicitudes:
        resultado.append(
            schemas.SolicitudDetalladaResponse(
                id_solicitud=s.id_solicitud,
                id_usuario=s.id_usuario,
                id_animal=s.id_animal,
                mensaje=s.mensaje,
                tipo_vivienda=s.tipo_vivienda,
                experiencia=s.experiencia,
                telefono_contacto=s.telefono_contacto,
                estado_solicitud=s.estado_solicitud,
                notas_internas=s.notas_internas,
                respuesta_publica=s.respuesta_publica,
                fecha_solicitud=s.fecha_solicitud,
                usuario=schemas.UsuarioResponse.model_validate(s.usuario),
                animal=schemas.AnimalConRefugioResponse.model_validate(s.animal)
            )
        )
    return resultado
