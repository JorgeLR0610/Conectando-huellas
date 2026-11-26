'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PetCard from '@/components/PetCard';
import { Pet } from '@/data/pets';
import { api, errorMessage } from '@/lib/api';
import { backendAnimalsToPets } from '@/lib/adapters';
import { useAuth } from '@/context/AuthContext';
import { isRegularUser } from '@/lib/auth';
import AdminRouteBoundary from '@/components/AdminRouteBoundary';

export default function HomePage() {
  return <AdminRouteBoundary><HomeContent /></AdminRouteBoundary>;
}

function HomeContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [species, setSpecies] = useState('all');
  const [location, setLocation] = useState('all');
  const [age, setAge] = useState('all');

  const [featuredPets, setFeaturedPets] = useState<Pet[]>([]);
  const [catalogError, setCatalogError] = useState('');
  const [metrics, setMetrics] = useState<{ animals: number; shelters: number; cities: number; urgent: number } | null>(null);
  const [locations, setLocations] = useState<[string, string][]>([]);

  useEffect(() => {
    Promise.all([api.animales.getCatalogo(), api.dashboard.getRefugiosDirectorio()])
      .then(([data, shelters]) => {
        setFeaturedPets(backendAnimalsToPets(data.slice(0, 3)));
        const pets = backendAnimalsToPets(data);
        setLocations(Array.from(new Map(pets.map((pet) => [pet.locationCity, pet.location])).entries()).sort((a, b) => a[1].localeCompare(b[1], 'es')));
        setMetrics({ animals: data.length, shelters: shelters.length,
          cities: new Set(shelters.map((shelter) => shelter.ciudad)).size,
          urgent: data.filter((animal) => animal.es_urgente).length });
      })
      .catch((err) => {
        setCatalogError(errorMessage(err));
      });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (species !== 'all') params.set('species', species);
    if (location !== 'all') params.set('location', location);
    if (age !== 'all') params.set('age', age);
    router.push(`/mascotas?${params.toString()}`);
  };

  return (
    <>
      <Navbar />

      <main className="w-full pt-20 bg-background min-h-[calc(100vh-280px)]">
        {catalogError && <p role="alert" className="max-w-[1240px] mx-auto px-gutter py-3 text-error">{catalogError}</p>}
        <div className="flex flex-col w-full">
          {/* Hero Section */}
          <section className="relative w-full overflow-hidden bg-surface-container-low pt-space-xl pb-space-2xl">
            {/* Ambient organic gradient blurs */}
            <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-secondary-fixed opacity-40 blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 -right-20 w-80 h-80 rounded-full bg-primary-fixed opacity-45 blur-3xl pointer-events-none" />

            <div className="max-w-[1240px] mx-auto px-gutter relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
                {/* Hero Text Content */}
                <div className="lg:col-span-6 flex flex-col items-start gap-space-md">
                  <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm shadow-xs">
                    <span className="material-symbols-outlined text-[16px]">pets</span>
                    <span>Red ética de rescate y adopción</span>
                  </div>

                  <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight leading-tight">
                    Cada huella merece un hogar{' '}
                    <span className="text-primary italic font-normal">lleno de amor.</span>
                  </h1>

                  <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
                    Conectamos animales rescatados con familias conscientes y cariñosas. Facilitamos un proceso de adopción digno, respetuoso y transparente donde ambas vidas se transforman.
                  </p>

                  <div className="flex flex-wrap items-center gap-space-md pt-space-xs">
                    <Link
                      href="/mascotas"
                      className="inline-flex items-center gap-space-xs px-space-xl py-space-md rounded-xl bg-primary text-on-primary font-label-md text-label-md shadow-md hover:bg-primary-container transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <span>Encuentra a tu mejor amigo</span>
                      <span className="material-symbols-outlined text-[18px]">favorite</span>
                    </Link>

                    <a
                      href="#proceso"
                      className="inline-flex items-center gap-space-xs px-space-lg py-space-md rounded-xl bg-surface-container-lowest text-on-surface font-label-md text-label-md shadow-xs hover:bg-surface-container transition-colors"
                    >
                      <span>Conoce nuestro proceso</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </a>
                  </div>

                  {/* Quick Trust Badge */}
                  <div className="flex items-center gap-space-sm pt-space-sm">
                    <div className="flex -space-x-2 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-secondary-fixed-dim flex items-center justify-center text-on-secondary-fixed font-label-sm text-label-sm shadow-xs">
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary-fixed-dim flex items-center justify-center text-on-primary-fixed font-label-sm text-label-sm shadow-xs">
                        <span className="material-symbols-outlined text-[16px]">volunteer_activism</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface font-label-sm text-label-sm shadow-xs">
                        <span className="material-symbols-outlined text-[16px]">health_and_safety</span>
                      </div>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Consulta la salud registrada y confirma los cuidados con cada refugio.
                    </p>
                  </div>
                </div>

                {/* Hero Emotional Visual */}
                <div className="lg:col-span-6 relative">
                  <div className="relative w-full rounded-2xl overflow-hidden shadow-xl bg-surface-container">
                    <img
                      className="w-full h-[460px] object-cover"
                      alt="Cariñosa cuidadora abrazando a perro mestizo rescatado"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqICKpTNcqIX0hbwVNb4I26teW9evHOTK5d1TFSQGim9Tf7O9da2UfnhJwq3a660BZKMcpHXvdZUfg88rFNiPZtCTC0_Txp7FgxFL2DdMNFwnMGjBqyacCIb8Qj8eXsoztsyJWI8fCcecpQbXN-K0yuQH8p5xzK_X7bpang6bHjmsRPkLM2nrOqtsc21sZzUtA9LQTiRiO0VgYjFnXRVpoesTDImiK7FfXLn9AsJ3AqzA0NnDrbibE"
                    />
                    {/* Floating Overlay Card */}
                    <div className="absolute bottom-4 left-4 right-4 sm:right-auto bg-surface-container-lowest/90 backdrop-blur-md p-space-md rounded-xl shadow-lg flex items-center gap-space-md border border-white/60">
                      <div className="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0">
                        <span className="material-symbols-outlined text-[26px]">potted_plant</span>
                      </div>
                      <div>
                        <p className="font-label-md text-label-md text-on-surface font-semibold">
                          Un nuevo comienzo es posible
                        </p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Fotografía ilustrativa de nuestra comunidad.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Floating Search Bar */}
          <section className="relative z-20 -mt-10 px-gutter max-w-[1240px] mx-auto w-full" id="buscador">
            <div className="w-full bg-surface-container-lowest rounded-2xl shadow-xl p-space-lg border border-surface-container-high/60">
              <div className="flex flex-col gap-space-xs mb-space-md">
                <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-bold">
                  Búsqueda Rápida
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Encuentra a tu nuevo compañero de vida
                </h2>
              </div>

              <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-space-md">
                {/* Especie */}
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1" htmlFor="species-select">
                    <span className="material-symbols-outlined text-[16px] text-secondary">category</span>
                    Especie
                  </label>
                  <div className="relative">
                    <select
                      id="species-select"
                      value={species}
                      onChange={(e) => setSpecies(e.target.value)}
                      className="w-full appearance-none bg-surface-container-low px-space-md py-space-sm rounded-lg font-body-md text-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary/40 transition-all pr-8 border border-transparent focus:border-primary-container"
                    >
                      <option value="all">Todas las especies</option>
                      <option value="perros">Perros</option>
                      <option value="gatos">Gatos</option>
                      <option value="otros">Otros compañeros</option>
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Ubicación */}
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1" htmlFor="location-select">
                    <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
                    Ubicación / Ciudad
                  </label>
                  <div className="relative">
                    <select
                      id="location-select"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full appearance-none bg-surface-container-low px-space-md py-space-sm rounded-lg font-body-md text-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary/40 transition-all pr-8 border border-transparent focus:border-primary-container"
                    >
                      <option value="all">Todas las regiones</option>
                      {locations.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Etapa / Edad */}
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1" htmlFor="age-select">
                    <span className="material-symbols-outlined text-[16px] text-secondary">calendar_today</span>
                    Etapa de vida
                  </label>
                  <div className="relative">
                    <select
                      id="age-select"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full appearance-none bg-surface-container-low px-space-md py-space-sm rounded-lg font-body-md text-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary/40 transition-all pr-8 border border-transparent focus:border-primary-container"
                    >
                      <option value="all">Cualquier edad</option>
                      <option value="cachorro">Cachorro / Bebé (menos de 1 año)</option>
                      <option value="joven">Joven (1-2 años)</option>
                      <option value="adulto">Adulto (3-7 años)</option>
                      <option value="senior">Senior (8+ años)</option>
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Botón Submit */}
                <div className="flex flex-col justify-end">
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-space-xs px-space-md py-space-sm h-[44px] rounded-lg bg-primary text-on-primary font-label-md text-label-md shadow hover:bg-primary-container transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span className="material-symbols-outlined text-[20px]">search</span>
                    <span>Buscar compañeros</span>
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* Mascotas listas para amar */}
          <section className="max-w-[1240px] mx-auto px-gutter py-space-2xl w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-xl gap-space-md">
              <div>
                <div className="inline-flex items-center gap-space-xs px-space-sm py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm mb-space-xs">
                  <span className="material-symbols-outlined text-[14px]">volunteer_activism</span>
                  Esperando un nuevo comienzo
                </div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">
                  Mascotas listas para amar
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
                  Conoce a algunos de nuestros amigos que están ansiosos por llenar tu hogar de lealtad, juegos y calidez.
                </p>
              </div>

              <Link
                href="/mascotas"
                className="inline-flex items-center gap-space-xs font-label-md text-label-md text-primary hover:text-on-surface transition-colors font-bold"
              >
                <span>Ver todas las mascotas en adopción</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
              {featuredPets.map((pet) => (
                <PetCard key={pet.id} pet={pet} />
              ))}
            </div>
          </section>

          {/* Métricas de Impacto */}
          <section className="w-full bg-surface-container py-space-2xl my-space-lg" id="impacto">
            <div className="max-w-[1240px] mx-auto px-gutter">
              <div className="text-center max-w-2xl mx-auto mb-space-xl">
                <h2 className="font-headline-lg text-headline-lg text-on-surface">
                  Nuestra red hoy
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
                  Conteos del catálogo actual de esta instalación.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg">
                <div className="flex flex-col items-center text-center p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40">
                  <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed mb-space-md">
                    <span className="material-symbols-outlined text-[28px]">pets</span>
                  </div>
                  <span className="font-display-lg text-display-lg text-primary font-bold">{metrics?.animals ?? '—'}</span>
                  <span className="font-label-md text-label-md text-on-surface mt-space-xs font-bold">Mascotas disponibles</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Compañeros publicados en el catálogo.</p>
                </div>

                <div className="flex flex-col items-center text-center p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40">
                  <div className="w-14 h-14 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed mb-space-md">
                    <span className="material-symbols-outlined text-[28px]">verified_user</span>
                  </div>
                  <span className="font-display-lg text-display-lg text-secondary font-bold">{metrics?.shelters ?? '—'}</span>
                  <span className="font-label-md text-label-md text-on-surface mt-space-xs font-bold">Refugios participantes</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Organizaciones activas en el directorio.</p>
                </div>

                <div className="flex flex-col items-center text-center p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40">
                  <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface mb-space-md">
                    <span className="material-symbols-outlined text-[28px]">favorite</span>
                  </div>
                  <span className="font-display-lg text-display-lg text-primary-container font-bold">{metrics?.urgent ?? '—'}</span>
                  <span className="font-label-md text-label-md text-on-surface mt-space-xs font-bold">Casos prioritarios</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Mascotas marcadas como urgentes por el refugio.</p>
                </div>

                <div className="flex flex-col items-center text-center p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40">
                  <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container mb-space-md">
                    <span className="material-symbols-outlined text-[28px]">diversity_3</span>
                  </div>
                  <span className="font-display-lg text-display-lg text-secondary font-bold">{metrics?.cities ?? '—'}</span>
                  <span className="font-label-md text-label-md text-on-surface mt-space-xs font-bold">Ciudades participantes</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Ubicaciones registradas en el directorio.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Cómo Adoptar Section */}
          <section className="max-w-[1240px] mx-auto px-gutter py-space-2xl w-full" id="proceso">
            <div className="text-center max-w-xl mx-auto mb-space-xl">
              <div className="inline-flex items-center gap-space-xs px-space-sm py-0.5 rounded-full bg-surface-container-low text-secondary font-label-sm text-label-sm mb-space-xs font-semibold">
                <span className="material-symbols-outlined text-[14px]">psychology_alt</span>
                Paso a paso
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">
                Un proceso ético y transparente
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
                Diseñado para garantizar la compatibilidad mutua y la felicidad duradera.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
              <div className="flex flex-col p-space-xl rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 relative">
                <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm mb-space-md font-bold">
                  1
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-space-xs font-bold">
                  Encuentra a tu match
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Explora perfiles detallados con información de personalidad, nivel de actividad y necesidades médicas particulares.
                </p>
              </div>

              <div className="flex flex-col p-space-xl rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 relative">
                <div className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-headline-sm text-headline-sm mb-space-md font-bold">
                  2
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-space-xs font-bold">
                  Solicitud & Entrevista
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Completa un formulario breve para conocer tu hogar y estilo de vida. El refugio se comunicará para una charla empática.
                </p>
              </div>

              <div className="flex flex-col p-space-xl rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 relative">
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-headline-sm text-headline-sm mb-space-md font-bold">
                  3
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-space-xs font-bold">
                  Bienvenida a casa
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Coordina con el refugio los requisitos, la entrega y las recomendaciones de adaptación y cuidados.
                </p>
              </div>
            </div>
          </section>

          {/* CTA Banner Final */}
          <section className="max-w-[1240px] mx-auto px-gutter mb-space-2xl w-full">
            <div className="rounded-3xl bg-surface-container-high p-space-xl md:p-space-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-space-xl shadow-sm border border-surface-variant/40">
              <div className="max-w-xl z-10">
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-space-sm font-bold">
                  ¿Aún no puedes adoptar pero quieres ayudar?
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant mb-space-lg">
                  Puedes ser hogar temporal, voluntario de paseos o donar insumos veterinarios para mantener a salvo a más animales.
                </p>
                <div className="flex flex-wrap gap-space-md">
                  {!isLoading && !isAuthenticated && <Link
                    href="/refugios"
                    className="px-space-lg py-space-md rounded-xl bg-primary text-on-primary font-label-md text-label-md shadow hover:bg-primary-container transition-all font-semibold"
                  >
                    Contactar un refugio
                  </Link>}
                  {!isLoading && !isAuthenticated && <Link
                    href="/registro"
                    className="px-space-lg py-space-md rounded-xl bg-surface-container-lowest text-on-surface font-label-md text-label-md shadow-xs hover:bg-surface-container transition-colors font-semibold"
                  >
                    Ser voluntario
                  </Link>}
                  {isAuthenticated && isRegularUser(user) && (
                    <Link href="/perfil?tab=voluntariado" className="px-space-lg py-space-md rounded-xl bg-primary text-on-primary font-bold">
                      Mi voluntariado
                    </Link>
                  )}
                </div>
              </div>

              <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-md flex-shrink-0 z-10">
                <img
                  className="w-full h-full object-cover"
                  alt="Voluntaria sosteniendo gatitos rescatados"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBD6i-igFs--mXQj0vwBXO1QawXA4zymjsdlryVh8sQRTNPhQUe9EHx3G8O93O_KeKn_GKGAzv-uLVlcQewJrqOglAJUMlURENVehmo5jVhH3uWBcXpCN6XdoI59jgGl1MHFR-2TyUy02r3iZTsXEyjPOZIkaKX0Vr08NmQRLIZiCsuvAq5whTW_lT6AceE-3TPzSZEYz7ex_A-2bgiy6p8mYw9jyQkUROezNqHN5VH5HigjdftKwtF"
                />
              </div>

              {/* Decorative ambient shape */}
              <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-secondary-fixed-dim opacity-30 blur-2xl pointer-events-none" />
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
