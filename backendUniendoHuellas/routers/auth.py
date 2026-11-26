from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from database import get_db
import models
import schemas
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/api/auth", tags=["Autenticación y Registro"])


@router.post("/register", response_model=schemas.UsuarioResponse, status_code=status.HTTP_201_CREATED, summary="Registro público de usuario")
def register_user(data: schemas.UsuarioRegisterPublic, db: Session = Depends(get_db)):
    """
    Registra un usuario normal (3), sin aceptar roles desde el cliente.
    """
    existing_user = db.query(models.Usuario).filter(models.Usuario.correo == data.correo.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un usuario registrado con este correo electrónico."
        )

    nuevo_usuario = models.Usuario(
        id_rol=3,
        id_refugio=None,
        nombre_completo=data.nombre_completo.strip(),
        correo=data.correo.lower().strip(),
        password_hash=hash_password(data.password),
        telefono=data.telefono.strip(),
        ciudad=data.ciudad
    )

    db.add(nuevo_usuario)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Ya existe un usuario registrado con este correo electrónico.")
    db.refresh(nuevo_usuario)
    return nuevo_usuario


@router.post("/login", response_model=schemas.TokenResponse, summary="Iniciar Sesión")
def login(credentials: schemas.UsuarioLogin, db: Session = Depends(get_db)):
    """
    Autentica al usuario mediante correo y contraseña.
    Retorna el Token JWT Bearer con expiración y el objeto de datos del usuario autenticado.
    """
    user = db.query(models.Usuario).filter(models.Usuario.correo == credentials.correo.lower()).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo electrónico o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    nombre_rol = user.rol.nombre_rol if user.rol else f"Rol {user.id_rol}"

    token_data = {
        "sub": str(user.id_usuario),
        "correo": user.correo,
        "id_rol": user.id_rol,
        "nombre_rol": nombre_rol,
        "id_refugio": user.id_refugio,
        "nombre_completo": user.nombre_completo
    }

    access_token = create_access_token(
        data=token_data,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        usuario=schemas.UsuarioResponse.model_validate(user),
        rol_nombre=nombre_rol
    )


@router.get("/me", response_model=schemas.UsuarioConRolRefugioResponse, summary="Perfil del Usuario Autenticado")
def get_current_user_profile(current_user: models.Usuario = Depends(get_current_user)):
    """
    Retorna la información del usuario en sesión, su rol y los datos de su refugio (si es encargado).
    Requiere header `Authorization: Bearer <token>`.
    """
    return current_user
