import { Pet } from '@/data/pets';
import { BackendAnimal } from './api';

export function determineAgeCategory(edadStr: string): 'cachorro' | 'joven' | 'adulto' | 'senior' {
  const lower = (edadStr || '').toLowerCase();
  if (lower.includes('mes') || lower.includes('cachorro') || lower.includes('bebé') || lower.includes('semana')) {
    return 'cachorro';
  }
  const matchNum = lower.match(/\d+(?:[.,]\d+)?/);
  if (matchNum) {
    const num = Number(matchNum[0].replace(',', '.'));
    if (num < 1) return 'cachorro';
    if (num <= 2) return 'joven';
    if (num <= 7) return 'adulto';
    return 'senior';
  }
  return 'adulto';
}

export function determineCityKey(ciudad?: string): string {
  const c = (ciudad || '').toLowerCase();
  if (c.includes('méxico') || c.includes('cdmx') || c.includes('df')) return 'cdmx';
  if (c.includes('guadalajara') || c.includes('jalisco') || c.includes('gdl')) return 'gdl';
  if (c.includes('monterrey') || c.includes('nuevo león') || c.includes('mty')) return 'mty';
  if (c.includes('puebla') || c.includes('pue')) return 'pue';
  return c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, '-') || 'sin-ubicacion';
}

export function determineSpeciesKey(especie: string): 'perros' | 'gatos' | 'otros' {
  const e = (especie || '').toLowerCase();
  if (e.startsWith('perr') || e.includes('canino') || e.includes('dog')) return 'perros';
  if (e.startsWith('gat') || e.includes('felino') || e.includes('cat')) return 'gatos';
  return 'otros';
}

export function backendAnimalToPet(animal: BackendAnimal): Pet {
  const speciesKey = determineSpeciesKey(animal.especie);
  const ageCategory = determineAgeCategory(animal.edad_estimada);
  const cityKey = determineCityKey(animal.refugio?.ciudad);

  const images = animal.foto_url
    ? [animal.foto_url]
    : [
        speciesKey === 'perros'
          ? 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600'
          : 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600',
      ];

  const isUrgent = animal.es_urgente === true;

  return {
    id: String(animal.id_animal),
    name: animal.nombre,
    species: speciesKey,
    breed: animal.raza || 'Mestizo cariñoso',
    age: animal.edad_estimada,
    ageCategory,
    gender: (animal.sexo as 'Macho' | 'Hembra') || 'Macho',
    size: animal.tamano || 'Mediano',
    energy: 'Sin confirmar',
    adoptionStatus: animal.estado_adopcion,
    location: animal.refugio
      ? `${animal.refugio.ciudad}, ${animal.refugio.estado}`
      : 'México',
    locationCity: cityKey,
    shelter: animal.refugio?.nombre_organizacion || 'Refugio Uniendo Huellas',
    shelterContact: {
      email: '',
      phone: animal.refugio?.telefono || '',
      address: animal.refugio?.direccion || 'Dirección sin confirmar',
      hours: 'Consulta horarios directamente con el refugio.',
    },
    tags: [
      animal.tamano || 'Mediano',
      animal.sexo || 'Macho',
      animal.estado_adopcion === 'disponible' ? 'Disponible' : animal.estado_adopcion === 'adoptado' ? 'Adoptado' : 'En proceso',
      ...(animal.esterilizado === true ? ['Esterilizado/a'] : []),
      ...(animal.vacunado === true ? ['Vacunado/a'] : []),
    ],
    urgent: isUrgent,
    urgencyTag: isUrgent ? 'Adopción Prioritaria' : undefined,
    description: animal.descripcion || `${animal.nombre} busca un hogar responsable y lleno de cariño.`,
    story:
      animal.descripcion ||
       `Consulta al refugio para conocer la historia y los cuidados de ${animal.nombre}.`,
    vaccinated: animal.vacunado ?? null,
    sterilized: animal.esterilizado ?? null,
    dewormed: animal.desparasitado ?? null,
    images,
  };
}

export function backendAnimalsToPets(animals: BackendAnimal[]): Pet[] {
  return animals.map(backendAnimalToPet);
}
