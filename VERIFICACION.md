# Verificación funcional y preparación para revisión

## Iteración: gestión administrativa de refugios

- **Administración → Refugios** permite crear organizaciones sin cuentas nuevas,
  editar contacto y suspender/reactivar con confirmación. Busca sin tildes, filtra
  por estado e incluye conteo total de animales, también en refugios inactivos.
- Alta y edición validan campos obligatorios, espacios, límites, teléfono y estados
  tanto en cliente como en servidor. Los fallos conservan el formulario y permiten
  reintentar; la carga de refugios no depende del éxito de las solicitudes de adopción.
- Refugios activos disponibles en directorio y selector de Nuevo Ingreso. Suspender
  oculta el refugio/catálogo y bloquea nuevas solicitudes, ingresos y traslados,
  sin borrar animales ni historiales. Las fichas existentes siguen editables.
- Se retiró `/api/auth/register-refugio` (404); la creación de organizaciones es
  exclusiva del administrador. La API devuelve 409 al intentar borrar refugios con
  animales, usuarios o voluntariados; el panel no ofrece borrado.
- **46 pruebas de API correctas**, en un contenedor aislado con SQLite en memoria.
  Se incorporaron permisos, validaciones, alta sin usuarios, conservación de datos,
  suspensión/reactivación, restricciones de ingreso y cierre del alta pública.
- **56 pruebas E2E correctas**: 14 escenarios de perfil/refugios en las cuatro
  combinaciones de escritorio/móvil y claro/oscuro. Incluyen alta, edición,
  confirmación/cancelación, ingreso asociado, directorio, fallos/reintentos,
  filtro/búsqueda, acceso denegado a adoptantes y ausencia de errores de página.
- Recorrido adicional contra MySQL real: login del administrador existente,
  alta/edición de un refugio QA, ingreso de una mascota QA, suspensión, ocultación,
  bloqueo de borrado con mascota vinculada y reactivación. Se comprobó igualdad
  de refugios y animales con la instantánea anterior tras limpiar solo esos datos QA.
- Estado conservado tras la limpieza de cuentas solicitada anteriormente:
  **2 usuarios, 7 refugios, 30 animales; 0 solicitudes, favoritos y voluntariados**.
  No se cambiaron contraseñas ni el archivo privado de credenciales.
- Build/TypeScript correctos y lint sin errores (13 avisos de imágenes/fuentes).

Capturas locales, no versionadas:
`/tmp/opencode/huellas-shelter-admin-dark-desktop.png`,
`/tmp/opencode/huellas-shelter-admin-dark-mobile.png`.
Las siguientes secciones documentan verificaciones de iteraciones anteriores;
sus conteos de cuentas y solicitudes no describen la base actual.

## Iteración: favoritos y coherencia del perfil

- Se eliminó el botón absoluto que tapaba refugio y enlace. `PetCard` incorpora
  una sola acción de quitar, debajo del contenido y con nombre accesible por mascota.
  Espera confirmación del servidor, deshabilita dobles envíos y conserva la tarjeta
  con error visible cuando falla. El perfil no repite consultas de favorito por tarjeta.
- Secciones en URL (`?tab=favoritos|solicitudes|voluntariado`), conservadas al recargar.
  Las fichas vuelven al perfil de origen, el envío de adopción enlaza a solicitudes y
  los accesos de colaboración abren voluntariado. El login admite esos retornos locales.
- Errores de carga independientes de favoritos, adopciones y voluntariado; nunca
  muestran un historial vacío ni un formulario de voluntariado incompleto.
- **32 pruebas E2E correctas**: 8 escenarios × escritorio/móvil × claro/oscuro,
  contra el frontend de producción en 3001, con todas las llamadas API interceptadas.
  Comprueban geometría sin solapamiento, enlace no cubierto, ausencia de desbordamiento,
  eliminación pendiente/exitosa/fallida, reintentos independientes, navegación
  entre secciones, retorno desde ficha y postulación completa con enlace al historial.
  Cada prueba comprueba tema efectivo y ausencia de errores JavaScript de página.
- **39 pruebas de API correctas**, TypeScript y build de producción correctos;
  lint sin errores (13 avisos de imágenes/fuentes). `npm audit`: 0 vulnerabilidades
  tras actualizar dependencias transitivas compatibles, sin cambios mayores forzados.
