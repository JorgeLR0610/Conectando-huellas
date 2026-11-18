from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from database import get_db
from auth import require_admin, require_usuario
import models
import schemas

router = APIRouter(prefix="/api/voluntariado", tags=["Voluntariado"])


@router.get("/mis-solicitudes", response_model=List[schemas.VoluntariadoResponse])
def mis_solicitudes(db: Session = Depends(get_db), user=Depends(require_usuario)):
    return db.query(models.SolicitudVoluntariado).options(
        joinedload(models.SolicitudVoluntariado.refugio)
    ).filter(models.SolicitudVoluntariado.id_usuario == user.id_usuario).order_by(
        models.SolicitudVoluntariado.id_solicitud.desc()
    ).all()


@router.post("", response_model=schemas.VoluntariadoResponse, status_code=status.HTTP_201_CREATED)
def crear(data: schemas.VoluntariadoCreate, db: Session = Depends(get_db), user=Depends(require_usuario)):
    refugio = db.get(models.Refugio, data.id_refugio)
    if not refugio or refugio.estado_cuenta != "activo":
        raise HTTPException(404, "Selecciona un refugio activo.")
    solicitud = models.SolicitudVoluntariado(id_usuario=user.id_usuario, **data.model_dump())
    db.add(solicitud)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Ya enviaste una solicitud de esta modalidad a este refugio.")
    db.refresh(solicitud)
    return solicitud


@router.get("", response_model=List[schemas.VoluntariadoAdminResponse])
def todas(db: Session = Depends(get_db), user=Depends(require_admin)):
    return db.query(models.SolicitudVoluntariado).options(
        joinedload(models.SolicitudVoluntariado.refugio),
        joinedload(models.SolicitudVoluntariado.usuario)
    ).order_by(models.SolicitudVoluntariado.id_solicitud.desc()).all()


@router.patch("/{id_solicitud}/estado", response_model=schemas.VoluntariadoAdminResponse)
def cambiar_estado(id_solicitud: int, data: schemas.VoluntariadoEstado,
                   db: Session = Depends(get_db), user=Depends(require_admin)):
    solicitud = db.query(models.SolicitudVoluntariado).filter(
        models.SolicitudVoluntariado.id_solicitud == id_solicitud
    ).with_for_update().first()
    if not solicitud:
        raise HTTPException(404, "Solicitud no encontrada.")
    if solicitud.estado != "pendiente":
        raise HTTPException(409, "Esta solicitud ya fue revisada.")
    solicitud.estado = data.estado
    db.commit()
    db.refresh(solicitud)
    return solicitud
