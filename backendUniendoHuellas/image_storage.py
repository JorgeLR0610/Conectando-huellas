"""Imágenes públicas de mascotas: contenido validado y nombres no controlados por el cliente."""
from io import BytesIO
import logging
import os
from pathlib import Path
import re
import secrets
from uuid import uuid4
import warnings
from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_UPLOAD_BODY_BYTES = 6 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000
IMAGE_PREFIX = "/api/imagenes/"
IMAGE_NAME = re.compile(r"[0-9a-f]{32}\.jpg")


class ImageUploadLimitMiddleware:
    """Limita también el cuerpo multipart en streaming antes de llenar archivos temporales."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("path") != "/api/animales/ingreso" or scope.get("method") != "POST":
            return await self.app(scope, receive, send)
        received = 0

        async def limited_receive():
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > MAX_UPLOAD_BODY_BYTES:
                    raise HTTPException(413, "La subida es demasiado grande. Selecciona una imagen de hasta 5 MB.")
            return message

        await self.app(scope, limited_receive, send)


def upload_directory() -> Path:
    return Path(os.getenv("UPLOAD_DIR", str(Path(__file__).parent / "uploads"))).resolve()


def fallback_photo(especie: str) -> str:
    species = especie.casefold()
    if "gat" in species:
        choices = ["photo-1514888286974-6c03e2ca1dba", "photo-1573865526739-10659fec78a5"]
    elif "perr" in species:
        choices = ["photo-1552053831-71594a27632d", "photo-1543466835-00a7907e9de1", "photo-1507146426996-ef05306b995a"]
    else:
        choices = ["photo-1548767797-d8c844163c4c"]
    return f"https://images.unsplash.com/{secrets.choice(choices)}?w=600"


def save_photo(upload: UploadFile) -> str:
    content = upload.file.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "La imagen debe pesar como máximo 5 MB.")
    if not content:
        raise HTTPException(422, "Selecciona una imagen que no esté vacía.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content), formats=["JPEG", "PNG", "WEBP"]) as source:
                if source.width * source.height > MAX_IMAGE_PIXELS:
                    raise HTTPException(422, "La imagen debe tener como máximo 20 megapíxeles.")
                if getattr(source, "is_animated", False):
                    raise HTTPException(422, "Selecciona una imagen estática, no animada.")
                source.verify()
            with Image.open(BytesIO(content), formats=["JPEG", "PNG", "WEBP"]) as source:
                image = ImageOps.exif_transpose(source).convert("RGB")
                image.thumbnail((1600, 1600))
                # Reencode sin EXIF/XMP ni metadatos privados del archivo original.
                image.info.clear()
                output = BytesIO()
                image.save(output, "JPEG", quality=85, optimize=True)
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError,
            Image.DecompressionBombWarning, Image.DecompressionBombError):
        raise HTTPException(422, "El archivo no es una imagen JPG, PNG o WebP válida.")
    directory = upload_directory()
    directory.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}.jpg"
    path = directory / filename
    created = False
    try:
        with path.open("xb") as handle:
            created = True
            handle.write(output.getvalue())
    except OSError:
        if created:
            path.unlink(missing_ok=True)
        raise HTTPException(503, "No pudimos guardar la imagen. Inténtalo de nuevo.")
    return IMAGE_PREFIX + filename


def remove_photo(url: str | None):
    if not url or not url.startswith(IMAGE_PREFIX):
        return
    filename = url[len(IMAGE_PREFIX):]
    if IMAGE_NAME.fullmatch(filename):
        try:
            (upload_directory() / filename).unlink(missing_ok=True)
        except OSError:
            logging.getLogger(__name__).warning("No se pudo retirar una imagen sin referencias.")
