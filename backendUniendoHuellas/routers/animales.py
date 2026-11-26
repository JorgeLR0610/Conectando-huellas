from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import ValidationError
from sqlalchemy.orm import Session, joinedload
from database import get_db
import models
import schemas
from image_storage import fallback_photo, remove_photo, save_photo
from auth import (
    get_current_user,
    get_optional_current_user,
    require_refugio_or_admin,
    require_admin
)

router = APIRouter(prefix="/api/animales", tags=["Animales (Separados y Relacionales)"])


# =====================================================================
# 1. CONSULTAS DE TABLA SEPARADA (CRUD DE ANIMALES)
# =====================================================================

@router.get("", response_model=List[schemas.AnimalResponse], summary="Listar animales (Tabla Separada con Filtros)")
def get_animales(
    especie: Optional[str] = Query(None, description="Filtrar por especie: Perro, Gato, etc."),
    raza: Optional[str] = Query(None, description="Filtrar por raza"),
    sexo: Optional[str] = Query(None, description="Filtrar por sexo: Macho, Hembra"),
    tamano: Optional[str] = Query(None, description="Filtrar por tamaño: Pequeño, Mediano, Grande"),
    estado_adopcion: Optional[str] = Query(None, description="Filtrar por estado: disponible, adoptado"),
    id_refugio: Optional[int] = Query(None, description="Filtrar por ID de refugio"),
    q: Optional[str] = Query(None, description="Buscar término en nombre, raza o descripción"),
    es_urgente: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Obtiene la lista de animales de la tabla separada `Animales`.
    Permite filtrar por especie, raza, sexo, tamaño, estado de adopción y refugio.
    """
    query = db.query(models.Animal)
    if es_urgente is not None:
        query = query.filter(models.Animal.es_urgente == es_urgente)

    if especie:
        query = query.filter(models.Animal.especie.ilike(f"%{especie.strip()}%"))
    if raza:
        query = query.filter(models.Animal.raza.ilike(f"%{raza.strip()}%"))
    if sexo:
        query = query.filter(models.Animal.sexo.ilike(f"%{sexo.strip()}%"))
    if tamano:
        query = query.filter(models.Animal.tamano.ilike(f"%{tamano.strip()}%"))
    if estado_adopcion:
        query = query.filter(models.Animal.estado_adopcion == estado_adopcion.strip())
    if id_refugio:
        query = query.filter(models.Animal.id_refugio == id_refugio)
    if q:
        termino = f"%{q.strip()}%"
        query = query.filter(
            (models.Animal.nombre.ilike(termino)) |
            (models.Animal.especie.ilike(termino)) |
            (models.Animal.raza.ilike(termino)) |
            (models.Animal.tamano.ilike(termino)) |
            (models.Animal.descripcion.ilike(termino))
        )

    return query.order_by(models.Animal.id_animal.desc()).offset(offset).limit(limit).all()


@router.get("/{id_animal}", response_model=schemas.AnimalResponse, summary="Obtener animal por ID (Tabla Separada)")
def get_animal_by_id(id_animal: int, db: Session = Depends(get_db)):
    """Obtiene los datos directos de un animal específico."""
    animal = db.query(models.Animal).filter(models.Animal.id_animal == id_animal).first()
    if not animal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Animal no encontrado")
    return animal


@router.post("", response_model=schemas.AnimalResponse, status_code=status.HTTP_201_CREATED, summary="Dar de alta una mascota (Refugio o Admin)")
def create_animal(
    data: schemas.AnimalCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_refugio_or_admin)
):
    return save_animal(data, db, current_user)


def save_animal(data, db, current_user, foto: Optional[UploadFile] = None):
    """
    Registra un nuevo animal para adopción.
    - Si el usuario es de rol Refugio, automáticamente se le asigna a su propio refugio.
    - Si es Admin, puede asignarlo a cualquier refugio existente.
    """
    # Si es encargado de refugio, asegurar que usa su propio refugio
    id_refugio = data.id_refugio
    if current_user.id_rol != 1:  # No es admin
        if not current_user.id_refugio:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tu usuario de refugio no tiene un id_refugio asignado."
            )
        id_refugio = current_user.id_refugio

    # Verificar que el refugio existe
    refugio = db.query(models.Refugio).filter(models.Refugio.id_refugio == id_refugio).first()
    if not refugio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El refugio especificado no existe.")

    animal_dict = data.model_dump()
    animal_dict["id_refugio"] = id_refugio
    uploaded_url = save_photo(foto) if foto is not None else None
    animal_dict["foto_url"] = uploaded_url or data.foto_url or fallback_photo(data.especie)

    nuevo_animal = models.Animal(**animal_dict)
    db.add(nuevo_animal)
    try:
        db.commit()
    except Exception:
        db.rollback()
        remove_photo(uploaded_url)
        raise
    db.refresh(nuevo_animal)
    return nuevo_animal


@router.post("/ingreso", response_model=schemas.AnimalResponse, status_code=status.HTTP_201_CREATED)
def ingreso_con_imagen(
    datos: str = Form(..., max_length=16000),
    foto: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_admin),
):
    """Alta coordinada de animal e imagen. No deja archivos si falla la escritura en BD."""
    try:
        data = schemas.AnimalCreate.model_validate_json(datos)
    except ValidationError:
        raise HTTPException(422, "Revisa los datos del animal antes de guardarlo.")
    try:
        return save_animal(data, db, current_user, foto)
    finally:
        if foto is not None:
            foto.file.close()


@router.put("/{id_animal}", response_model=schemas.AnimalResponse, summary="Actualizar información de un animal")
def update_animal(
    id_animal: int,
    data: schemas.AnimalUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_refugio_or_admin)
):
    """
    Actualiza los datos de una mascota (nombre, foto, estado, etc.).
    Solo permitido para el refugio que lo resguarda o el Administrador.
    """
    animal = db.query(models.Animal).filter(models.Animal.id_animal == id_animal).with_for_update().first()
    if not animal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Animal no encontrado")

    # Si es encargado de refugio, verificar que el animal pertenezca a su refugio
    if current_user.id_rol != 1 and animal.id_refugio != current_user.id_refugio:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para modificar un animal perteneciente a otro refugio."
        )

    old_photo = animal.foto_url
    update_dict = data.model_dump(exclude_unset=True, exclude_none=True)
    for field in ("vacunado", "esterilizado", "desparasitado"):
        if field in data.model_fields_set:
            update_dict[field] = getattr(data, field)
    if "estado_adopcion" in update_dict and update_dict["estado_adopcion"] != animal.estado_adopcion:
        approved = db.query(models.SolicitudAdopcion).filter(
            models.SolicitudAdopcion.id_animal == id_animal,
            models.SolicitudAdopcion.estado_solicitud == "aprobada",
        ).with_for_update().first()
        if approved:
            raise HTTPException(409, "La mascota tiene una adopción aprobada; conserva su estado e historial.")
        if update_dict["estado_adopcion"] == "adoptado":
            pending = db.query(models.SolicitudAdopcion).filter(
                models.SolicitudAdopcion.id_animal == id_animal,
                models.SolicitudAdopcion.estado_solicitud == "pendiente",
            ).with_for_update().all()
            for request in pending:
                request.estado_solicitud = "rechazada"
                request.respuesta_publica = "La mascota ya no está disponible para adopción. Contacta al refugio para más información."
    if current_user.id_rol != 1:
        update_dict.pop("id_refugio", None)
    elif "id_refugio" in update_dict and not db.get(models.Refugio, update_dict["id_refugio"]):
        raise HTTPException(400, "Selecciona un refugio existente.")
    for key, value in update_dict.items():
        setattr(animal, key, value)

    db.commit()
    db.refresh(animal)
    if old_photo != animal.foto_url and not db.query(models.Animal).filter(models.Animal.foto_url == old_photo).first():
        remove_photo(old_photo)
    return animal


@router.delete("/{id_animal}", response_model=schemas.MensajeRespuesta, summary="Eliminar un animal")
def delete_animal(
    id_animal: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_refugio_or_admin)
):
    """
    Elimina el registro de una mascota.
    Solo el Administrador o el refugio dueño del animal pueden eliminarlo.
    """
    animal = db.query(models.Animal).filter(models.Animal.id_animal == id_animal).first()
    if not animal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Animal no encontrado")

    if current_user.id_rol != 1 and animal.id_refugio != current_user.id_refugio:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes eliminar un animal de otro refugio."
        )

    old_photo = animal.foto_url
    db.delete(animal)
    db.commit()
    if not db.query(models.Animal).filter(models.Animal.foto_url == old_photo).first():
        remove_photo(old_photo)
    return schemas.MensajeRespuesta(mensaje="Animal eliminado exitosamente", id=id_animal)


# =====================================================================
# 2. CONSULTAS DE TABLAS JUNTAS (JOINS / RELACIONALES)
# =====================================================================

@router.get("/relacion/con-refugio", response_model=List[schemas.AnimalConRefugioResponse], summary="Listar animales con datos de su Refugio (JOIN Animales + Refugios)")
def get_animales_con_refugio(
    especie: Optional[str] = Query(None, description="Perro, Gato, etc."),
    estado_adopcion: str = Query("disponible", description="Por defecto 'disponible'"),
    ciudad: Optional[str] = Query(None, description="Filtrar por ciudad del refugio"),
    es_urgente: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Consulta relacional (JOIN):
    Obtiene la información de los animales junto con el nombre, dirección, teléfono y ciudad del refugio.
    Ideal para mostrar las tarjetas del catálogo en el frontend.
    """
    query = db.query(models.Animal).join(models.Refugio).options(joinedload(models.Animal.refugio))
    if es_urgente is not None:
        query = query.filter(models.Animal.es_urgente == es_urgente)

    if estado_adopcion and estado_adopcion.lower() != "todos":
        query = query.filter(models.Animal.estado_adopcion == estado_adopcion)
    if especie:
        query = query.filter(models.Animal.especie.ilike(f"%{especie.strip()}%"))
    if ciudad:
        query = query.filter(models.Refugio.ciudad.ilike(f"%{ciudad.strip()}%"))

    return query.order_by(models.Animal.id_animal.desc()).all()


@router.get("/{id_animal}/detalle-completo", response_model=schemas.AnimalDetalleCompletoResponse, summary="Detalle completo de un animal (JOIN Animal + Refugio + Favorito)")
def get_animal_detalle_completo(
    id_animal: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.Usuario] = Depends(get_optional_current_user)
):
    """
    Consulta detallada de una mascota para la vista individual:
    - Retorna datos del animal
    - Datos del refugio que lo resguarda
    - Indica si el usuario actual lo tiene en favoritos (`es_favorito`: true/false)
    - Total de solicitudes de adopción recibidas
    """
    animal = db.query(models.Animal).options(joinedload(models.Animal.refugio)).filter(models.Animal.id_animal == id_animal).first()
    if not animal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Animal no encontrado")

    es_favorito = False
    if current_user:
        fav = db.query(models.Favorito).filter(
            models.Favorito.id_usuario == current_user.id_usuario,
            models.Favorito.id_animal == id_animal
        ).first()
        es_favorito = fav is not None

    total_solicitudes = db.query(models.SolicitudAdopcion).filter(
        models.SolicitudAdopcion.id_animal == id_animal
    ).count()

    return schemas.AnimalDetalleCompletoResponse(
        id_animal=animal.id_animal,
        id_refugio=animal.id_refugio,
        nombre=animal.nombre,
        especie=animal.especie,
        raza=animal.raza,
        sexo=animal.sexo,
        edad_estimada=animal.edad_estimada,
        tamano=animal.tamano,
        descripcion=animal.descripcion,
        foto_url=animal.foto_url,
        es_urgente=animal.es_urgente,
        vacunado=animal.vacunado,
        esterilizado=animal.esterilizado,
        desparasitado=animal.desparasitado,
        estado_adopcion=animal.estado_adopcion,
        refugio=schemas.RefugioResponse.model_validate(animal.refugio) if animal.refugio else None,
        es_favorito=es_favorito,
        total_solicitudes=total_solicitudes
    )
