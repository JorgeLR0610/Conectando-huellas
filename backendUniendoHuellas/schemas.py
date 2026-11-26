from datetime import datetime
from typing import Annotated, List, Literal, Optional
from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, StringConstraints


def password_bytes(value: str) -> str:
    if len(value.encode("utf-8")) > 72:
        raise ValueError("La contraseña no debe superar 72 bytes.")
    return value


Password = Annotated[str, Field(min_length=8), AfterValidator(password_bytes)]
def contact_phone(value: str) -> str:
    digits = sum(char.isdigit() for char in value)
    if not 7 <= digits <= 15:
        raise ValueError("Introduce un teléfono de 7 a 15 dígitos.")
    return value


TelefonoContacto = Annotated[str, StringConstraints(
    strip_whitespace=True, min_length=7, max_length=30, pattern=r"^\+?[0-9 ()-]+$"
), AfterValidator(contact_phone)]
TipoVivienda = Literal["casa-patio", "depto-malla", "depto-sin-malla", "parcela"]
Nombre = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=150)]
Telefono = Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=30)]
Ciudad = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=150)]


# =====================================================================
# 1. ESQUEMAS PARA ROLES
# =====================================================================
class RolBase(BaseModel):
    nombre_rol: str = Field(..., max_length=50, examples=["Usuario", "Refugio / Encargado", "Administrador"])

class RolCreate(RolBase):
    pass

class RolUpdate(BaseModel):
    nombre_rol: Optional[str] = Field(None, max_length=50)

class RolResponse(RolBase):
    id_rol: int

    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# 2. ESQUEMAS PARA REFUGIOS
# =====================================================================
class RefugioBase(BaseModel):
    nombre_organizacion: str = Field(..., max_length=150)
    direccion: str = Field(..., max_length=255)
    ciudad: str = Field(..., max_length=100)
    estado: str = Field(..., max_length=100)
    telefono: str = Field(..., max_length=30)
    logo_url: Optional[str] = Field(None, max_length=500)
    estado_cuenta: str = Field(default="activo", max_length=30)

class RefugioCreate(RefugioBase):
    pass

class RefugioUpdate(BaseModel):
    nombre_organizacion: Optional[str] = Field(None, max_length=150)
    direccion: Optional[str] = Field(None, max_length=255)
    ciudad: Optional[str] = Field(None, max_length=100)
    estado: Optional[str] = Field(None, max_length=100)
    telefono: Optional[str] = Field(None, max_length=30)
    logo_url: Optional[str] = Field(None, max_length=500)
    estado_cuenta: Optional[str] = Field(None, max_length=30)

class RefugioResponse(RefugioBase):
    id_refugio: int

    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# 3. ESQUEMAS PARA USUARIOS Y AUTENTICACIÓN
# =====================================================================
class UsuarioBase(BaseModel):
    id_rol: int = Field(..., description="1=Admin, 2=Refugio, 3=Usuario (adopción y voluntariado)")
    id_refugio: Optional[int] = Field(None, description="Obligatorio si el rol es Refugio/Encargado")
    nombre_completo: str = Field(..., max_length=150)
    correo: EmailStr
    telefono: str = Field(..., max_length=30)
    ciudad: Optional[Ciudad] = None

class UsuarioCreate(UsuarioBase):
    password: Password

class UsuarioRegisterPublic(BaseModel):
    """El registro público crea únicamente usuarios normales, sin elegir rol."""
    model_config = ConfigDict(extra="forbid")
    nombre_completo: Nombre
    correo: EmailStr
    password: Password
    telefono: Telefono
    ciudad: Optional[Ciudad] = None

class UsuarioUpdate(BaseModel):
    nombre_completo: Optional[Nombre] = None
    telefono: Optional[Telefono] = None
    ciudad: Optional[Ciudad] = None
    id_refugio: Optional[int] = None
    password: Optional[Password] = None

class UsuarioResponse(UsuarioBase):
    id_usuario: int

    model_config = ConfigDict(from_attributes=True)

