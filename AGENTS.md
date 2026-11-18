# 🤖 AGENTS.md — Guía Técnica para Agentes de IA y LLMs

> **Propósito de este archivo**: Este documento provee contexto técnico de alta densidad, reglas operativas obligatorias, mapa de arquitectura y patrones de código para agentes autónomos de IA (y desarrolladores) que interactúan con el repositorio **Uniendo Huellas**.
>
> ⚠️ **REGLA FUNDAMENTAL PARA AGENTES**: Lee este archivo antes de realizar cualquier cambio en el backend, frontend, base de datos o configuración de contenedores. No violes los guardrails técnicos aquí establecidos.

---

## 1. Contexto Operativo y Misión del Sistema

**Uniendo Huellas** es una plataforma web monolítica desacoplada para la adopción ética de mascotas rescatadas.
- **Frontend**: Aplicación cliente en **Next.js 16.4.6** (App Router, React 19, Tailwind CSS v4, Lucide Icons).
- **Backend**: API RESTful en **FastAPI** (Python 3.12, SQLAlchemy 2.0, PyMySQL, JWT Bearer HS256).
- **Base de Datos**: **MySQL 8.0** (`adopciones_db`) ejecutándose con codificación estricta `utf8mb4`.
- **Orquestación**: **Docker Compose v2** en la red interna aislada `uniendo-net`.

```
[ Navegador Web ]
       │
       │ HTTP :3000
       ▼
[ uniendo_frontend (Next.js 16.4.6) ]
       │
       │ Next.js Rewrites (/api/* ──> http://backend:8000/api/*)
       ▼
[ uniendo_backend (FastAPI / Python 3.12) ]
       │
       │ PyMySQL (charset=utf8mb4) :3306
       ▼
[ uniendo_db (MySQL 8.0 / adopciones_db) ]
```

---

## 2. Mapa del Repositorio y Matriz de Responsabilidades

```text
/home/jorge/Documents/programacion_web/
├── docker-compose.yml              # Orquestador multi-contenedor (db, backend, frontend)
├── README.md                       # Documentación principal para humanos y desarrolladores
├── AGENTS.md                       # ESTE ARCHIVO: Reglas técnicas para agentes autónomos
│
├── backendUniendoHuellas/          # Microservicio Backend (FastAPI)
│   ├── Dockerfile                  # Contenedor Python 3.12-slim
│   ├── requirements.txt            # Dependencias: fastapi, uvicorn, sqlalchemy, pymysql, etc.
│   ├── main.py                     # Entrypoint de FastAPI, configuración de CORS y enrutadores
│   ├── database.py                 # Conexión SQLAlchemy con engine utf8mb4 y fallback SQLite
│   ├── models.py                   # Modelos ORM (nombres de tabla en minúsculas)
│   ├── schemas.py                  # Esquemas Pydantic v2 para validación de requests/responses
│   ├── auth.py                     # Generación/validación de JWT y hashing de contraseñas
│   ├── migrations.py               # Migración aditiva idempotente para instalaciones existentes
│   ├── routers/                    # Endpoints modulares de la API
│   │   ├── auth.py                 # Registro, login, /me
│   │   ├── animales.py             # CRUD y consultas de mascotas
│   │   ├── refugios.py             # CRUD y listados de albergues
│   │   ├── usuarios.py             # CRUD de usuarios y asignación de roles
│   │   ├── solicitudes.py          # Flujo de adopción (creación, cambio de estado)
│   │   ├── favoritos.py            # Toggle y verificación de mascotas favoritas
│   │   ├── roles.py                # CRUD de roles de sistema
│   │   ├── voluntariado.py         # Solicitudes de colaboración propias y revisión por administradores
│   │   └── consultas_juntas.py     # Endpoints agregados (catálogo, dashboard, directorio)
│   └── schema_mysql_workbench.sql  # Script DDL/DML inicial de base de datos
│
└── uniendoHuellas/                 # Microservicio Frontend (Next.js)
    ├── Dockerfile                  # Contenedor Node 20-alpine (construcción y servidor Next)
    ├── package.json                # Next.js 16.4.6, React 19.3.0, Tailwind v4
    ├── next.config.ts              # Configuración crítica: rewrites /api/* y cacheComponents
    ├── app/                        # Next.js App Router
    │   ├── layout.tsx              # Root layout con AuthProvider y Navbar/Footer
    │   ├── page.tsx                # Landing page principal
    │   ├── login/page.tsx          # Pantalla de inicio de sesión
    │   ├── registro/page.tsx       # Registro público de adoptantes
    │   ├── mascotas/page.tsx       # Catálogo público con filtros combinados
    │   ├── mascotas/[id]/page.tsx  # Ficha de mascota (con generateStaticParams y Suspense)
    │   ├── refugios/page.tsx       # Directorio de refugios
    │   ├── adoptar/[id]/page.tsx   # Formulario de solicitud de adopción
    │   ├── favoritos/page.tsx      # Galería de mascotas favoritas del adoptante
    │   ├── solicitudes/page.tsx    # Historial de solicitudes del usuario
    │   ├── admin/page.tsx          # Panel administrativo / refugio
    │   └── perfil/page.tsx         # Gestión del perfil de usuario
    ├── components/                 # Componentes UI reutilizables (Navbar, Footer, PetCard, etc.)
    ├── context/                    # Estado global de React
    │   └── AuthContext.tsx         # Contexto de autenticación, almacenamiento en localStorage
    └── lib/                        # Capa de utilidades y datos
        ├── api.ts                  # Cliente fetch para consumir endpoints de /api/*
        └── adapters.ts             # Transformadores de datos: BackendAnimal -> Pet
```

