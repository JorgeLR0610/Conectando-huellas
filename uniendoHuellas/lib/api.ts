// API Client for Uniendo Huellas backend (FastAPI)

// Same-origin requests always pass through the Next.js rewrite.
const API_BASE_URL = '';

export interface User {
  id_usuario: number;
  id_rol: number;
  id_refugio?: number | null;
  nombre_completo: string;
  correo: string;
  telefono: string;
  rol_nombre?: string;
  ciudad?: string | null;
  rol?: { id_rol: number; nombre_rol: string } | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  usuario: User;
  rol_nombre: string;
}

export interface BackendRefugio {
  id_refugio: number;
  nombre_organizacion: string;
  direccion: string;
  ciudad: string;
  estado: string;
  telefono: string;
  logo_url?: string | null;
  estado_cuenta: string;
}

export interface BackendAnimal {
  id_animal: number;
  id_refugio: number;
  nombre: string;
  especie: string;
  raza: string;
  sexo: string;
  edad_estimada: string;
  tamano: string;
  descripcion?: string | null;
  foto_url?: string | null;
  es_urgente: boolean;
  estado_adopcion: string;
  refugio?: BackendRefugio | null;
  es_favorito?: boolean;
  total_solicitudes?: number;
}

export interface BackendSolicitud {
  id_solicitud: number;
  id_usuario: number;
  id_animal: number;
  mensaje?: string | null;
  estado_solicitud: 'pendiente' | 'aprobada' | 'rechazada' | string;
  notas_internas?: string | null;
  fecha_solicitud: string;
  usuario?: User;
  animal?: BackendAnimal;
}

export interface AnimalCreateData {
  id_refugio: number;
  nombre: string;
  especie: string;
  raza: string;
  sexo: string;
  edad_estimada: string;
  tamano: string;
  descripcion?: string;
  foto_url?: string;
  es_urgente?: boolean;
  estado_adopcion?: string;
}

export interface BackendFavorito {
  id_favorito: number;
  id_usuario: number;
  id_animal: number;
  animal?: BackendAnimal;
}

export interface RegisterData {
  nombre_completo: string;
  correo: string;
  password: string;
  telefono: string;
  ciudad: string;
}

export type VolunteerMode = 'paseos' | 'traslados' | 'hogar_temporal';
export interface VolunteerData {
  id_refugio: number;
  modalidad: VolunteerMode;
  disponibilidad: string;
  comentarios?: string;
}
export interface VolunteerApplication extends VolunteerData {
  id_solicitud: number;
  id_usuario: number;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  fecha_solicitud: string;
  refugio: BackendRefugio;
  usuario?: User;
}

export interface DashboardStats {
  total_refugios: number;
  total_refugios_activos: number;
  total_animales: number;
  total_animales_disponibles: number;
  total_animales_adoptados: number;
  total_usuarios: number;
  total_solicitudes: number;
  solicitudes_pendientes: number;
  solicitudes_aprobadas: number;
  animales_por_especie: Record<string, number>;
  ultimos_animales: BackendAnimal[];
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  fieldErrors: Record<string, string>;

