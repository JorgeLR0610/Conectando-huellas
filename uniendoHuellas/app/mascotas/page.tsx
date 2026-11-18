'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PetCard from '@/components/PetCard';
import { Pet } from '@/data/pets';
import { api, errorMessage } from '@/lib/api';
import { backendAnimalsToPets } from '@/lib/adapters';
import AdminRouteBoundary from '@/components/AdminRouteBoundary';

function MascotasContent() {
  const searchParams = useSearchParams();

  const initialSpecies = searchParams.get('species') || 'all';
  const initialLocation = searchParams.get('location') || 'all';
  const initialAge = searchParams.get('age') || 'all';

  const [species, setSpecies] = useState<string>(initialSpecies);
  const [location, setLocation] = useState<string>(initialLocation);
  const [age, setAge] = useState<string>(initialAge);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeChip, setActiveChip] = useState<string>('todos');

  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState('');

  // Load real pets from API
  useEffect(() => {
    api.animales
      .getCatalogo()
      .then((data) => {
        setPets(backendAnimalsToPets(data));
      })
      .catch((err) => {
        setLoadError(errorMessage(err));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Filter urgent pets
  const urgentPets = useMemo(() => {
    return pets.filter((p) => p.urgent);
  }, [pets]);

  // Filter catalog pets based on selections
  const filteredPets = useMemo(() => {
    return pets.filter((pet) => {
      // Chip shortcut
      if (activeChip === 'perros' && pet.species !== 'perros') return false;
      if (activeChip === 'gatos' && pet.species !== 'gatos') return false;
      if (activeChip === 'urgentes' && !pet.urgent) return false;
      if (activeChip === 'cachorros' && pet.ageCategory !== 'cachorro') return false;
      if (activeChip === 'seniors' && pet.ageCategory !== 'senior') return false;

      // Species select
      if (species !== 'all' && pet.species !== species) return false;

      // Location select
      if (location !== 'all' && pet.locationCity !== location) return false;

      // Age select
      if (age !== 'all' && pet.ageCategory !== age) return false;

      // Search term
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesName = pet.name.toLowerCase().includes(query);
        const matchesBreed = pet.breed.toLowerCase().includes(query);
        const matchesTags = pet.tags.some((t) => t.toLowerCase().includes(query));
        const matchesShelter = pet.shelter.toLowerCase().includes(query);
        if (!matchesName && !matchesBreed && !matchesTags && !matchesShelter) {
          return false;
        }
      }

      return true;
    });
  }, [pets, species, location, age, searchTerm, activeChip]);

  const resetFilters = () => {
    setSpecies('all');
    setLocation('all');
    setAge('all');
    setSearchTerm('');
    setActiveChip('todos');
  };

  return (
    <main className="w-full pt-20 bg-background min-h-[calc(100vh-280px)]">
      {isLoading && <p role="status" className="max-w-[1240px] mx-auto px-gutter py-3">Cargando mascotas…</p>}
      {loadError && <p role="alert" className="max-w-[1240px] mx-auto px-gutter py-3 text-error">{loadError}</p>}
      <div className="flex flex-col w-full">
        {/* Compact Hero with Integrated Search Focus */}
        <section className="relative w-full overflow-hidden bg-surface-container-low pt-space-lg pb-space-xl">
          <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-secondary-fixed opacity-40 blur-3xl pointer-events-none" />
          <div className="absolute top-10 -right-16 w-80 h-80 rounded-full bg-primary-fixed opacity-40 blur-3xl pointer-events-none" />

          <div className="max-w-[1240px] mx-auto px-gutter relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center mb-space-lg">
              <div className="lg:col-span-7 flex flex-col items-start gap-space-xs">
                <div className="inline-flex items-center gap-space-xs px-space-md py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm shadow-xs font-semibold">
                  <span className="material-symbols-outlined text-[16px]">pets</span>
                  <span>Red ética de rescate • {pets.length} animales disponibles</span>
                </div>
                <h1 className="font-headline-lg lg:font-display-lg text-headline-lg lg:text-display-lg text-on-surface tracking-tight leading-tight font-bold">
                  Adopta amor puro,{' '}
                  <span className="text-primary italic font-normal">cambia una vida para siempre.</span>
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
                  Conectamos perritos y gatitos rescatados con familias cariñosas y responsables. Encuentra a tu próximo compañero con información honesta y proceso acompañado.
                </p>
              </div>

              {/* Compact hero teaser visual with live badge */}
              <div className="lg:col-span-5 flex items-center justify-end">
                <div className="relative w-full max-w-md h-40 sm:h-44 rounded-2xl overflow-hidden shadow-lg border border-surface-variant/50 group">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt="Perrito rescatado adoptado"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqICKpTNcqIX0hbwVNb4I26teW9evHOTK5d1TFSQGim9Tf7O9da2UfnhJwq3a660BZKMcpHXvdZUfg88rFNiPZtCTC0_Txp7FgxFL2DdMNFwnMGjBqyacCIb8Qj8eXsoztsyJWI8fCcecpQbXN-K0yuQH8p5xzK_X7bpang6bHjmsRPkLM2nrOqtsc21sZzUtA9LQTiRiO0VgYjFnXRVpoesTDImiK7FfXLn9AsJ3AqzA0NnDrbibE"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <div>
                      <p className="font-label-md text-label-md font-bold text-white flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Historias reales de adopción
                      </p>
                      <p className="font-body-sm text-body-sm text-white/90">
                        Canela ya duerme segura en su nuevo hogar.
                      </p>
                    </div>
                    <a
                      className="px-space-sm py-1 bg-surface-container-lowest/90 backdrop-blur-md rounded-lg text-primary font-label-sm text-label-sm font-bold hover:bg-surface-container-lowest transition-colors"
                      href="#casos-urgentes"
                    >
                      Ver urgentes
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Integrated Search Bar with Quick Filter Controls */}
            <div className="w-full bg-surface-container-lowest rounded-2xl shadow-xl p-space-md lg:p-space-lg border border-surface-variant/40">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md mb-space-md">
                {/* Search Text */}
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 font-semibold" htmlFor="search-input">
                    <span className="material-symbols-outlined text-[16px] text-secondary">search</span>
                    Buscar por nombre o palabra
                  </label>
                  <input
                    id="search-input"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ej. Milo, mestizo, cariñoso..."
                    className="w-full bg-surface-container-low px-space-md py-space-sm rounded-lg font-body-md text-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary/40 transition-all border border-transparent focus:border-primary-container"
                  />
                </div>

                {/* Especie */}
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 font-semibold" htmlFor="species-filter">
                    <span className="material-symbols-outlined text-[16px] text-secondary">category</span>
                    Especie
                  </label>
                  <div className="relative">
                    <select
                      id="species-filter"
                      value={species}
                      onChange={(e) => setSpecies(e.target.value)}
                      className="w-full appearance-none bg-surface-container-low px-space-md py-space-sm rounded-lg font-body-md text-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary/40 transition-all pr-8 border border-transparent focus:border-primary-container"
                    >
                      <option value="all">Todas las especies</option>
                      <option value="perros">Perros (4)</option>
                      <option value="gatos">Gatos (3)</option>
                      <option value="otros">Otros compañeros</option>
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Ubicación */}
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 font-semibold" htmlFor="location-filter">
                    <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
                    Ubicación / Ciudad
                  </label>
                  <div className="relative">
                    <select
                      id="location-filter"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full appearance-none bg-surface-container-low px-space-md py-space-sm rounded-lg font-body-md text-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary/40 transition-all pr-8 border border-transparent focus:border-primary-container"
                    >
                      <option value="all">Todas las regiones</option>
                      <option value="cdmx">Ciudad de México y Área Metro</option>
                      <option value="gdl">Guadalajara, Jalisco</option>
                      <option value="mty">Monterrey, Nuevo León</option>
                      <option value="pue">Puebla y alrededores</option>
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Etapa de vida */}
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 font-semibold" htmlFor="age-filter">
                    <span className="material-symbols-outlined text-[16px] text-secondary">calendar_today</span>
                    Etapa de vida
                  </label>
                  <div className="relative">
                    <select
                      id="age-filter"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full appearance-none bg-surface-container-low px-space-md py-space-sm rounded-lg font-body-md text-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary/40 transition-all pr-8 border border-transparent focus:border-primary-container"
                    >
                      <option value="all">Cualquier edad</option>
                      <option value="cachorro">Cachorro / Bebé (0-1 año)</option>
                      <option value="joven">Joven (1-3 años)</option>
                      <option value="adulto">Adulto (3-7 años)</option>
                      <option value="senior">Senior (7+ años)</option>
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Filter Chips */}
              <div className="flex flex-wrap items-center gap-space-xs pt-space-xs border-t border-surface-container-high/60">
                <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold mr-2">
                  Filtros rápidos:
                </span>
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'perros', label: 'Perros 🐕' },
                  { id: 'gatos', label: 'Gatos 🐈' },
                  { id: 'urgentes', label: 'Casos Urgentes 🚨' },
                  { id: 'cachorros', label: 'Cachorros 🐾' },
                  { id: 'seniors', label: 'Seniors 🌿' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setActiveChip(chip.id)}
                    className={`px-space-md py-1 rounded-full font-label-sm text-label-sm transition-all ${
                      activeChip === chip.id
                        ? 'bg-primary text-on-primary font-bold shadow-xs'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}

                {(species !== 'all' || location !== 'all' || age !== 'all' || searchTerm || activeChip !== 'todos') && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="ml-auto text-xs text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Sección Destacada: Casos Urgentes & En Espera Especial */}
        <section className="w-full bg-surface-container-low/70 py-space-xl border-y border-surface-variant/40" id="casos-urgentes">
          <div className="max-w-[1240px] mx-auto px-gutter">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-lg">
              <div className="flex items-center gap-space-sm">
                <span className="w-3 h-3 rounded-full bg-error animate-ping" />
                <div>
                  <div className="inline-flex items-center gap-1 text-error font-label-sm text-label-sm font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[16px]">emergency</span>
                    Adopción Prioritaria & Hogar Temporal
                  </div>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                    Casos Urgentes que necesitan tu apoyo hoy
                  </h2>
                </div>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-lowest px-space-sm py-1 rounded-full border border-surface-variant/50 self-start sm:self-auto font-medium">
                {urgentPets.length} animales en situación especial
              </span>
            </div>

            {/* Grid Horizontal de Urgentes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
              {urgentPets.map((pet) => (
                <PetCard key={pet.id} pet={pet} isUrgentCard={true} />
              ))}
            </div>
          </div>
        </section>

        {/* Catálogo Principal de Mascotas en Adopción */}
        <section className="max-w-[1240px] mx-auto px-gutter py-space-2xl w-full" id="galeria-adopciones">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-lg gap-space-md">
            <div>
              <div className="inline-flex items-center gap-space-xs px-space-sm py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm mb-space-xs font-semibold">
                <span className="material-symbols-outlined text-[14px]">volunteer_activism</span>
                Esperando un nuevo comienzo
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                Mascotas listas para amar
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
                Cada uno tiene una personalidad única y todo el deseo de convertirse en tu compañero incondicional.
              </p>
            </div>

            <div className="flex items-center gap-space-sm">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Mostrando <strong className="text-on-surface">{filteredPets.length} de {pets.length}</strong> compañeros
              </span>
            </div>
          </div>

          {filteredPets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
              {filteredPets.map((pet) => (
                <PetCard key={pet.id} pet={pet} />
              ))}
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-2xl p-space-2xl text-center border border-dashed border-outline-variant max-w-lg mx-auto my-space-xl">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-space-sm">
                pets
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                No encontramos compañeros con estos criterios
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 mb-space-lg">
                Intenta ajustar los filtros de ubicación o especie para ver más amigos disponibles.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-space-lg py-space-sm bg-primary text-white rounded-xl font-label-md hover:bg-primary-container transition-colors"
              >
                Ver todas las mascotas
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function MascotasPage() {
  return (
    <AdminRouteBoundary>
      <Navbar />
      <Suspense fallback={<div className="min-h-screen pt-32 text-center">Cargando catálogo...</div>}>
        <MascotasContent />
      </Suspense>
      <Footer />
    </AdminRouteBoundary>
  );
}
