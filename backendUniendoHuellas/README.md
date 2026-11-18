# 🐾 Backend — Plataforma de Adopción de Mascotas (Uniendo Huellas)

Backend RESTful desarrollado en **FastAPI** con **SQLAlchemy 2.0**, **PyMySQL**, **Pydantic v2**, autenticación por **JWT (Bearer HS256)**, control de acceso basado en roles (RBAC) y soporte de almacenamiento para **MySQL 8.0** con respaldo automático a **SQLite**.

---

## 🚀 Cómo Iniciar el Servidor

### Opción 1: Con Docker Compose (Recomendado)
Desde la raíz del repositorio (`programacion_web`):

```bash
# Levantar la base de datos MySQL y el servicio de FastAPI
docker compose up -d db backend

# Ver los logs del backend en tiempo real
docker compose logs -f backend
```

- **API Base**: [http://localhost:8000](http://localhost:8000)
- **Documentación Interactiva (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Documentación Alternativa (ReDoc)**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### Opción 2: Ejecución Local en Entorno Virtual (Standalone)

1. **Crear y activar el entorno virtual de Python (3.11+)**:
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```

2. **Instalar dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Ejecutar el servidor con Uvicorn**:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

---

## 🗄️ Conexión con Base de Datos (MySQL / SQLite)

En el archivo [`.env`](.env) se configura la conexión a la base de datos:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=adopciones_db
DATABASE_URL=mysql+pymysql://root:root@localhost:3306/adopciones_db?charset=utf8mb4
USE_SQLITE_FALLBACK=true
```

> [!NOTE]
> - **Inicialización Automática**: El script [`schema_mysql_workbench.sql`](schema_mysql_workbench.sql) contiene la estructura DDL y los registros semilla iniciales con codificación estricta `utf8mb4`.
> - **Fallback a SQLite**: Si MySQL no está disponible, el sistema conmuta automáticamente a la base de datos local SQLite (`adopciones.db`) para no interrumpir el desarrollo.

---

## 🔐 Autenticación y Roles

El backend implementa autenticación basada en **JSON Web Tokens (JWT)** con 3 roles jerárquicos:

| ID Rol | Nombre del Rol | Descripción |
|---|---|---|
| **1** | `Administrador` | Acceso total: gestión de roles, todos los refugios, usuarios y métricas globales. |
| **2** | `Refugio / Encargado` | Vinculado a un `id_refugio`. Puede dar de alta sus animales, editar sus datos y aprobar/rechazar solicitudes. |
| **3** | `Usuario` | Catálogo, favoritos, solicitudes de adopción y voluntariado desde la misma cuenta. |

El administrador usa `/admin` y `/perfil`, sin autoservicio de adopción o favoritos. El encargado conserva su gestión por API únicamente para su refugio; no tiene un panel propio ni acceso a `/admin`.

### Imágenes y urgencia

`animales.es_urgente` es un booleano explícito, no una inferencia de la descripción. Se añade de forma idempotente con valor falso para animales existentes.

`POST /api/animales/ingreso` requiere administrador y recibe multipart con `datos` (AnimalCreate serializado en JSON) y `foto` opcional. Imágenes JPG/PNG/WebP de hasta 5 MB y 20 megapíxeles se verifican y convierten a JPEG sin metadatos. El volumen `animal_images` conserva `/app/uploads`; localmente puede configurarse `UPLOAD_DIR`. `GET /api/imagenes/{nombre}` expone únicamente imágenes generadas con nombres UUID, nunca rutas arbitrarias.

### Cuentas de Prueba Preconfiguradas:
- **Admin**: sin cuenta ni contraseña predeterminadas. Crear con `python provision_admin.py --correo admin@example.com --nombre "Administrador" --telefono 0000000000`; solicita una contraseña de forma oculta. Con `--generate-password` genera una aleatoria y la muestra al crear la cuenta. Nunca sobrescribe ni promueve cuentas existentes.
- **Encargado de Refugio**: `maria@huellitasconamor.org` / Contraseña: `refugio123`
- **Usuario**: `jesus@ejemplo.com` / Contraseña: `adoptante123`

---

## 📋 Resumen de Endpoints Disponibles

### 1. Autenticación y Registro (`/api/auth`)
- `POST /api/auth/register`: Registro público de usuarios, sin selección de rol. No acepta `id_rol` ni `tipo_cuenta`.
- `POST /api/auth/register-refugio`: Alta simultánea de la casa de adopción (`Refugios`) y su usuario encargado (`Usuarios`).
- `POST /api/auth/login`: Inicio de sesión (retorna Token JWT + datos del usuario y rol).
- `GET /api/auth/me`: Perfil del usuario actualmente autenticado.

### 2. Consultas de Tablas Separadas (CRUD Directo)
- **Roles**:
  - `GET /api/roles` (listar todos)
  - `GET /api/roles/{id_rol}` (por ID)
  - `POST /api/roles` (crear - Admin)
  - `PUT /api/roles/{id_rol}` (editar - Admin)
  - `DELETE /api/roles/{id_rol}` (eliminar - Admin)
- **Refugios**:
  - `GET /api/refugios` (listar con filtros: `ciudad`, `estado`, `estado_cuenta`)
  - `GET /api/refugios/{id_refugio}` (por ID)
  - `POST /api/refugios` (crear)
  - `PUT /api/refugios/{id_refugio}` (editar)
  - `DELETE /api/refugios/{id_refugio}` (eliminar)
- **Animales**:
  - `GET /api/animales` (listar con filtros: `especie`, `raza`, `sexo`, `tamano`, `estado_adopcion`, `id_refugio`, `q`)
  - `GET /api/animales/{id_animal}` (por ID)
  - `POST /api/animales` (dar de alta mascota)
  - `PUT /api/animales/{id_animal}` (editar mascota)
  - `DELETE /api/animales/{id_animal}` (eliminar mascota)
- **Usuarios**:
  - `GET /api/usuarios` (listar con filtros: `id_rol`, `id_refugio`)
  - `GET /api/usuarios/{id_usuario}` (por ID)
  - `POST /api/usuarios` (crear)
  - `PUT /api/usuarios/{id_usuario}` (editar)
  - `DELETE /api/usuarios/{id_usuario}` (eliminar)
- **Solicitudes de Adopción**:
  - `GET /api/solicitudes` (listar con filtros: `estado_solicitud`, `id_usuario`, `id_animal`)
  - `GET /api/solicitudes/{id_solicitud}` (por ID)
  - `POST /api/solicitudes` (enviar solicitud)
  - `PUT /api/solicitudes/{id_solicitud}/estado` (aprobar / rechazar con notas internas)
  - `DELETE /api/solicitudes/{id_solicitud}` (cancelar solicitud)
- **Favoritos**:
  - `GET /api/favoritos` (listar)
  - `POST /api/favoritos` (agregar mascota a favoritos)
  - `DELETE /api/favoritos/{id_favorito}` (quitar por ID de favorito)
  - `DELETE /api/favoritos/animal/{id_animal}` (quitar directo por ID de animal para botón toggle)
  - `GET /api/favoritos/verificar/{id_animal}` (retorna `{"es_favorito": true/false}`)

### 3. Consultas de Tablas Juntas (JOINS / Relacionales)
- **Animales + Refugios**:
  - `GET /api/animales/relacion/con-refugio`: Listado de animales con todos los datos de su refugio embebidos.
  - `GET /api/animales/{id_animal}/detalle-completo`: Detalle con refugio, si el usuario logueado lo tiene en favoritos y conteo de solicitudes.
- **Refugios + Animales**:
  - `GET /api/refugios/{id_refugio}/animales`: Lista de animales de un refugio en específico.
  - `GET /api/refugios/{id_refugio}/completo`: Datos del refugio + lista de encargados + animales registrados.
  - `GET /api/refugios/relacion/con-animales`: Todos los refugios con sus mascotas disponibles.
- **Solicitudes + Usuarios + Animales + Refugios (JOIN Cuádruple)**:
  - `GET /api/solicitudes/relacion/detalladas`: Lista completa con datos del adoptante, animal y refugio.
  - `GET /api/solicitudes/relacion/mis-solicitudes`: Solicitudes del usuario logueado con la ficha de la mascota y refugio.
  - `GET /api/solicitudes/relacion/refugio/{id_refugio}`: Postulaciones recibidas por un refugio específico con datos de contacto del adoptante.
- **Favoritos + Animales + Refugios**:
  - `GET /api/favoritos/relacion/mis-favoritos`: Favoritos del usuario con ficha completa de la mascota y del refugio.
- **Usuarios + Roles + Refugios**:
  - `GET /api/usuarios/relacion/detallados`: Lista de usuarios con objetos completos de su rol y refugio asignado.
  - `GET /api/usuarios/{id_usuario}/perfil-completo`: Perfil de usuario con su rol, refugio, historial de solicitudes y favoritos.

### 4. Consultas Especiales y Dashboard Web (`/api/consultas-juntas`)
- `GET /api/consultas-juntas/catalogo`: Catálogo público optimizado para el portal web con filtros combinados (especie, tamaño, sexo, ciudad, texto libre).
- `GET /api/consultas-juntas/refugios-directorio`: Directorio de refugios activos con su conteo de animales disponibles.
- `GET /api/consultas-juntas/adopciones-exitosas`: Historial de animales adoptados con datos del adoptante y refugio.
- `GET /api/consultas-juntas/dashboard`: Métricas globales consolidadas (totales, desglose por especie, solicitudes pendientes/aprobadas y últimos animales).

---

## 🌐 Configuración de CORS
CORS está configurado en [`main.py`](main.py) permitiendo:
- `http://localhost:3000` (Next.js / React)
- `http://localhost:5173` (Vite)
- Despliegues en Vercel con la expresión regular `r"https://.*\.vercel\.app"`
- Todos los métodos HTTP (`GET`, `POST`, `PUT`, `DELETE`, etc.) y cabeceras (`Authorization`, `Content-Type`, etc.).