class UsuarioLogin(BaseModel):
    correo: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioResponse
    rol_nombre: str


# =====================================================================
# 4. ESQUEMAS PARA ANIMALES
# =====================================================================
class AnimalBase(BaseModel):
    id_refugio: int
    nombre: str = Field(..., max_length=100)
    especie: str = Field(..., max_length=50, examples=["Perro", "Gato", "Otro"])
    raza: str = Field(..., max_length=100)
    sexo: str = Field(..., max_length=20, examples=["Macho", "Hembra"])
    edad_estimada: str = Field(..., max_length=50, examples=["2 años", "6 meses"])
    tamano: str = Field(..., max_length=30, examples=["Pequeño", "Mediano", "Grande"])
    descripcion: Optional[str] = None
    foto_url: Optional[str] = Field(None, max_length=500)
    es_urgente: bool = False
    vacunado: Optional[bool] = None
    esterilizado: Optional[bool] = None
    desparasitado: Optional[bool] = None
    estado_adopcion: Literal["disponible", "en_proceso", "adoptado"] = "disponible"

class AnimalCreate(AnimalBase):
    pass

class AnimalUpdate(BaseModel):
    id_refugio: Optional[int] = None
    nombre: Optional[str] = Field(None, max_length=100)
    especie: Optional[str] = Field(None, max_length=50)
    raza: Optional[str] = Field(None, max_length=100)
    sexo: Optional[str] = Field(None, max_length=20)
    edad_estimada: Optional[str] = Field(None, max_length=50)
    tamano: Optional[str] = Field(None, max_length=30)
    descripcion: Optional[str] = None
    foto_url: Optional[str] = Field(None, max_length=500)
    es_urgente: Optional[bool] = None
    vacunado: Optional[bool] = None
    esterilizado: Optional[bool] = None
    desparasitado: Optional[bool] = None
    estado_adopcion: Optional[Literal["disponible", "en_proceso", "adoptado"]] = None

class AnimalResponse(AnimalBase):
    id_animal: int

    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# 5. ESQUEMAS PARA SOLICITUDES DE ADOPCIÓN
# =====================================================================
class SolicitudBase(BaseModel):
    id_usuario: int
    id_animal: int
    mensaje: Optional[str] = None
    estado_solicitud: str = Field(default="pendiente", max_length=30, examples=["pendiente", "aprobada", "rechazada"])
    notas_internas: Optional[str] = None

class SolicitudCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id_animal: int = Field(gt=0)
    tipo_vivienda: TipoVivienda
    experiencia: Literal["si", "no"]
    telefono_contacto: TelefonoContacto
    mensaje: Annotated[str, StringConstraints(strip_whitespace=True, min_length=30, max_length=3000)]

class SolicitudUpdateEstado(BaseModel):
    estado_solicitud: Literal["aprobada", "rechazada"]
    notas_internas: Optional[str] = Field(None, max_length=3000)
    respuesta_publica: Optional[str] = Field(None, max_length=3000)

class SolicitudResponse(BaseModel):
    id_solicitud: int
    id_usuario: int
    id_animal: int
    mensaje: Optional[str]
    tipo_vivienda: Optional[str] = None
    experiencia: Optional[str] = None
    telefono_contacto: Optional[str] = None
    estado_solicitud: str
    notas_internas: Optional[str]
    respuesta_publica: Optional[str] = None
    fecha_solicitud: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# 6. ESQUEMAS PARA FAVORITOS
# =====================================================================
class FavoritoCreate(BaseModel):
    id_animal: int

class FavoritoResponse(BaseModel):
    id_favorito: int
    id_usuario: int
    id_animal: int

    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# 7. ESQUEMAS PARA TABLAS JUNTAS (JOINS / RELACIONALES)
# =====================================================================

# 7.1 Animal con información de su Refugio
class AnimalConRefugioResponse(AnimalResponse):
    refugio: Optional[RefugioResponse] = None

    model_config = ConfigDict(from_attributes=True)

