import os
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from image_storage import ImageUploadLimitMiddleware
from database import engine, Base, selected_db_type
from routers import (
    auth,
    roles,
    refugios,
    animales,
    usuarios,
    solicitudes,
    favoritos,
    consultas_juntas,
    voluntariado,
    imagenes
)

load_dotenv()

# Asegurar que las tablas existan (en MySQL Workbench o SQLite)
from migrations import migrate
Base.metadata.create_all(bind=engine)
migrate(engine)

app = FastAPI(
    title="API de Adopción de Mascotas (Huellitas / Nubira)",
    description="""
    Backend completo para plataforma de adopción de mascotas:
    - **Casas de adopción (Refugios)**: Alta de organización, gestión de animales y revisión de solicitudes de adopción.
    - **Adoptantes**: Catálogo de mascotas, filtros avanzados, favoritos y envío de solicitudes.
    - **Administradores**: Control total de usuarios, roles y métricas globales.
    - **Consultas**: Datos disponibles en tablas individuales (separadas) y combinadas (JOINs / relacionales).
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuración dinámica de CORS
env_origins = os.getenv("ALLOWED_ORIGINS", "")
origins_list = [origin.strip() for origin in env_origins.split(",") if origin.strip()]

# Orígenes por defecto para desarrollo frontend (React, Next.js, Vite, Vercel)
default_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
]

all_origins = list(set(origins_list + default_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=all_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Permite previews y producción en Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ImageUploadLimitMiddleware)

# Registrar Routers
app.include_router(auth.router)
app.include_router(roles.router)
app.include_router(refugios.router)
app.include_router(animales.router)
app.include_router(usuarios.router)
app.include_router(solicitudes.router)
app.include_router(favoritos.router)
app.include_router(consultas_juntas.router)
app.include_router(voluntariado.router)
app.include_router(imagenes.router)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    # No devolver `input`, `ctx` ni el cuerpo: pueden contener contraseñas.
    errors = [
        {"loc": list(error["loc"]), "type": error["type"], "msg": "Revisa este campo."}
        for error in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": errors})


@app.get("/", tags=["Estado de la API"])
def read_root():
    """Endpoint de verificación de estado y documentación de la API"""
    return {
        "estado": "En línea",
        "motor_bd": selected_db_type,
        "documentacion_swagger": "/docs",
        "documentacion_redoc": "/redoc",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