---

## 3. Guardrails Técnicos Obligatorios

### 3.1. Frontend: Next.js 16 + React 19 + Turbopack

> [!CAUTION]
> **NEXT.JS 16 CONTIENE REGLAS ESTRICTAS DE CACHÉ Y PRERENDERIZADO:**
> 1. `cacheComponents: true` está habilitado en `next.config.ts`.
> 2. **NUNCA** coloques `export const dynamic = 'force-dynamic'` en páginas o componentes cuando `cacheComponents` esté activo. Esto provoca un error fatal durante la compilación de Turbopack:
>    ```
>    Route segment config "dynamic" is not compatible with nextConfig.cacheComponents.
>    ```
> 3. En páginas dinámicas con parámetros de ruta (ejemplo: `app/mascotas/[id]/page.tsx`), **SIEMPRE** debes:
>    - Exportar `generateStaticParams()` devolviendo al menos IDs semilla de muestra (ej. `[{ id: '1' }, { id: '2' }]`).
>    - Envolver la lectura asíncrona de `params` o componentes que usen `useSearchParams()` dentro de `<Suspense fallback={...}>`.
> 4. **No uses llamadas directas a `http://localhost:8000` en el código del frontend**:
>    - Todas las llamadas deben apuntar a la ruta relativa `/api/...` (ejemplo: `apiClient.get('/api/consultas-juntas/catalogo')`).
>    - El archivo `next.config.ts` se encarga de proxificar `/api/:path*` hacia `${INTERNAL_API_URL || 'http://backend:8000'}/api/:path*`.
>    - Esto evita por completo problemas de CORS y diferencias de host entre el navegador del usuario y el contenedor de Docker.

### 3.2. Transformación de Datos Obligatoria (`lib/adapters.ts`)

