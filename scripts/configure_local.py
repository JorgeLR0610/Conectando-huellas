"""Crea configuración privada sin sobrescribir secretos existentes."""
import argparse
import os
from pathlib import Path
import secrets

parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, default=3000)
args = parser.parse_args()
if not 1024 <= args.port <= 65535:
    parser.error("El puerto debe estar entre 1024 y 65535.")
path = Path(__file__).resolve().parents[1] / ".env"
try:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
except FileExistsError:
    print("Se conserva .env existente. Ajusta FRONTEND_PORT allí si hace falta.")
else:
    with os.fdopen(fd, "w") as file:
        file.write(f"JWT_SECRET={secrets.token_urlsafe(48)}\nFRONTEND_PORT={args.port}\n")
    print(f"Configuración privada creada para http://localhost:{args.port}")