- Se añadió `httpx2` a las dependencias de desarrollo para que `TestClient` funcione
  con Starlette reciente; se conserva `httpx` para versiones anteriores.
- No se modificaron cuentas, estados ni datos reales en esta iteración.
- También se inició sesión en la cuenta demo existente y se revisó su favorito
  real, sin eliminarlo. Capturas locales (no versionadas):
  `/tmp/opencode/huellas-profile-final-light-desktop.png` y
  `/tmp/opencode/huellas-profile-final-dark-mobile.png`.

Desde `uniendoHuellas/`, con el frontend actualizado ya ejecutándose:

```bash
npm ci
npx playwright install chromium
npm run test:e2e
```

`E2E_BASE_URL` permite otro origen. Configuración en `playwright.config.ts`;
escenarios en `tests/e2e/profile.spec.ts`. Trazas y capturas de fallos quedan
ignoradas por Git y Docker.

## Iteración: presentación, postulaciones y tema

- 39 pruebas de API correctas; build y TypeScript correctos. Lint sin errores,
  con 13 avisos de optimización de imágenes/fuentes.
- MySQL: simulación de actualización de presentación, aplicación de 107 cambios
  de campos y repetición con 0 cambios. Se retiraron etiquetas visibles de refugios,
  usuarios de muestra, historias y postulaciones, y se completaron las 5 direcciones.
  Las contraseñas de las 8 cuentas existentes coinciden con el respaldo previo.
- Las nuevas pruebas cubren respuestas obligatorias, rechazo de espacios/teléfonos
  inválidos, persistencia de campos separados y conservación del historial antiguo.
  También cubren repetibilidad de la limpieza y preservación de textos editados.
- Playwright: formulario inicialmente sin vivienda/experiencia/mensaje; errores
  junto a cada campo, conservación de respuestas tras corregir errores, envío
  correcto y detalles completos visibles al solicitante y al administrador.
- Modo oscuro del sistema en primera visita, elección clara explícita conservada
  tras recargar, navegación entre páginas sin perder tema y sincronización entre
  pestañas. Interruptor disponible también en administración.
- Se corrigió un bloqueo preexistente al deshabilitar almacenamiento local:
  el sitio público y el interruptor siguen funcionando sin errores JavaScript.
  Iniciar sesión requiere permitir almacenamiento; no se simula una sesión inválida.
- Búsquedas `Queretaro` y `Merida` encuentran ciudades con tilde. Los filtros
  sobreviven al enlace de vuelta desde la ficha y a la recarga.
- En 390×844, inicio, catálogo, refugios, información, login y registro se revisaron
  tanto en claro como en oscuro: 12 combinaciones sin desbordamiento horizontal.
  También se comprobaron administración y formulario en oscuro.
- Se utilizó una cuenta QA nueva y una sesión administrativa temporal; se eliminaron
  solo esa cuenta y su solicitud. Se conservó una postulación manual anterior que
  no pertenece a las semillas. No se modificaron contraseñas ni estados de mascotas.

Respaldo de esta iteración: `/tmp/opencode/huellas-before-theme.sql` (privado).
Capturas: `/tmp/opencode/huellas-dark-home.png`,
`/tmp/opencode/huellas-dark-shelters.png`,
`/tmp/opencode/huellas-dark-application-mobile.png`,
`/tmp/opencode/huellas-dark-catalog-mobile.png`,
`/tmp/opencode/huellas-dark-admin.png`.

## Pruebas automatizadas de API

La suite `backendUniendoHuellas/tests/test_app.py` utiliza SQLite en memoria y reemplaza la dependencia de sesiones; no modifica MySQL.

```bash
docker compose exec backend pip install -r requirements-dev.txt
docker compose exec backend python -m unittest discover -s tests -v
```

46 pruebas cubren:

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
- Adopción definitiva, cierre de solicitudes competidoras y prohibición de reabrir o eliminar resoluciones.
- Cancelación de pendientes, rechazo de duplicados y bloqueo de nuevas solicitudes en animales no disponibles.
- Notas internas ocultas en ficha de solicitud, historial personal y perfil completo.
- Salud persistente con valores verdadero, falso y desconocido; estados de adopción inválidos rechazados.
- Carga demo repetible sin sobrescribir ediciones, contraseñas ni cuentas, con rollback ante colisiones.
- Readiness con 503 sanitizado ante indisponibilidad de la BD.
- Gestión de refugios exclusiva de Admin, validación, preservación al suspender,
  reactivación, bloqueo de altas/traslados a inactivos y protección del borrado.