> [!IMPORTANT]
> Las interfaces del frontend y los esquemas del backend tienen discrepancias de nomenclatura históricas:
> - El Backend devuelve objetos en español con campos de base de datos (`id_animal`, `nombre`, `especie`, `tamano`, `edad_anios`, `descripcion_personalidad`, `estado_adopcion`, etc.).
> - Los componentes de la UI esperan el tipo `Pet` definido en `components/PetCard.tsx` (`id`, `name`, `breed`, `size`, `age`, `shelter`, `urgent`, `tags`, etc.).
>
> **REGLA**: Todo consumo de endpoints que retorne animales (`/api/animales`, `/api/consultas-juntas/catalogo`, `/api/favoritos/relacion/mis-favoritos`) **DEBE** pasar invariablemente por las funciones de `lib/adapters.ts`:
> ```typescript
> import { backendAnimalToPet, backendListToPets } from '@/lib/adapters';
>
> const res = await apiClient.get('/api/consultas-juntas/catalogo');
> const pets: Pet[] = backendListToPets(res.data);
> ```
> Si agregas un nuevo campo a la tabla `animales`, actualiza:
> 1. `backendUniendoHuellas/models.py`
> 2. `backendUniendoHuellas/schemas.py`
> 3. `uniendoHuellas/lib/adapters.ts`

### 3.3. Backend: FastAPI + SQLAlchemy 2.0

1. **Nombres de Tablas Estrictamente en Minúsculas**:
   - En sistemas Linux, MySQL es sensible a mayúsculas y minúsculas (`lower_case_table_names=0`).
   - Los modelos de SQLAlchemy en `models.py` deben usar exclusivamente nombres en minúsculas:
     - `roles`
     - `refugios`
     - `usuarios`
     - `animales`
     - `solicitudes_adopcion`
     - `favoritos`
     - `solicitudes_voluntariado`
   - **NUNCA** uses nombres como `Refugios` o `Animales` en `__tablename__`.

2. **Doble Esquema de Hash de Contraseñas (`auth.py`)**:
   - La función `verify_password(plain_password, hashed_password)` admite tanto **Bcrypt** estándar como **SHA-256 en hexadecimal (64 caracteres)**.
   - Esto es obligatorio para permitir que las semillas iniciales generadas por SQL funcionen de inmediato sin requerir migración de contraseñas.
   - Los registros nuevos usan Bcrypt mediante `hash_password(...)`; exigen al menos 8 caracteres y hasta 72 bytes UTF-8. No aplicar el mínimo al login de cuentas existentes.

3. **Inyección de Dependencias de Seguridad**:
   - `get_current_user`: Retorna el objeto `Usuario` autenticado o lanza HTTP 401.
   - `require_refugio_or_admin`: Permite acceso a administradores (`id_rol == 1`) y encargados de refugio (`id_rol == 2`).
   - `require_admin`: Restringe acceso únicamente a administradores (`id_rol == 1`).

### 3.4. Base de Datos: MySQL 8.0 y Regla de Codificación UTF-8

> [!WARNING]
> **REGLA DE ORO DE CODIFICACIÓN UTF-8 (Tildes y Letra Ñ)**:
> Para evitar errores de *mojibake* (ej. `aÃ±os`, `PequeÃ±o`):
> 1. La base de datos y sus tablas deben crearse siempre con `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`.
> 2. El comando del servicio `db` en `docker-compose.yml` debe mantener los flags:
>    `--character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci`
> 3. El script de semillas `schema_mysql_workbench.sql` debe incluir `SET NAMES utf8mb4;` al inicio.
> 4. La cadena de conexión en PyMySQL debe incluir siempre `?charset=utf8mb4`.
> 5. Todo archivo SQL o JSON de prueba debe guardarse en codificación **UTF-8 sin BOM**.

---

## 4. Flujo de Autenticación y Manejo de Sesiones

```
Cliente Web                        Next.js (/api)                  FastAPI (/api/auth)
     │                                    │                                 │
     │ 1. POST /login (email, password)   │                                 │
     ├───────────────────────────────────>│ (Rewrite transparente)          │
     │                                    ├────────────────────────────────>│
     │                                    │                                 │ 2. verify_password()
     │                                    │                                 │ 3. Genera JWT (HS256)
     │                                    │<────────────────────────────────┤
     │<───────────────────────────────────┤ Retorna { access_token, usuario, rol }
     │
     │ 4. Almacena en localStorage:
     │    - auth_token = access_token
     │    - auth_role  = rol.nombre
     │    - auth_user  = JSON.stringify(usuario)
     │
     │ 5. Siguientes peticiones con cabecera:
     │    Authorization: Bearer <auth_token>
     ▼
```

