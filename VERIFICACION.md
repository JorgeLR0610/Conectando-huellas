# Verificación de autenticación, permisos y voluntariado

## Pruebas automatizadas de API

La suite `backendUniendoHuellas/tests/test_app.py` utiliza SQLite en memoria y reemplaza la dependencia de sesiones; no modifica MySQL.

```bash
docker compose exec backend pip install -r requirements-dev.txt
docker compose exec backend python -m unittest discover -s tests -v
```

28 pruebas cubren:

- Registro de Usuario sin selección de rol, persistencia de ciudad con tildes y acceso a voluntariado desde la misma cuenta.
- Rechazo de roles privilegiados y campos adicionales en el registro público.
- Contraseña de 7/8 caracteres y límite de bcrypt en bytes UTF-8.
- Errores 422 sin contraseñas ni valores de entrada.
- Correo duplicado, credenciales incorrectas y token inválido.
- Compatibilidad con contraseñas SHA-256 existentes y mínimo de 8 al cambiarlas.
- API administrativa restringida y protección de datos personales.
- Propiedad de favoritos y solicitudes de los usuarios normales.
- Identificadores de las solicitudes detalladas.
- Creación, duplicados, aislamiento, aprobación y rechazo de voluntariado.
- Validación de refugio y modalidad.
- Catálogo, inventario completo y favoritos.
- Unificación de roles aplicada dos veces, preservando cuentas, hashes e historial de voluntariado.
- Aprovisionamiento local de administrador con bcrypt, acceso al panel y rechazo de correos existentes sin sobrescribir ni elevar sus roles.
- Recuperación del rol administrativo si falta en una instalación vacía.
- Prohibición de adopciones, favoritos y vistas personales para el personal.
- Urgencia explícita en catálogo, inventario, ficha y migración sin pérdida de animales.
- Subida opcional, formatos reales, límites de bytes/píxeles, conversión JPEG y eliminación de metadatos.
- Rechazo de cuerpo multipart sobredimensionado, archivos falsos, SVG, datos inválidos y accesos no autorizados.
- Limpieza de archivos ante fallo de BD, eliminación de mascotas y conservación de imágenes aún referenciadas.
- Imagen ilustrativa estable si no se carga foto y rechazo de rutas de archivo arbitrarias.

La ejecución actual pasa. Las dependencias instaladas emiten advertencias de deprecación de `httpx`/Starlette y de usos heredados de `datetime.utcnow`; no son fallos de la suite.

## Interfaz con MCP Playwright

Verificación contra los contenedores de producción en `http://localhost:3000`:

- Errores amigables para correo y contraseña; aceptación de 8 caracteres.
- Registro único, sin selector adoptante/voluntario, con ciudades fuera de las sugerencias.
- Rol y ubicación conservados al recargar e iniciar una nueva sesión.
- Ausencia de Google, Apple y accesos administrativos automáticos.
- Redirecciones de `/login`, `/registro` y `/admin` según sesión y rol.
- Menú móvil sin accesos de registro/login cuando hay sesión.
- Sesiones consecutivas sin recargar: formularios habilitados y vacíos después de salir.
- Nuevo registro después de cerrar sesión, sin conservar datos del usuario anterior.
- Perfil móvil sin recortar correos largos.
- Solicitud de acogida temporal, duplicado bloqueado, aprobación y rechazo administrativos y estado visible al voluntario sin consultar solicitudes ajenas.
- Inventario con animales adoptados y nuevo ingreso asignado al refugio seleccionado.
- Favoritos: alta, recarga y eliminación.
- Adopción: envío, seguimiento y enlace a la mascota correcta.
- Ficha inexistente sin mostrar mascotas ficticias.
- Encargado sin acceso a `/admin`, token inválido eliminado y perfil anónimo solicitando autenticación.
- Peticiones del navegador dirigidas al mismo origen `/api/...`.

La separación administrativa se comprobó con perfil sin trámites/favoritos ni consultas personales, redirección de rutas públicas al panel, filtros de urgencia combinados con búsqueda/estado y alta con imagen o respaldo. También se verificó quitar la selección, rechazar archivos corruptos y excesivos y conservar las funciones del usuario normal.

Se recreó el contenedor backend sin eliminar su volumen: la foto subida y la urgencia se conservaron. Después se eliminaron exclusivamente la cuenta y las mascotas temporales de QA; se comprobó que también se retiró su archivo y se mantuvieron las cuentas y los animales existentes.

Se utilizan cuentas y mascotas temporales de QA, no cambios de estado sobre las mascotas existentes.

## Compilación

```bash
cd uniendoHuellas
npm run lint -- --quiet
npx tsc --noEmit
```

La compilación de producción se valida al reconstruir el servicio:

```bash
docker compose up -d --build --no-deps frontend
```