- Retirada del alta pública de refugio/encargado sin crear organizaciones ni cuentas.

La ejecución actual pasa. Las dependencias instaladas emiten advertencias de deprecación de `httpx`/Starlette y de usos heredados de `datetime.utcnow`; no son fallos de la suite.

## Iteración anterior: interfaz con MCP Playwright

La revisión de ampliación de datos se realizó contra los contenedores de producción en
`http://localhost:3001` (3000 pertenece a otro proyecto que se conservó funcionando).
En 1440×1000 y 390×844 se comprobó:

- Búsqueda sin resultados, limpieza de filtros, ciudades reales y navegación desde el directorio.
- Inicio de sesión desde una ficha y retorno a esa misma mascota.
- Alta, eliminación y nueva alta de favoritos. Se corrigió una carrera entre la
  consulta inicial y la actualización optimista que desincronizaba el corazón.
- Envío de postulación, edición administrativa de descripción y salud, lectura del
  mensaje completo y resolución mediante confirmación con respuesta pública.
- Aprobación de una solicitud y rechazo automático de la competidora; retirada
  del animal del catálogo y botón deshabilitado al volver a la ficha.
- Respuesta visible al solicitante sin enviar ni renderizar notas internas.
- Solicitud de voluntariado, aprobación desde el panel y estado visible al usuario.
- Redirección del administrador desde el catálogo hacia `/admin`.
- Diálogo móvil de 358 px, foco atrapado tras recorrerlo con Tab, Escape y
  restauración del foco al botón que lo abrió.
- Sin desbordamiento horizontal en inicio, catálogo, directorio, información y perfil.
- Simulación de 503 del catálogo: mensaje de error separado del estado vacío y
  recuperación mediante Reintentar. El error HTTP de consola fue el provocado;
  no se registraron errores JavaScript de página durante estos recorridos.
- Login real de `demo1@example.com` tras la carga.

Las acciones administrativas se probaron con una sesión temporal firmada localmente
para el administrador existente; no se cambió su contraseña ni se creó un administrador
predeterminado. El login normal sí se realizó mediante el formulario.

Capturas locales de esta ejecución (no versionadas):
`/tmp/opencode/huellas-catalogo-mobile.png`,
`/tmp/opencode/huellas-admin-mobile.png`,
`/tmp/opencode/huellas-refugios-desktop.png`.

### MySQL y datos

- Dos aprobaciones simultáneas devolvieron 200 y 409; quedó una aprobada y una
  rechazada. No solo se comprobó sobre SQLite.
- Carga en MySQL existente: simulación, aplicación y repetición sin nuevos registros.
- Arranque limpio verificado en otro proyecto Compose aislado, sin puertos publicados:
  esquema SQL, migraciones repetidas, readiness, carga y repetición sin duplicados,
  y ausencia de administrador automático. Ese entorno de prueba se eliminó después.
- Se eliminaron solo los 2 animales y 2 usuarios temporales del recorrido de navegador,
  junto con sus solicitudes, voluntariado y favorito.
- Estado al terminar aquella iteración: 7 refugios, 30 animales (24 disponibles, 4 en proceso y 2 adoptados),
  8 cuentas, 10 solicitudes de adopción, 6 favoritos y 6 solicitudes de voluntariado.
  Las 2 cuentas y los 5 animales originales se conservaron.
  Posteriormente se conservó una solicitud manual adicional: entonces el total fue 11,
  sin alterar ni eliminar ese registro para igualar los conteos de la semilla.
- Respaldo previo a la ampliación: `/tmp/opencode/huellas-backup-before-demo.sql`,
  con permisos privados; contiene datos sensibles y no se versiona.

## Verificaciones de entregas anteriores

Los siguientes puntos fueron comprobados previamente en `http://localhost:3000`:

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

Resultado de esta entrega: TypeScript sin errores, lint sin errores (13 avisos
de optimización de imágenes/fuentes) y build de producción correcto. Las
dependencias Python emiten avisos de deprecación ya indicados, sin fallos.

```bash
cd uniendoHuellas
npm run lint -- --quiet
npx tsc --noEmit
```

La compilación de producción se valida al reconstruir el servicio:

```bash
docker compose up -d --build --no-deps frontend
```