  constructor(status: number, message: string, data?: unknown, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.fieldErrors = fieldErrors;
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message
    : 'No pudimos conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    ...(typeof FormData !== 'undefined' && options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = response.status >= 500
      ? 'No pudimos completar la operación. Inténtalo de nuevo en unos minutos.'
      : 'No pudimos completar la operación. Revisa tus datos.';
    let errorData = null;
    const fieldErrors: Record<string, string> = {};
    try {
      errorData = await response.json();
      if (errorData && errorData.detail) {
        if (typeof errorData.detail === 'string' && response.status < 500) {
          errorDetail = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          for (const issue of errorData.detail) {
            const field = String(issue.loc?.[1] || '');
            fieldErrors[field] = field === 'correo' ? 'Introduce un correo válido, como nombre@ejemplo.com.'
              : field === 'password' ? (issue.type === 'string_too_short'
                ? 'Usa al menos 8 caracteres para tu contraseña.'
                : 'La contraseña es demasiado larga; utiliza como máximo 72 bytes.')
              : field === 'nombre_completo' ? 'Introduce tu nombre y apellido (de 2 a 150 caracteres).'
              : field === 'telefono' ? 'Introduce un teléfono de contacto válido (de 5 a 30 caracteres).'
              : field === 'ciudad' ? 'Introduce tu ciudad o región (de 2 a 150 caracteres).'
              : 'Revisa este campo.';
          }
          errorDetail = 'Revisa los campos señalados para continuar.';
        }
      }
    } catch {
      // Body wasn't JSON
    }
    if (response.status === 401 && token && !endpoint.endsWith('/login')) {
      window.dispatchEvent(new Event('auth:expired'));
    }
    throw new ApiError(response.status, errorDetail, errorData, fieldErrors);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export const api = {
  // Auth
  auth: {
    async login(correo: string, password: string): Promise<AuthResponse> {
      return request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ correo, password }),
      });
    },
    async register(data: RegisterData): Promise<User> {
      return request<User>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async registerRefugio(data: {
      nombre_organizacion: string;
      direccion: string;
      ciudad: string;
      estado: string;
      telefono_refugio: string;
      logo_url?: string;
      nombre_encargado: string;
      correo: string;
      password: string;
      telefono_encargado: string;
    }): Promise<{ access_token: string; usuario: User; refugio: BackendRefugio; token_type: string; mensaje: string }> {
      return request('/api/auth/register-refugio', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async me(): Promise<User> {
      return request<User>('/api/auth/me');
    },
  },

  voluntariado: {
    mine: () => request<VolunteerApplication[]>('/api/voluntariado/mis-solicitudes'),
    all: () => request<VolunteerApplication[]>('/api/voluntariado'),
    create: (data: VolunteerData) => request<VolunteerApplication>('/api/voluntariado', {
      method: 'POST', body: JSON.stringify(data),
    }),
    updateStatus: (id: number, estado: 'aprobada' | 'rechazada') =>
      request<VolunteerApplication>(`/api/voluntariado/${id}/estado`, {
        method: 'PATCH', body: JSON.stringify({ estado }),
      }),
  },

  // Animales
  animales: {
    async getCatalogo(params: {
      especie?: string;
      tamano?: string;
      sexo?: string;
      ciudad?: string;
      estado?: string;
      q?: string;
      es_urgente?: boolean;
    } = {}): Promise<BackendAnimal[]> {
      const query = new URLSearchParams();
      if (params.especie && params.especie !== 'all') query.set('especie', params.especie);
      if (params.tamano && params.tamano !== 'all') query.set('tamano', params.tamano);
      if (params.sexo && params.sexo !== 'all') query.set('sexo', params.sexo);
      if (params.ciudad && params.ciudad !== 'all') query.set('ciudad', params.ciudad);
      if (params.estado && params.estado !== 'all') query.set('estado', params.estado);
      if (params.q) query.set('q', params.q);
      if (params.es_urgente !== undefined) query.set('es_urgente', String(params.es_urgente));

      const qs = query.toString();
      return request<BackendAnimal[]>(`/api/consultas-juntas/catalogo${qs ? `?${qs}` : ''}`);
    },

    async getAll(params: {
      especie?: string;
      raza?: string;
      sexo?: string;
      tamano?: string;
      estado_adopcion?: string;
      id_refugio?: number;
      q?: string;
      es_urgente?: boolean;
    } = {}): Promise<BackendAnimal[]> {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== 'all') {
          query.set(k, String(v));
        }
      });
      const qs = query.toString();
      return request<BackendAnimal[]>(`/api/animales/relacion/con-refugio${qs ? `?${qs}` : ''}`);
    },

    async getDetail(id_animal: number | string): Promise<BackendAnimal> {
      return request<BackendAnimal>(`/api/animales/${id_animal}/detalle-completo`);
    },

    async create(data: AnimalCreateData): Promise<BackendAnimal> {
      return request<BackendAnimal>('/api/animales', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async createWithImage(data: AnimalCreateData, photo: File | null): Promise<BackendAnimal> {
      const body = new FormData();
      body.append('datos', JSON.stringify(data));
      if (photo) body.append('foto', photo);
      return request<BackendAnimal>('/api/animales/ingreso', { method: 'POST', body });
    },

    async update(id_animal: number | string, data: Partial<BackendAnimal>): Promise<BackendAnimal> {
      return request<BackendAnimal>(`/api/animales/${id_animal}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async delete(id_animal: number | string): Promise<{ mensaje: string; id: number }> {
      return request(`/api/animales/${id_animal}`, {
        method: 'DELETE',
      });
    },
  },

  // Solicitudes
  solicitudes: {
    async getAll(params: { estado_solicitud?: string; id_animal?: number } = {}): Promise<BackendSolicitud[]> {
      const query = new URLSearchParams();
      if (params.estado_solicitud) query.set('estado_solicitud', params.estado_solicitud);
      if (params.id_animal) query.set('id_animal', String(params.id_animal));
      const qs = query.toString();
      return request<BackendSolicitud[]>(`/api/solicitudes/relacion/detalladas${qs ? `?${qs}` : ''}`);
    },

    async getMySolicitudes(): Promise<BackendSolicitud[]> {
      return request<BackendSolicitud[]>('/api/solicitudes/relacion/mis-solicitudes');
    },

    async create(data: { id_animal: number; mensaje?: string }): Promise<BackendSolicitud> {
      return request<BackendSolicitud>('/api/solicitudes', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async updateStatus(id_solicitud: number | string, data: { estado_solicitud: string; notas_internas?: string }): Promise<BackendSolicitud> {
      return request<BackendSolicitud>(`/api/solicitudes/${id_solicitud}/estado`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  },

  // Favoritos
  favoritos: {
    async getMyFavoritos(): Promise<BackendFavorito[]> {
      return request<BackendFavorito[]>('/api/favoritos/relacion/mis-favoritos');
    },

    async add(id_animal: number): Promise<BackendFavorito> {
      return request<BackendFavorito>('/api/favoritos', {
        method: 'POST',
        body: JSON.stringify({ id_animal }),
      });
    },

    async removeByAnimal(id_animal: number): Promise<{ mensaje: string }> {
      return request(`/api/favoritos/animal/${id_animal}`, {
        method: 'DELETE',
      });
    },

    async check(id_animal: number): Promise<{ es_favorito: boolean }> {
      return request(`/api/favoritos/verificar/${id_animal}`);
    },
  },

  // Consultas y Dashboard
  dashboard: {
    async getResumen(): Promise<DashboardStats> {
      return request<DashboardStats>('/api/consultas-juntas/dashboard');
    },
    async getRefugiosDirectorio(): Promise<BackendRefugio[]> {
      return request<BackendRefugio[]>('/api/consultas-juntas/refugios-directorio');
    },
  },
};
