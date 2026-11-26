'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PetCard from '@/components/PetCard';
import { Pet } from '@/data/pets';
import { useAuth } from '@/context/AuthContext';
import { api, BackendSolicitud, errorMessage } from '@/lib/api';
import { backendAnimalToPet } from '@/lib/adapters';
import { isRegularUser, roleLabel } from '@/lib/auth';
import SessionStatus from '@/components/SessionStatus';
import VolunteerPanel from '@/components/VolunteerPanel';
import StaffProfile from '@/components/StaffProfile';
import { adoptionDetails } from '@/lib/presentation';

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <SessionStatus />;
  if (user && !isRegularUser(user)) return <StaffProfile key={user.id_usuario} />;
  return <Suspense fallback={<SessionStatus />}><ProfileContent key={user?.id_usuario ?? 'guest'} /></Suspense>;
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const tab = searchParams.get('tab');
  const activeTab = tab === 'solicitudes' || tab === 'voluntariado' ? tab : 'favoritos';
  const setActiveTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    window.history.replaceState(null, '', `/perfil?${params}`);
  };
  const [favoriteLoadError, setFavoriteLoadError] = useState('');
  const [applicationLoadError, setApplicationLoadError] = useState('');
  const [favoriteReload, setFavoriteReload] = useState(0);
  const [applicationReload, setApplicationReload] = useState(0);
  const [savedFavorites, setSavedFavorites] = useState<Pet[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState<boolean>(true);
  const [mySolicitudes, setMySolicitudes] = useState<BackendSolicitud[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState<boolean>(true);

  // Load user favorites from API
  useEffect(() => {
    let active = true;
    if (isAuthenticated) {
      api.favoritos
        .getMyFavoritos()
        .then((items) => {
          if (!active) return;
          if (items && items.length > 0) {
            const mapped = items
              .filter((f) => f.animal)
              .map((f) => backendAnimalToPet(f.animal!));
            setSavedFavorites(mapped);
          } else {
            setSavedFavorites([]);
          }
        })
        .catch((err) => {
          if (active) setFavoriteLoadError(errorMessage(err));
        })
        .finally(() => { if (active) setLoadingFavorites(false); });

    }
    return () => { active = false; };
  }, [isAuthenticated, user?.id_usuario, favoriteReload]);

  useEffect(() => {
    let active = true;
    if (isAuthenticated) {
      api.solicitudes
        .getMySolicitudes()
        .then((items) => {
          if (active && items) setMySolicitudes(items);
        })
        .catch((err) => {
          if (active) setApplicationLoadError(errorMessage(err));
        })
        .finally(() => { if (active) setLoadingSolicitudes(false); });
    }
    return () => { active = false; };
  }, [isAuthenticated, user?.id_usuario, applicationReload]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (isLoading) return <SessionStatus />;

  if (!isAuthenticated || !user) {
    return (
      <>
        <Navbar />
        <main className="w-full pt-28 pb-16 bg-background min-h-[calc(100vh-280px)] flex items-center justify-center">
          <div className="max-w-md w-full mx-auto px-4 text-center bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-surface-container-high">
            <span className="material-symbols-outlined text-[56px] text-primary mb-3">
              account_circle
            </span>
            <h2 className="font-headline-md text-xl font-bold text-on-surface mb-2">
              Inicia sesión para ver tu perfil
            </h2>
            <p className="font-body-sm text-on-surface-variant mb-6 text-sm">
              Accede a tus trámites de adopción en curso, mascotas guardadas en favoritos y datos personales.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href={`/login?next=${encodeURIComponent(`/perfil?tab=${activeTab}`)}`}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-container transition-all"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="w-full py-3 rounded-xl bg-surface-container text-on-surface font-semibold text-sm hover:bg-surface-container-high transition-all"
              >
                Crear una cuenta nueva
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const displayName = user.nombre_completo;
  const displayEmail = user.correo;
  const displayPhone = user.telefono;
  const roleBadge = roleLabel(user);

  return (
    <>
      <Navbar />

      <main className="w-full pt-20 bg-background min-h-[calc(100vh-280px)]">
        <div className="w-full max-w-[1240px] mx-auto px-gutter py-space-xl">
          {/* Profile Hero Block */}
          <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-lg md:p-space-xl shadow-sm mb-space-xl border border-surface-container-high/60">
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-secondary-fixed/40 blur-3xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 w-56 h-56 rounded-full bg-primary-fixed/30 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-space-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-lg">
                <div className="relative">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-3xl shadow-md ring-4 ring-white">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-sm">
                    <span
                      className="material-symbols-outlined text-[16px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                  </span>
                </div>

                <div className="space-y-space-xs min-w-0 max-w-full">
                  <div className="flex flex-wrap items-center gap-space-xs">
                    <h1 className="font-headline-md text-headline-md text-on-surface font-bold break-words">
                      {displayName}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                      <span className="material-symbols-outlined text-[14px]">shield</span>
                      {roleBadge}
                    </span>
                  </div>

                  <p className="font-body-md text-body-md text-on-surface-variant flex items-start gap-space-xs min-w-0">
                    <span className="material-symbols-outlined text-[18px] shrink-0">alternate_email</span>
                    <span className="break-all min-w-0">{displayEmail}</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 pt-1 font-body-sm text-body-sm text-tertiary">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">call</span>
                      {displayPhone}
                    </span>
                    {user.ciudad && <span className="flex items-center gap-1 break-words">
                      <span className="material-symbols-outlined text-[16px] shrink-0">location_on</span>{user.ciudad}
                    </span>}
                    {user.id_rol === 1 && (
                      <>
                        <span>•</span>
                        <Link
                          href="/admin"
                          className="font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          Ir al Panel de Administración
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Action / Status Summary Pill */}
              <div className="flex flex-col sm:flex-row items-center gap-space-md self-start md:self-auto">
                <div className="flex items-center gap-space-md bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-surface-container-high">
                  <div className="w-12 h-12 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[26px]">pets</span>
                  </div>
                  <div className="pr-space-xs">
                    <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                      Solicitudes registradas
                    </p>
                    <p className="font-headline-sm text-headline-sm text-primary font-bold">
                      {loadingSolicitudes ? 'Cargando…' : applicationLoadError ? 'No disponible' : `${mySolicitudes.length} Solicitud${mySolicitudes.length === 1 ? '' : 'es'}`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3.5 py-2.5 rounded-xl bg-error-container/20 text-error hover:bg-error-container/40 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Cerrar sesión"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span>Salir</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <nav aria-label="Secciones de mi perfil" className="flex flex-wrap items-center gap-2 pb-space-sm mb-space-lg" id="profileTabs">
            {isRegularUser(user) && (
              <button type="button" onClick={() => setActiveTab('voluntariado')} aria-pressed={activeTab === 'voluntariado'}
                className={`px-space-md py-space-sm rounded-lg font-semibold whitespace-nowrap ${activeTab === 'voluntariado' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                Mi voluntariado
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('favoritos')}
              aria-pressed={activeTab === 'favoritos'}
              className={`px-space-md py-space-sm rounded-lg font-label-md text-label-md flex items-center gap-space-xs transition-all duration-200 cursor-pointer ${
                activeTab === 'favoritos'
                  ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">favorite</span>
              <span>Favoritos Guardados ({loadingFavorites ? '…' : favoriteLoadError ? '—' : savedFavorites.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('solicitudes')}
              aria-pressed={activeTab === 'solicitudes'}
              className={`px-space-md py-space-sm rounded-lg font-label-md text-label-md flex items-center gap-space-xs transition-all duration-200 cursor-pointer ${
                activeTab === 'solicitudes'
                  ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">assignment</span>
              <span>Mis Solicitudes ({loadingSolicitudes ? '…' : applicationLoadError ? '—' : mySolicitudes.length})</span>
              {mySolicitudes.some((s) => s.estado_solicitud === 'pendiente') && (
                <span className="w-2 h-2 rounded-full bg-primary inline-block animate-pulse" />
              )}
            </button>
          </nav>
          {activeTab === 'voluntariado' && isRegularUser(user) && <VolunteerPanel key={user.id_usuario} />}

          {/* Tab 1: Favoritos */}
          {activeTab === 'favoritos' && (
            <section className="space-y-space-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                    Tus Compañeros Favoritos
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Mascotas que has guardado para darles seguimiento o postular cuando estés listo.
                  </p>
                </div>
              </div>

              {loadingFavorites ? (
                <div className="py-12 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[36px] animate-spin text-primary mb-2">
                    progress_activity
                  </span>
                  <p className="text-sm">Cargando tus favoritos desde la base de datos...</p>
                </div>
              ) : favoriteLoadError ? (
                <div role="alert" className="p-4 rounded-xl bg-error-container/30 text-error">
                  <p>No pudimos cargar tus favoritos. {favoriteLoadError}</p>
                  <button type="button" className="mt-2 underline font-semibold" onClick={() => {
                    setFavoriteLoadError(''); setLoadingFavorites(true); setFavoriteReload((value) => value + 1);
                  }}>Reintentar favoritos</button>
                </div>
              ) : savedFavorites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
                  {savedFavorites.map((pet) => (
                      <PetCard key={pet.id} pet={pet} initialFavorite favoriteAction="remove" returnTo="/perfil?tab=favoritos" onFavoriteChange={(favorite) => {
                        if (!favorite) setSavedFavorites((items) => items.filter((item) => item.id !== pet.id));
                      }} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-space-2xl bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant p-space-xl">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-space-sm">
                    favorite_border
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Aún no tienes favoritos guardados
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 mb-space-md max-w-sm mx-auto">
                    Explora el catálogo y pulsa el corazón en las mascotas que te interesen para guardarlas aquí.
                  </p>
                  <Link
                    href="/mascotas"
                    className="inline-flex px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors"
                  >
                    Explorar catálogo
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* Tab 2: Mis Solicitudes */}
          {activeTab === 'solicitudes' && (
            <section className="space-y-space-lg">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                  Mis solicitudes de adopción
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Monitorea cada fase de tus postulaciones registradas en la plataforma.
                </p>
              </div>

              {loadingSolicitudes ? (
                <div className="py-12 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[36px] animate-spin text-primary mb-2">
                    progress_activity
                  </span>
                  <p className="text-sm">Consultando tus solicitudes en el servidor...</p>
                </div>
              ) : applicationLoadError ? (
                <div role="alert" className="p-4 rounded-xl bg-error-container/30 text-error">
                  <p>No pudimos cargar tus solicitudes. {applicationLoadError}</p>
                  <button type="button" className="mt-2 underline font-semibold" onClick={() => {
                    setApplicationLoadError(''); setLoadingSolicitudes(true); setApplicationReload((value) => value + 1);
                  }}>Reintentar solicitudes</button>
                </div>
              ) : mySolicitudes.length > 0 ? (
                <div className="space-y-space-md">
                  {mySolicitudes.map((sol) => {
                    const statusColor =
                      sol.estado_solicitud === 'aprobada'
                        ? 'bg-secondary-fixed text-on-secondary-fixed'
                        : sol.estado_solicitud === 'rechazada'
                        ? 'bg-error-container text-error'
                        : 'bg-primary-fixed text-on-primary-fixed';

                    return (
                      <div
                        key={sol.id_solicitud}
                        className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-surface-container-high/60"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md pb-space-md border-b border-surface-container-high">
                          <div className="flex items-center gap-space-md">
                            {sol.animal?.foto_url ? (
                              <img
                                src={sol.animal.foto_url}
                                alt={sol.animal.nombre}
                                className="w-16 h-16 rounded-xl object-cover shadow-xs"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center text-2xl">
                                🐾
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                                  {sol.animal?.nombre || `Mascota #${sol.id_animal}`}
                                </h3>
                                <span className={`px-2 py-0.5 rounded-full font-label-sm text-xs font-bold capitalize ${statusColor}`}>
                                  {sol.estado_solicitud}
                                </span>
                              </div>
                              <p className="font-body-sm text-body-sm text-on-surface-variant">
                                Refugio: {sol.animal?.refugio?.nombre_organizacion || 'Organización'} • Folio #{sol.id_solicitud}
                              </p>
                            </div>
                          </div>

                          <Link
                            href={`/mascotas/${sol.id_animal}?from=${encodeURIComponent('/perfil?tab=solicitudes')}`}
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                          >
                            Ver ficha de la mascota
                            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                          </Link>
                        </div>

                        <div className="pt-3 text-xs text-on-surface-variant space-y-1">
                          <p>
                            <strong className="text-on-surface">Fecha de solicitud:</strong>{' '}
                            {new Date(sol.fecha_solicitud).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                          {sol.mensaje && (
                            <p>
                              <strong className="text-on-surface">Detalle de postulación:</strong> <span className="whitespace-pre-line">{adoptionDetails(sol)}</span>
                            </p>
                          )}
                          {sol.respuesta_publica && (
                            <p className="p-2 bg-surface-container-low rounded-lg text-secondary">
                              <strong>Respuesta del refugio:</strong> {sol.respuesta_publica}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-space-2xl bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant p-space-xl">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-space-sm">
                    assignment
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Aún no has enviado solicitudes de adopción
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 mb-space-md max-w-sm mx-auto">
                    Cuando encuentres al compañero ideal en el catálogo, haz clic en &quot;Postularme&quot; para iniciar tu trámite.
                  </p>
                  <Link
                    href="/mascotas"
                    className="inline-flex px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors"
                  >
                    Buscar mascotas
                  </Link>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
