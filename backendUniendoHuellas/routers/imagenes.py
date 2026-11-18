from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from image_storage import IMAGE_NAME, upload_directory

router = APIRouter(prefix="/api/imagenes", tags=["Imágenes de mascotas"])


@router.get("/{filename}")
def imagen(filename: str):
    if not IMAGE_NAME.fullmatch(filename):
        raise HTTPException(404, "Imagen no encontrada.")
    path = upload_directory() / filename
    if not path.is_file() or path.is_symlink():
        raise HTTPException(404, "Imagen no encontrada.")
    return FileResponse(path, media_type="image/jpeg", headers={
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=86400, immutable",
    })
