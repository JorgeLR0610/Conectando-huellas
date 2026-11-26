# Revisión funcional y datos de demostración

## Arranque conservando los datos

Desde `Conectando-huellas/`:

```bash
python3 scripts/configure_local.py --port 3001
docker compose up -d --build
docker compose ps
curl -f http://localhost:3001/api/health
```

El puerto predeterminado es 3000; `--port 3001` evita interferir con otro proyecto.
Si `.env` ya existe, el script lo conserva. Ajusta allí `FRONTEND_PORT`.
Las migraciones son aditivas; conservan cuentas, contraseñas, solicitudes e imágenes.
No hace falta eliminar volúmenes. Guarda copias de MySQL y del volumen de imágenes
antes de intervenir una instalación con información importante.

Los `.env`, SQLite y bytecode quedan fuera de Git. Si secretos antiguos llegaron
al historial, quitarlos del índice no borra ese historial: rótalos antes de publicar.
Compose sigue siendo una configuración de desarrollo local (MySQL root/root).
No exponerla en Internet sin usuarios de BD de mínimo privilegio, secretos propios,
HTTPS, revisión legal y una estrategia de respaldo.

## Población opcional, sin duplicados

```bash
docker compose exec backend python seed_demo.py --dry-run
docker compose exec backend python seed_demo.py
```

La contraseña se pide sin eco. También se admite `DEMO_PASSWORD` por entorno
para automatización. Nunca se crea un administrador ni se cambia una cuenta existente.
La segunda ejecución devuelve `"nuevos": {}`; tampoco restablece contraseñas ni
revierte ediciones realizadas desde el panel. Los textos de muestra originales
se actualizan de forma conservadora para quitar etiquetas y completar direcciones.

La carga crea:

| Tabla | Registros nuevos |
|---|---:|
| Refugios | 5 |
| Usuarios normales | 6 |
| Animales | 25 |
| Solicitudes de adopción | 10 |
| Favoritos | 6 |
| Solicitudes de voluntariado | 6 |

Los correos son `demo1@example.com` a `demo6@example.com`, con la contraseña que
elegiste en la primera carga. Datos de contacto e historias son ficticios; no
contactarlos. Las fotos son ilustrativas y dependen de acceso a Unsplash.
`demo_registros` mantiene las identidades sin depender de IDs fijos ni coincidencias
de nombres. Una colisión con un correo existente aborta la transacción; un registro
demo borrado no se recrea silenciosamente. La simulación revierte los inserts, pero
MySQL puede consumir números autoincrementales: los IDs no tienen que ser consecutivos.
Las migraciones y creación de tablas no forman parte del rollback de la simulación.

Para actualizar únicamente la presentación de una carga anterior, sin crear
registros ni introducir contraseñas:

```bash
docker compose exec backend python seed_demo.py --refresh-presentation --dry-run
docker compose exec backend python seed_demo.py --refresh-presentation
```

Solo afecta a registros identificados internamente por `demo_registros`. Quita
prefijos antiguos de muestra y sustituye direcciones/mensajes que coincidan
exactamente con los originales; conserva textos editados, cuentas, hashes y estados.
Los nombres ya no llevan etiquetas visibles, pero el aviso educativo de
`/informacion` sigue aclarando que direcciones e historias son ficticias.

## Tema y postulaciones

- El interruptor de la cabecera alterna claro/oscuro, incluido el panel administrativo.
  La primera visita sigue al sistema; la elección se guarda en `huellas_theme`.
  Se conservan preferencias al salir de la sesión y se sincronizan entre pestañas.
- La búsqueda ignora tildes y conserva los filtros en la URL. El enlace de vuelta
  desde una ficha recupera esa búsqueda.
- Las postulaciones nuevas exigen `tipo_vivienda`, `experiencia` (`si`/`no`),
  `telefono_contacto` (7–15 dígitos) y `mensaje` propio (30–3000 caracteres).
  No se seleccionan vivienda ni experiencia por defecto. El mensaje arranca vacío.
  La API rechaza campos ausentes o espacios y almacena los datos por separado.
  El historial previo permanece legible con sus campos nuevos en NULL.

## Recorrido para presentar

1. Inicio: conteos actuales, búsqueda por especie, ciudad y edad.
2. Catálogo: combinar filtros, probar una búsqueda sin resultados y limpiar filtros.
3. Directorio: buscar refugios por ciudad y consultar el contacto registrado.
4. Iniciar sesión como usuario demo. Guardar una mascota y verla en Mi Perfil.
5. En una mascota disponible sin solicitud propia, abrir y enviar una postulación.
6. Entrar con el administrador ya aprovisionado, abrir Postulaciones y leer el
   mensaje completo. Aprobar o rechazar con respuesta pública y notas internas.
7. Volver al usuario: comprobar resolución en Mi Perfil. Las notas internas no
   se envían a sus endpoints. Aprobar una adopción cierra las competidoras con
   una respuesta explicativa y retira el animal del catálogo disponible.
8. En Inventario, editar descripción, estado y salud. Sin confirmar no es lo mismo
   que tratamiento pendiente. No se permite reabrir una adopción aprobada.
9. En Mi voluntariado, enviar una colaboración y resolverla desde el panel.
10. Repetir en móvil y comprobar Escape, Tab y cierre de los diálogos.

El perfil permite enlaces directos: `/perfil?tab=favoritos`,
`/perfil?tab=solicitudes` y `/perfil?tab=voluntariado`. La ficha vuelve a la sección
de origen y el éxito de adopción abre el historial. Quitar un favorito usa una
acción separada, debajo del refugio/enlace; solo retira la tarjeta al confirmar
el servidor. Los fallos de carga se muestran por sección, nunca como listas vacías.

No hay agenda, notificaciones por correo/WhatsApp, pagos ni recuperación automática
de contraseña. Los botones y textos no deben prometer estas funciones. La resolución
se consulta en el perfil; las visitas se coordinan por teléfono directamente.
`/informacion` explica el alcance educativo y los datos tratados, sin presentarse
como un aviso legal validado.

## Verificación automatizada

```bash
docker compose exec backend pip install -r requirements-dev.txt
docker compose exec backend python -m unittest discover -s tests -v
```

La suite usa SQLite en memoria, no la base activa. Comprueba permisos, archivos,
migraciones, salud nullable, privacidad, transiciones de adopción, cierre de
competidoras, colisiones y repetibilidad de la carga. No prueba bloqueos de MySQL;
estos requieren integración real.

Para comprobar la carrera con dos aprobaciones simultáneas sobre la instalación
local (solicita las credenciales del administrador sin guardarlas):

```bash
python3 scripts/verify_mysql_race.py --base-url http://localhost:3001
```

La prueba exige MySQL y limpia exclusivamente las cuentas y el animal QA que crea.

Desde `uniendoHuellas/`:

```bash
npm ci
npm run lint
npx tsc --noEmit
npm run build
npx playwright install chromium
npm run test:e2e
```

Las pruebas E2E requieren el frontend actualizado en `http://localhost:3001`;
para otro puerto: `E2E_BASE_URL=http://localhost:PUERTO npm run test:e2e`.
Son 8 escenarios en 4 combinaciones de viewport/tema (32 pruebas). Interceptan
todas las peticiones API con datos aislados y no escriben en la base activa.
Comprueban geometría sin superposición, enlaces usables, eliminación confirmada,
fallos y reintentos independientes, conservación de sección y envío de postulación.

El build de Docker también compila el frontend de producción. El contenedor final
no contiene todos los archivos fuente necesarios para recompilarlo con `exec`;
usa `docker compose build frontend` o el comando local anterior.