# 7.2 Animal con detalle ampliado (favorito, solicitudes)
class AnimalDetalleCompletoResponse(AnimalConRefugioResponse):
    es_favorito: bool = False
    total_solicitudes: int = 0

# 7.3 Refugio con su lista de animales
class RefugioConAnimalesResponse(RefugioResponse):
    animales: List[AnimalResponse] = []
    total_animales: int = 0

    model_config = ConfigDict(from_attributes=True)

# 7.4 Refugio con encargados y animales
class RefugioCompletoResponse(RefugioResponse):
    usuarios: List[UsuarioResponse] = []
    animales: List[AnimalResponse] = []
    total_animales_disponibles: int = 0

    model_config = ConfigDict(from_attributes=True)

# 7.5 Solicitud de adopción detallada (Usuario + Animal + Refugio)
class SolicitudDetalladaResponse(BaseModel):
    id_solicitud: int
    id_usuario: int
    id_animal: int
    mensaje: Optional[str]
    tipo_vivienda: Optional[str] = None
    experiencia: Optional[str] = None
    telefono_contacto: Optional[str] = None
    estado_solicitud: str
    notas_internas: Optional[str]
    respuesta_publica: Optional[str] = None
    fecha_solicitud: datetime
    usuario: UsuarioResponse
    animal: AnimalConRefugioResponse

    model_config = ConfigDict(from_attributes=True)

# 7.6 Favorito detallado (con los datos del animal y refugio)
class FavoritoDetalladoResponse(BaseModel):
    id_favorito: int
    id_usuario: int
    animal: AnimalConRefugioResponse

    model_config = ConfigDict(from_attributes=True)

# 7.7 Usuario con Rol y Refugio
class UsuarioConRolRefugioResponse(UsuarioResponse):
    rol: Optional[RolResponse] = None
    refugio: Optional[RefugioResponse] = None

    model_config = ConfigDict(from_attributes=True)

# 7.8 Perfil Completo del Usuario (para dashboard personal)
class UsuarioPerfilCompletoResponse(UsuarioConRolRefugioResponse):
    solicitudes: List[SolicitudResponse] = []
    favoritos: List[FavoritoDetalladoResponse] = []

    model_config = ConfigDict(from_attributes=True)

# 7.9 Registro simultáneo de Refugio + Usuario Administrador del refugio
class RegistroRefugioYAdminRequest(BaseModel):
    # Datos del Refugio
    nombre_organizacion: str
    direccion: str
    ciudad: str
    estado: str
    telefono_refugio: str
    logo_url: Optional[str] = None
    # Datos del Encargado / Usuario
    nombre_encargado: str
    correo: EmailStr
    password: Password
    telefono_encargado: str

# 7.10 Dashboard de Métricas y Estadísticas Globales
class DashboardResumenResponse(BaseModel):
    total_refugios: int
    total_refugios_activos: int
    total_animales: int
    total_animales_disponibles: int
    total_animales_adoptados: int
    total_usuarios: int
    total_solicitudes: int
    solicitudes_pendientes: int
    solicitudes_aprobadas: int
    animales_por_especie: dict
    ultimos_animales: List[AnimalConRefugioResponse]


# Respuesta genérica de éxito/eliminación
class MensajeRespuesta(BaseModel):
    mensaje: str
    id: Optional[int] = None


class VoluntariadoCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id_refugio: int = Field(gt=0)
    modalidad: Literal["paseos", "traslados", "hogar_temporal"]
    disponibilidad: Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=300)]
    comentarios: Optional[Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]] = None


class VoluntariadoEstado(BaseModel):
    estado: Literal["aprobada", "rechazada"]


class VoluntariadoResponse(VoluntariadoCreate):
    id_solicitud: int
    id_usuario: int
    estado: str
    fecha_solicitud: datetime
    refugio: RefugioResponse
    model_config = ConfigDict(from_attributes=True)


class VoluntariadoAdminResponse(VoluntariadoResponse):
    usuario: UsuarioResponse
