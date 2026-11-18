'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Pet } from '@/data/pets';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { backendAnimalToPet } from '@/lib/adapters';
import AdminRouteBoundary from '@/components/AdminRouteBoundary';

interface PetDetailClientProps {
  pet: Pet;
  initialId?: string;
}

export default function PetDetailClient(props: PetDetailClientProps) {
  return <AdminRouteBoundary><PetDetailContent {...props} /></AdminRouteBoundary>;
}

function PetDetailContent({ pet: initialPet, initialId }: PetDetailClientProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [pet, setPet] = useState<Pet>(initialPet);
  const [selectedImage, setSelectedImage] = useState<string>(initialPet.images[0]);
  const [favorite, setFavorite] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adoptionError, setAdoptionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Fetch live detail from API if available
  useEffect(() => {
    let active = true;
    const targetId = initialId || initialPet.id;
    if (targetId) {
      api.animales
        .getDetail(targetId)
        .then((backendAnimal) => {
          if (active && backendAnimal) {
            const adapted = backendAnimalToPet(backendAnimal);
            setPet(adapted);
            if (adapted.images.length > 0) {
              setSelectedImage(adapted.images[0]);
            }
            if (backendAnimal.es_favorito !== undefined) {
              setFavorite(backendAnimal.es_favorito);
            }
          }
        })
        .catch((error) => {
          if (active) setLoadError(error instanceof ApiError && error.status === 404 ? 'Esta mascota no existe o ya no está disponible.' : errorMessage(error));
        })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [initialId, initialPet.id]);

  // Form states pre-filled with authenticated user data if available
  const [formData, setFormData] = useState({
    name: user?.nombre_completo || '',
    email: user?.correo || '',
    phone: user?.telefono || '',
    housingType: 'casa-patio',
    experience: 'si',
    notes: '',
  });

  // Check if this animal is favorite for current user
  useEffect(() => {
    const animalIdNum = parseInt(pet.id, 10);
    if (isAuthenticated && !isNaN(animalIdNum)) {
      api.favoritos
        .check(animalIdNum)
        .then((res) => {
          setFavorite(res.es_favorito);
        })
        .catch(() => {});
    }
  }, [isAuthenticated, user?.id_usuario, pet.id]);

  const toggleFavorite = async () => {
    const animalIdNum = parseInt(pet.id, 10);
    if (!isAuthenticated) {
      alert('Inicia sesión para guardar a esta mascota en tus favoritos.');
      router.push('/login');
      return;
    }

    const nextState = !favorite;
    setFavorite(nextState);

    try {
      if (!isNaN(animalIdNum)) {
        if (nextState) {
          await api.favoritos.add(animalIdNum);
        } else {
          await api.favoritos.removeByAnimal(animalIdNum);
        }
      }
    } catch (err) {
      console.warn('Error sincronizando favorito con API:', err);
      setFavorite(!nextState);
    }
  };

  const handleSubmitAdoption = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdoptionError(null);
    setIsSubmitting(true);

    const animalIdNum = parseInt(pet.id, 10);
    const mensajeTexto = `[Vivienda: ${formData.housingType}, Experiencia: ${formData.experience}, Tel: ${formData.phone || user?.telefono || 'No especificado'}] ${formData.notes || ''}`;

    if (!isAuthenticated) {
      alert('Para formalizar tu solicitud de adopción, por favor inicia sesión o crea una cuenta.');
      router.push(`/login`);
      setIsSubmitting(false);
      return;
    }

    try {
      if (!isNaN(animalIdNum)) {
        await api.solicitudes.create({
          id_animal: animalIdNum,
          mensaje: mensajeTexto,
        });
      }
      setSubmitted(true);
    } catch (err) {
      setAdoptionError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenVisit = () => {
    setFormData((prev) => ({
      ...prev,
      name: user?.nombre_completo || '',
      email: user?.correo || '',
      phone: user?.telefono || '',
      notes: `Hola, me gustaría agendar una visita previa de fin de semana para conocer a ${pet.name} en persona.`,
    }));
    setModalOpen(true);
  };

  if (loading || loadError) return (
    <>
      <Navbar />
      <main className="pt-32 pb-16 px-gutter min-h-[70vh] text-center">
        {loading ? <p role="status">Cargando la ficha…</p> : <p role="alert" className="text-error">{loadError}</p>}
        <Link href="/mascotas" className="inline-block mt-4 text-primary underline">Volver al catálogo</Link>
      </main>
      <Footer />
    </>
  );

  return (
    <>
      <Navbar />

      <main className="w-full pt-20 bg-background min-h-[calc(100vh-280px)]">
        <div className="w-full max-w-[1240px] mx-auto px-gutter py-space-xl">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm mb-space-lg">
            <Link href="/mascotas" className="hover:text-primary transition-colors flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Volver al listado</span>
            </Link>
            <span>/</span>
            <span className="capitalize">{pet.species}</span>
            <span>/</span>
            <span className="text-on-surface font-semibold">
              {pet.name} (Ref. #{pet.id.toUpperCase()}-204)
            </span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
            {/* Left Column: Photos, Info, Story, Shelter */}
            <section className="lg:col-span-7 flex flex-col gap-space-xl">
              {/* Photo Gallery Card */}
              <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container-high/40">
                <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-surface-container mb-space-md shadow-inner">
                  <img
                    src={selectedImage}
                    alt={pet.name}
                    className="w-full h-full object-cover transition-all duration-300"
                  />
                  <div className="absolute top-space-md left-space-md flex flex-wrap gap-space-xs">
                    <span className="px-space-sm py-1 bg-surface-container-lowest/90 backdrop-blur-md rounded-full text-secondary font-label-sm text-label-sm font-bold shadow-xs flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-secondary" />
                      Listo para adopción
                    </span>
                    <span className="px-space-sm py-1 bg-surface-container-lowest/90 backdrop-blur-md rounded-full text-primary font-label-sm text-label-sm font-bold shadow-xs">
                      Rescate verificado
                    </span>
                  </div>

                  <button
                    onClick={toggleFavorite}
                    aria-label="Guardar en favoritos"
                    className={`absolute top-space-md right-space-md w-10 h-10 rounded-full bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-center transition-all shadow-xs hover:scale-110 cursor-pointer ${
                      favorite ? 'text-primary' : 'text-on-surface-variant'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[22px]"
                      style={{ fontVariationSettings: favorite ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      favorite
                    </span>
                  </button>
                </div>

                {/* Gallery Thumbnails */}
                <div className="grid grid-cols-5 gap-space-sm">
                  {pet.images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImage(imgUrl)}
                      className={`gallery-thumb rounded-lg overflow-hidden aspect-[4/3] bg-surface-container transition-all cursor-pointer ${
                        selectedImage === imgUrl
                          ? 'ring-2 ring-primary opacity-100 shadow-xs'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`${pet.name} foto ${idx + 1}`}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Pet Info & Attributes */}
              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-surface-container-high/40">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-space-xs mb-space-md">
                  <div>
                    <h1 className="font-display-lg text-display-lg text-on-surface font-bold">
                      {pet.name}
                    </h1>
                    <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[18px] text-secondary">
                        location_on
                      </span>
                      {pet.shelter} • {pet.location}
                    </p>
                  </div>
                  <div className="inline-flex items-center px-space-md py-space-xs rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md font-semibold">
                    {pet.breed}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm mb-space-lg">
                  <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col items-center text-center">
                    <span className="material-symbols-outlined text-primary mb-1">pets</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Especie</span>
                    <span className="font-label-md text-label-md text-on-surface font-semibold capitalize">
                      {pet.species}
                    </span>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col items-center text-center">
                    <span className="material-symbols-outlined text-primary mb-1">calendar_today</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Edad</span>
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      {pet.age}
                    </span>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col items-center text-center">
                    <span className="material-symbols-outlined text-primary mb-1">scale</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Tamaño</span>
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      {pet.size}
                    </span>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col items-center text-center">
                    <span className="material-symbols-outlined text-secondary mb-1">bolt</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Energía</span>
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      {pet.energy}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm bg-surface-container-low/60 rounded-lg p-space-md">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                    </div>
                    <div>
                      <span className="block font-label-sm text-label-sm text-on-surface-variant">
                        Esterilización
                      </span>
                      <span className="font-label-md text-label-md text-on-surface font-semibold">
                        {pet.sterilized ? 'Sí, esterilizado' : 'En proceso'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-sm">
                    <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">vaccines</span>
                    </div>
                    <div>
                      <span className="block font-label-sm text-label-sm text-on-surface-variant">
                        Esquema de vacunas
                      </span>
                      <span className="font-label-md text-label-md text-on-surface font-semibold">
                        {pet.vaccinated ? 'Al día y desparasitado' : 'En seguimiento'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Story */}
              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-surface-container-high/40">
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold mb-space-sm">
                  Conoce su historia
                </h2>
                <div className="space-y-space-md text-on-surface-variant font-body-md text-body-md leading-relaxed">
                  <p>{pet.story || pet.description}</p>
                </div>

                <div className="mt-space-lg pt-space-md border-t border-surface-container-high/60">
                  <h3 className="font-label-md text-label-md text-on-surface mb-space-sm uppercase tracking-wider font-bold">
                    Compatibilidad y hábitos
                  </h3>
                  <div className="flex flex-wrap gap-space-xs">
                    {pet.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-space-md py-1.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm flex items-center gap-1.5 font-medium"
                      >
                        <span className="material-symbols-outlined text-[16px] text-secondary">
                          check_circle
                        </span>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shelter Card */}
              <div className="bg-surface-container-low rounded-xl p-space-lg shadow-sm border border-surface-variant/40">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md mb-space-md">
                  <div className="flex items-center gap-space-md">
                    <div className="w-14 h-14 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed-variant shrink-0">
                      <span className="material-symbols-outlined text-[32px]">nature_people</span>
                    </div>
                    <div>
                      <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
                        Refugio Aliado Verificado
                      </span>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                        {pet.shelter}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenVisit}
                    className="px-space-md py-space-sm rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors shadow-xs inline-flex items-center gap-1.5 font-semibold cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">event_available</span>
                    Agendar visita previa
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md text-body-sm font-body-sm text-on-surface-variant pt-space-sm border-t border-surface-container-high/60">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px] shrink-0">
                      pin_drop
                    </span>
                    <span>
                      {pet.shelterContact?.address || 'Instalaciones centrales verificadas'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px] shrink-0">
                      schedule
                    </span>
                    <span>
                      {pet.shelterContact?.hours || 'Mar a Dom: 10:30 - 17:30 hrs'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px] shrink-0">
                      mark_email_read
                    </span>
                    <span>
                      {pet.shelterContact?.email || 'contacto@adopta.org'}<br />
                      {pet.shelterContact?.phone || '+56 9 8456 2210'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Right Sticky Sidebar: Call to Action & Process */}
            <aside className="lg:col-span-5 sticky top-24 space-y-space-md">
              <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-md border border-surface-container-high/40">
                <div className="mb-space-md">
                  <div className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-md bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm mb-space-sm font-semibold">
                    <span className="material-symbols-outlined text-[16px]">volunteer_activism</span>
                    <span>Adopción responsable</span>
                  </div>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                    ¿Sientes que {pet.name} es tu compañero ideal?
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 leading-relaxed">
                    Abrirle las puertas a {pet.name} significa regalarle la familia amorosa y comprometida que siempre esperó. Acompáñanos en este camino de respeto, paciencia y afecto sincero.
                  </p>
                </div>

                <div className="space-y-space-sm my-space-lg">
                  <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider mb-space-xs">
                    ¿Cómo es el proceso?
                  </h3>
                  <div className="flex items-start gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
                    <div className="w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center font-bold text-primary shrink-0 shadow-xs text-label-md">
                      1
                    </div>
                    <div>
                      <span className="font-semibold font-body-sm text-on-surface block">
                        Postulación digital rápida
                      </span>
                      <span className="text-body-sm text-on-surface-variant">
                        Completa tus datos en solo 3 minutos.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
                    <div className="w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center font-bold text-primary shrink-0 shadow-xs text-label-md">
                      2
                    </div>
                    <div>
                      <span className="font-semibold font-body-sm text-on-surface block">
                        Entrevista con {pet.shelter}
                      </span>
                      <span className="text-body-sm text-on-surface-variant">
                        Revisión remota y orientación responsable.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
                    <div className="w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center font-bold text-primary shrink-0 shadow-xs text-label-md">
                      3
                    </div>
                    <div>
                      <span className="font-semibold font-body-sm text-on-surface block">
                        Encuentro presencial
                      </span>
                      <span className="text-body-sm text-on-surface-variant">
                        Visita para interactuar con {pet.name} y confirmar compatibilidad.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-space-xs space-y-space-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, name: user?.nombre_completo || '', email: user?.correo || '', phone: user?.telefono || '' }));
                      setModalOpen(true);
                    }}
                    className="w-full py-space-md px-space-lg rounded-xl bg-primary-container text-on-primary font-headline-sm text-body-md font-bold hover:bg-primary transition-all duration-200 shadow-md flex items-center justify-center gap-2 group text-center cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">pets</span>
                    <span>Iniciar Solicitud de Adopción</span>
                    <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                      arrow_forward
                    </span>
                  </button>

                  <div className="flex items-center justify-center gap-2 text-on-surface-variant font-body-sm text-body-sm text-center">
                    <span className="material-symbols-outlined text-secondary text-[18px]">
                      verified_user
                    </span>
                    <span>Sin costo inicial • Tiempo de respuesta estimado: <strong>48h</strong></span>
                  </div>
                </div>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low flex items-center gap-space-md border border-surface-container-high/40">
                <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary shadow-xs shrink-0">
                  <span className="material-symbols-outlined text-[22px]">security</span>
                </div>
                <div className="text-on-surface-variant font-body-sm text-body-sm leading-relaxed">
                  <span className="font-semibold text-on-surface block">Proceso de adopción seguro</span>
                  Entregas bajo contrato legal, con microchip registrado y apoyo de adiestramiento conductual post-adopción.
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Adoption Application Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-space-lg shadow-2xl relative border border-surface-container-high">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setSubmitted(false);
                }}
                className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>

              {!submitted ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-primary material-symbols-outlined text-[24px]">pets</span>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      Postulación para adoptar a {pet.name}
                    </h3>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                    Tu postulación será enviada al equipo de <strong>{pet.shelter}</strong>. Te responderán por WhatsApp o correo en menos de 48 horas.
                  </p>

                  <form onSubmit={handleSubmitAdoption} className="space-y-space-sm">
                    <div>
                      <label className="block text-xs font-semibold text-on-surface mb-1">
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ej. Camila Navarro"
                        className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-sm border border-transparent focus:border-primary outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-on-surface mb-1">
                          Correo
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="camila@email.com"
                          className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-sm border border-transparent focus:border-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-on-surface mb-1">
                          Teléfono / WhatsApp
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+56 9 1234 5678"
                          className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-sm border border-transparent focus:border-primary outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-on-surface mb-1">
                        Tipo de Vivienda
                      </label>
                      <select
                        value={formData.housingType}
                        onChange={(e) => setFormData({ ...formData, housingType: e.target.value })}
                        className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-sm border border-transparent focus:border-primary outline-none"
                      >
                        <option value="casa-patio">Casa con patio cerrado</option>
                        <option value="depto-malla">Departamento con protecciones/malla</option>
                        <option value="depto-sin-malla">Departamento regular</option>
                        <option value="parcela">Parcela / Campo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-on-surface mb-1">
                        Mensaje o consultas para el refugio
                      </label>
                      <textarea
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Cuéntanos un poco sobre tu rutina, otros animales en casa o tu disponibilidad..."
                        className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-sm border border-transparent focus:border-primary outline-none"
                      />
                    </div>

                    {adoptionError && (
                      <div className="p-2.5 rounded-lg bg-error-container/40 border border-error text-error text-xs">
                        {adoptionError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 rounded-lg bg-primary text-white font-label-md font-bold hover:bg-primary-container transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="material-symbols-outlined text-[18px] animate-spin">
                            progress_activity
                          </span>
                          <span>Enviando postulación...</span>
                        </>
                      ) : (
                        <>
                          <span>Enviar postulación gratuita</span>
                          <span className="material-symbols-outlined text-[18px]">send</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="text-center py-space-md">
                  <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mx-auto mb-space-sm">
                    <span className="material-symbols-outlined text-[36px]">check_circle</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-2">
                    ¡Solicitud enviada con éxito!
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-lg leading-relaxed">
                    Hemos registrado tu interés en <strong>{pet.name}</strong>. El equipo de {pet.shelter} revisará tu perfil y te contactará a la brevedad.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Link
                      href="/perfil"
                      className="px-space-md py-2 bg-primary text-white rounded-lg font-label-md font-bold"
                    >
                      Ver estado en Mi Perfil
                    </Link>
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-space-md py-2 bg-surface-container text-on-surface rounded-lg font-label-md cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