### Tokens y Roles:
- Duración del token JWT: **1440 minutos (24 horas)**.
- Algoritmo: **HS256** firmado con `SECRET_KEY` de variables de entorno.
- Llaves en `localStorage`:
  - `auth_token`: string JWT crudo.
  - `auth_role`: `"Administrador"`, `"Refugio / Encargado"` o `"Usuario"`.
  - `auth_user`: objeto serializado del usuario.

La autorización siempre usa el usuario validado por el backend, no los datos de `localStorage`.
`/admin` y sus enlaces son exclusivos de `id_rol == 1`, no del encargado de refugio.
El registro público no acepta `tipo_cuenta` ni `id_rol`: siempre crea un Usuario (rol 3).
`usuarios.ciudad` conserva cualquier ciudad o región; no limitarla a sugerencias.
Cualquier Usuario dispone de **Mi voluntariado** en `/perfil`, además de adopciones y favoritos.
`migrations.py` reasigna las cuentas antiguas del rol 4 al 3 y elimina únicamente el rol obsoleto; conserva cuentas, contraseñas e historiales. Nunca borrar el volumen para aplicar migraciones.
No reintroducir el rol 4 ni el selector adoptante/voluntario.
El administrador se aprovisiona localmente con `provision_admin.py`; no hay contraseña administrativa predeterminada ni alta automática al arrancar. Nunca guardar sus credenciales en archivos del repositorio ni sobrescribir cuentas existentes.
Los errores de validación no deben serializar `input`, `ctx` ni contraseñas.
El administrador autenticado solo navega en `/admin` y `/perfil`; `AdminRouteBoundary` protege las vistas públicas (nunca envolver el LayoutRouter raíz, para no bloquear su hidratación). Su perfil no consulta favoritos ni solicitudes personales.
Solo `require_usuario` (rol 3) permite crear adopciones/favoritos y usar vistas personales. Las consultas administrativas conservan sus dependencias de personal.
La urgencia es `animales.es_urgente`, nunca una inferencia del texto o de `en_proceso`. Actualizar modelos, esquemas y adaptadores juntos.
`POST /api/animales/ingreso` es un alta administrativa multipart (`datos` JSON serializado, `foto` opcional). El cliente no debe imponer `Content-Type: application/json` a FormData.
Las fotos se validan/reencodifican con Pillow, se sirven por `/api/imagenes` y viven en el volumen `animal_images` (`UPLOAD_DIR=/app/uploads`), no en la imagen del contenedor ni en Git. No borrar ese volumen para desplegar cambios.

---

## 5. Cuentas de Prueba Preconfiguradas (Credenciales de Desarrollo)

| Rol | Correo Electrónico | Contraseña | ID Rol | ID Refugio Asociado |
|---|---|---|---|---|
| **Administrador** | Aprovisionar con `provision_admin.py` | Sin valor predeterminado | `1` | `None` (Acceso total) |
| **Encargado de Refugio** | `maria@huellitasconamor.org` | `refugio123` | `2` | `1` (Huellitas con Amor) |
| **Usuario** | `jesus@ejemplo.com` | `adoptante123` | `3` | `None` |

---

## 6. CLI Operational Runbook (Comandos Esenciales para Agentes)

### 6.1. Operación de Contenedores con Docker Compose

```bash
# Verificar estado y salud de los contenedores
docker compose ps

# Ver logs de un servicio específico en tiempo real
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# Reiniciar un único servicio sin afectar a los demás
docker compose restart backend
docker compose restart frontend

# Reconstruir un servicio tras editar Dockerfile o package.json/requirements.txt
docker compose up -d --build backend
docker compose up -d --build frontend

# Parada limpia y purga de volumen de BD (reinicio total a estado virgen)
docker compose down -v
docker compose up -d --build
```

