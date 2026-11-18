# 🖥️ Frontend — Uniendo Huellas (Cliente Web)

Aplicación web moderna para la plataforma de adopción de mascotas **Uniendo Huellas**, desarrollada con **Next.js 16 (App Router)**, **React 19**, **TypeScript** y estilizada con **Tailwind CSS v4**.

---

## 🛠️ Stack Tecnológico

- **Framework**: [Next.js 16.4.6](https://nextjs.org/) con App Router y Turbopack
- **Biblioteca UI**: [React 19.3.0](https://react.dev/)
- **Lenguaje**: TypeScript 5
- **Estilos**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Iconografía**: [Lucide React](https://lucide.dev/)
- **Cliente HTTP**: Fetch API nativo con wrapper tipado (`lib/api.ts`)
- **Gestión de Estado**: React Context API (`context/AuthContext.tsx`) + `localStorage`

---

## 📁 Estructura del Proyecto

```text
uniendoHuellas/
├── app/                        # Next.js App Router (Rutas y Páginas)
│   ├── layout.tsx              # Root Layout: AuthProvider, Navbar global y Footer
│   ├── page.tsx                # Página de inicio (Landing page interactiva)
│   ├── login/                  # Inicio de sesión con validación de credenciales
│   ├── registro/               # Registro de nuevos adoptantes
│   ├── mascotas/               # Catálogo público con filtros combinados
│   │   ├── page.tsx            # Filtros por especie, tamaño, sexo, ciudad y búsqueda
│   │   └── [id]/page.tsx       # Ficha detallada de la mascota (Suspense + StaticParams)
│   ├── refugios/page.tsx       # Directorio de albergues y centros de rescate
│   ├── adoptar/[id]/page.tsx   # Formulario formal de postulación para adopción
│   ├── favoritos/page.tsx      # Galería de mascotas marcadas como favoritas
│   ├── solicitudes/page.tsx    # Panel de seguimiento de solicitudes del adoptante
│   ├── admin/page.tsx          # Dashboard administrativo y de gestión de refugios
│   ├── perfil/page.tsx         # Gestión del perfil del usuario logueado
│   └── globals.css             # Estilos globales y variables de Tailwind CSS v4
│
├── components/                 # Componentes UI modulares
│   ├── Navbar.tsx              # Barra de navegación con estado reactivo de sesión
│   ├── Footer.tsx              # Pie de página institucional
│   ├── PetCard.tsx             # Tarjeta interactiva de mascota con botón de favoritos
│   └── ProtectedRoute.tsx      # Guardián de rutas por rol de usuario
│
├── context/                    # Contextos globales de React
│   └── AuthContext.tsx         # Estado de autenticación, token JWT y datos de usuario
│
├── lib/                        # Capa de datos y utilidades
│   ├── api.ts                  # Cliente API con manejo de tokens e interceptores
│   └── adapters.ts             # Adaptador de datos: BackendAnimal -> Interfaz Pet
│
├── public/                     # Recursos estáticos (imágenes, iconos, logos)
├── next.config.ts              # Proxy de rewrites hacia la API y configuración Turbopack
├── package.json                # Dependencias y scripts de ejecución
└── Dockerfile                  # Empaquetado en contenedor Docker multi-stage
```

---

## 🔄 Capa de Datos y Adaptadores

### Proxy Transparente de API (`next.config.ts`)
El cliente no realiza peticiones directas a URLs absolutas con puertos externos para evitar problemas de CORS y diferencias entre desarrollo y producción. En su lugar, todas las peticiones a `/api/:path*` son reescritas automáticamente:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  cacheComponents: true,
  async rewrites() {
    const backendUrl = process.env.INTERNAL_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};
```

### Patrón Adaptador (`lib/adapters.ts`)
El backend entrega objetos relacionales de base de datos con nomenclaturas en español (`id_animal`, `edad_anios`, `descripcion_personalidad`). La función `backendAnimalToPet` normaliza estos datos a la interfaz estándar `Pet` esperada por los componentes de la interfaz de usuario:

```typescript
import { backendAnimalToPet, backendListToPets } from '@/lib/adapters';

// Consumo en página o componente
const res = await apiClient.get('/api/consultas-juntas/catalogo');
const pets = backendListToPets(res.data);
```

---

## 🔐 Gestión de Sesión (`context/AuthContext.tsx`)

El estado de autenticación se administra mediante React Context y se sincroniza automáticamente con el almacenamiento local del navegador (`localStorage`):
- `auth_token`: Token JWT emitido por FastAPI.
- `auth_role`: Rol del usuario (`Administrador`, `Refugio / Encargado`, `Adoptante`).
- `auth_user`: Datos de perfil del usuario en formato JSON.

El hook `useAuth()` expone los métodos `login()`, `logout()`, `register()` y el estado reactivo `user`, `role`, `isAuthenticated` y `isLoading`.

---

## 🚀 Ejecución en Desarrollo

### Opción 1: Mediante Docker Compose (Recomendado)
Desde la raíz del repositorio:
```bash
docker compose up -d frontend
```
El frontend estará disponible en [http://localhost:3000](http://localhost:3000).

### Opción 2: Ejecución Local con Node.js
Requisitos: Node.js 20+ y npm:

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo con Turbopack
npm run dev
```

El servidor iniciará en [http://localhost:3000](http://localhost:3000). Asegúrate de tener el backend corriendo en el puerto 8000 para que las rutas `/api/*` puedan resolver las consultas.

---

## 📦 Scripts Disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo local con recarga en caliente (Hot Reload). |
| `npm run build` | Compila y optimiza la aplicación para producción. |
| `npm run start` | Arranca el servidor de producción optimizado tras un build. |
| `npm run lint` | Ejecuta ESLint para verificar calidad de código y buenas prácticas. |

---

## ⚙️ Variables de Entorno

Puedes crear un archivo `.env.local` en esta carpeta si requieres sobreescribir la URL del backend durante el desarrollo local independiente:

```env
# URL interna utilizada por el proxy de Next.js en rewrites (lado del servidor)
INTERNAL_API_URL=http://localhost:8000

# URL pública de la API (opcional para consumo directo del cliente)
NEXT_PUBLIC_API_URL=http://localhost:8000
```
