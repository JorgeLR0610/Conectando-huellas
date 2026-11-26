import type { BackendSolicitud } from './api';

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
}

export function contactAvailable(phone?: string | null): boolean {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.length >= 7 && !/^(\d)\1+$/.test(digits);
}

export function adoptionDetails(application: BackendSolicitud): string {
  const housing: Record<string, string> = {
    'casa-patio': 'Casa con patio cerrado', 'depto-malla': 'Departamento con protecciones',
    'depto-sin-malla': 'Departamento regular', parcela: 'Parcela / Campo',
  };
  return [
    application.tipo_vivienda ? `Vivienda: ${housing[application.tipo_vivienda] || application.tipo_vivienda}` : '',
    application.experiencia ? `Experiencia: ${application.experiencia === 'si' ? 'Sí' : 'Primera mascota'}` : '',
    application.telefono_contacto ? `Teléfono de contacto: ${application.telefono_contacto}` : '',
    application.mensaje || '',
  ].filter(Boolean).join('\n');
}