### 6.2. Consultas Directas a la Base de Datos

```bash
# Ejecutar consulta SQL rápida contra el contenedor MySQL
docker compose exec db mysql -u root -proot adopciones_db -e "SELECT id_animal, nombre, especie, estado_adopcion FROM animales LIMIT 5;"

# Verificar codificación de la base de datos
docker compose exec db mysql -u root -proot adopciones_db -e "SHOW VARIABLES LIKE 'character_set_database';"

# Verificar usuarios y roles activos
docker compose exec db mysql -u root -proot adopciones_db -e "SELECT id_usuario, nombre_completo, correo, id_rol FROM usuarios;"
```

### 6.3. Verificación de Endpoints mediante `curl`

```bash
# 1. Comprobar que FastAPI responde (Healthcheck)
curl -s http://localhost:8000/ | grep "En línea"

# 2. Comprobar que Next.js responde código 200
curl -sI http://localhost:3000/ | grep "HTTP/1.1 200 OK"

# 3. Iniciar sesión vía API con credenciales introducidas interactivamente
TOKEN=$(python3 -c 'import json,getpass,sys; print("Correo: ",file=sys.stderr,end=""); correo=input(); print(json.dumps({"correo":correo, "password":getpass.getpass("Contraseña: ")}))' \
  | curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  --data-binary @- \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

# 4. Probar endpoint protegido usando el token obtenido
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/auth/me
```

### 6.4. Verificación de Compilación del Frontend (Build Check)

Si agregas o modificas páginas en `uniendoHuellas/app/`, ejecuta siempre una prueba de compilación para garantizar que no rompiste el App Router ni Turbopack:

```bash
docker compose exec frontend npm run build
```

---

## 7. Anti-Patrones y Errores Comunes (Gotchas)

| Anti-Patrón | Causa | Solución Correcta |
|---|---|---|
| Usar `dynamic = 'force-dynamic'` | Incompatible con `cacheComponents` en Next.js 16 | Usar `generateStaticParams()` y envolver componentes en `<Suspense>`. |
| Peticiones directas a `localhost:8000` en fetch | Falla en cliente móvil o entornos Docker no locales | Usar siempre ruta relativa `/api/...` para aprovechar el proxy de Next.js. |
| Olvidar llamar a `backendAnimalToPet()` | La UI rompe con `undefined` en campos como `shelter` o `breed` | Mapear siempre arrays del backend con `backendListToPets(res.data)`. |
| Nombres de tabla en mayúsculas en `models.py` | Falla en Linux MySQL (`Table 'adopciones_db.Animales' doesn't exist`) | Declarar siempre `__tablename__ = "animales"` en minúsculas. |
| Inserciones SQL con tildes dañadas | Falta de flag de juego de caracteres | Asegurarse de que el script contenga `SET NAMES utf8mb4;` al inicio. |
| Hardcodear URLs de producción | Rompe portabilidad entre local, CI/CD y nube | Frontend con rutas relativas `/api/...`, proxy con `INTERNAL_API_URL` y BD con `DATABASE_URL`. |
| Usar llamadas bloqueantes de IO en rutas async de FastAPI | Degrada el event loop de Python | Usar SQLAlchemy 2.0 sessions correctamente cerradas en `Depends(get_db)`. |

---

## 8. Protocolo de Pruebas y Validación antes de Entregar Cambios

Antes de reportar una tarea como completada, el agente debe verificar:
1. `docker compose ps`: Los 3 contenedores deben estar en estado `Up` y `uniendo_db` en `healthy`.
2. `curl -s http://localhost:8000/api/consultas-juntas/catalogo`: Debe retornar la lista JSON de animales en UTF-8 válido (verificar que no haya caracteres como `Ã±`).
3. `curl -sI http://localhost:3000/mascotas`: Debe devolver `200 OK`.
4. Si se modificaron archivos TypeScript, verificar que `npm run build` o el log de Next.js no presente errores de compilación (`docker compose logs --tail=50 frontend`).
