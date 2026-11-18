'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import { api, BackendRefugio, DashboardStats, errorMessage } from '@/lib/api';
import SessionStatus from '@/components/SessionStatus';
import { AdminVolunteerPanel } from '@/components/VolunteerPanel';
import ImagePreview from '@/components/ImagePreview';
import { backendAnimalToPet } from '@/lib/adapters';

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  species: string;
  gender: string;
  age: string;
  entryDate: string;
  shelter: string;
  urgent: boolean;
  status: 'Disponible' | 'En Proceso' | 'Adoptado' | 'Cuarentena';
  image: string;
}

interface ApplicationItem {
  id: string;
  applicant: string;
  petName: string;
  email: string;
  date: string;
  housing: string;
  status: 'Pendiente' | 'Entrevista' | 'Aprobada' | 'Rechazada';
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const allowed = isAuthenticated && user?.id_rol === 1;

  const [activeTab, setActiveTab] = useState<'inventory' | 'requests' | 'volunteers'>('inventory');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [shelters, setShelters] = useState<BackendRefugio[]>([]);
  const [shelterId, setShelterId] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  // New animal form state
  const [newAnimal, setNewAnimal] = useState({
    name: '',
    species: 'Perro',
    raza: 'Mestizo',
    gender: 'Macho',
    age: '1 año',
    size: 'Mediano',
    description: '',
    urgent: false,
  });

  const loadAdminData = async () => {
    if (!allowed) return;
    try {
      const [statsData, animalsData, appsData, sheltersData] = await Promise.all([
        api.dashboard.getResumen(),
        api.animales.getAll({ estado_adopcion: 'todos' }),
        api.solicitudes.getAll(),
        api.dashboard.getRefugiosDirectorio(),
      ]);
      setError('');
      setStats(statsData);
      setShelters(sheltersData);
      {
        const mappedInventory: InventoryItem[] = animalsData.map((a) => {
          const pet = backendAnimalToPet(a);
          let st: InventoryItem['status'] = 'Disponible';
          if (a.estado_adopcion === 'adoptado') st = 'Adoptado';
          else if (a.estado_adopcion === 'en_proceso') st = 'En Proceso';

          return {
            id: String(a.id_animal),
            code: `#CH-${a.id_animal.toString().padStart(4, '0')}`,
            name: a.nombre,
            species: `${a.especie} (${a.raza || 'Mestizo'})`,
            gender: a.sexo,
            age: a.edad_estimada,
            entryDate: 'Activo',
            shelter: a.refugio?.nombre_organizacion || 'Refugio',
            urgent: pet.urgent,
            status: st,
            image: pet.images[0],
          };
        });
        setInventory(mappedInventory);
      }

      {
        const mappedApps: ApplicationItem[] = appsData.map((s) => {
          let st: ApplicationItem['status'] = 'Pendiente';
          if (s.estado_solicitud === 'aprobada') st = 'Aprobada';
          else if (s.estado_solicitud === 'rechazada') st = 'Rechazada';

          return {
            id: String(s.id_solicitud),
            applicant: s.usuario?.nombre_completo || 'Solicitante',
            petName: `${s.animal?.nombre || 'Mascota'} (#CH-${s.id_animal})`,
            email: s.usuario?.correo || '',
            date: new Date(s.fecha_solicitud).toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'short',
            }),
            housing: s.mensaje || 'Sin detalles adicionales',
            status: st,
          };
        });
        setApplications(mappedApps);
      }
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !allowed) router.replace(isAuthenticated ? '/' : '/login');
  }, [authLoading, allowed, isAuthenticated, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronizes remote data after session validation.
    if (allowed) void loadAdminData();
    // Fetch only after the backend-validated administrator session is available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  const handleAddAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !allowed) return;
    if (!shelterId) { setError('Selecciona el refugio que recibirá a la mascota.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.animales.createWithImage({
        id_refugio: Number(shelterId),
        nombre: newAnimal.name,
        especie: newAnimal.species,
        raza: newAnimal.raza,
        sexo: newAnimal.gender,
        edad_estimada: newAnimal.age || '1 año',
        tamano: newAnimal.size || 'Mediano',
        descripcion: newAnimal.description.trim() || undefined,
        es_urgente: newAnimal.urgent,
        estado_adopcion: 'disponible',
      }, photo);

      setModalOpen(false);
      setNewAnimal({
        name: '',
        species: 'Perro',
        raza: 'Mestizo',
        gender: 'Macho',
        age: '1 año',
        size: 'Mediano',
        description: '',
        urgent: false,
      });
      setPhoto(null);
      setShelterId('');
      await loadAdminData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setPhoto(null);
    setShelterId('');
    setError('');
    setNewAnimal({ name: '', species: 'Perro', raza: 'Mestizo', gender: 'Macho',
      age: '1 año', size: 'Mediano', description: '', urgent: false });
  };

  const toggleUrgency = async (item: InventoryItem) => {
    if (saving || !allowed) return;
    setSaving(true);
    setError('');
    try {
      await api.animales.update(item.id, { es_urgente: !item.urgent });
      setInventory((items) => items.map((entry) => entry.id === item.id ? { ...entry, urgent: !item.urgent } : entry));
    } catch (error) { setError(errorMessage(error)); }
    finally { setSaving(false); }
  };

  const handleUpdateAppStatus = async (id: string, newStatus: ApplicationItem['status']) => {
    if (saving || !allowed) return;
    setSaving(true);
    try {
      const backendStatus = newStatus === 'Aprobada' ? 'aprobada' : newStatus === 'Rechazada' ? 'rechazada' : 'pendiente';
      await api.solicitudes.updateStatus(id, {
        estado_solicitud: backendStatus,
        notas_internas: `Estado actualizado a ${newStatus} desde el panel de control.`,
      });

      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
      );
      await loadAdminData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.species.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'todos' ||
      (statusFilter === 'disponible' && item.status === 'Disponible') ||
      (statusFilter === 'proceso' && item.status === 'En Proceso') ||
      (statusFilter === 'adoptado' && item.status === 'Adoptado') ||
      (statusFilter === 'cuarentena' && item.status === 'Cuarentena');
    return matchesSearch && matchesStatus && (!urgentOnly || item.urgent);
  });

  const exportReport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Codigo,Nombre,Especie,Edad,Refugio,Estado,Urgente\n' +
      inventory
        .map((i) => `"${i.code}","${i.name}","${i.species}","${i.age}","${i.shelter}","${i.status}","${i.urgent ? 'Sí' : 'No'}"`)
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventario_refugio_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading || !allowed) return <SessionStatus />;
  const shelterName = 'Administración Central';

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row font-body-md text-on-surface antialiased">
      {/* Sidebar */}
      <aside className="w-full lg:w-72 bg-surface-container-low border-r border-surface-container-high p-space-md flex flex-col justify-between shrink-0">
        <div className="space-y-space-lg">
          {/* Brand header */}
          <div className="px-space-xs py-space-xs">
            <Logo />
            <span className="font-label-sm text-xs text-primary font-bold tracking-wider uppercase block mt-1">
              Portal Oficial de Refugios
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => { setActiveTab('inventory'); setUrgentOnly(false); }}
              className={`flex items-center gap-space-sm px-space-md py-space-sm rounded-xl font-label-md text-label-md transition-all text-left cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-secondary-container text-on-secondary-container font-bold shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">pets</span>
              <span>Inventario de Animales</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface font-semibold">
                {inventory.length}
              </span>
            </button>

            <button type="button" onClick={() => { setActiveTab('inventory'); setUrgentOnly(true); }}
              aria-pressed={activeTab === 'inventory' && urgentOnly}
              className={`ml-4 flex items-center gap-2 px-space-md py-2 rounded-xl text-sm font-semibold text-left ${activeTab === 'inventory' && urgentOnly ? 'bg-error-container text-error' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
              <span className="material-symbols-outlined text-[18px]">priority_high</span>
              Casos urgentes ({inventory.filter((item) => item.urgent).length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`flex items-center gap-space-sm px-space-md py-space-sm rounded-xl font-label-md text-label-md transition-all text-left cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-secondary-container text-on-secondary-container font-bold shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">assignment</span>
              <span>Solicitudes de Adopción</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary text-white font-bold">
                {applications.filter((a) => a.status === 'Pendiente').length}
              </span>
            </button>

            <button type="button" onClick={() => setActiveTab('volunteers')}
              className={`flex items-center gap-space-sm px-space-md py-space-sm rounded-xl font-semibold text-left ${activeTab === 'volunteers' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
              <span className="material-symbols-outlined text-[20px]">volunteer_activism</span>
              Voluntariado
            </button>

            <Link
              href="/perfil"
              className="flex items-center gap-space-sm px-space-md py-space-sm rounded-xl font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
              <span>Mi Perfil</span>
            </Link>
          </nav>
        </div>

        {/* Shelter ID Badge */}
        <div className="p-space-sm rounded-xl bg-surface-container flex items-center justify-between mt-space-lg">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-secondary">shield</span>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface font-bold truncate max-w-[150px]">
                {shelterName}
              </span>
              <span className="font-label-sm text-xs text-on-surface-variant">
                {user ? user.nombre_completo : 'Sesión local'}
              </span>
            </div>
          </div>
          <Link
            href="/admin"
            className="text-on-surface-variant hover:text-primary transition-colors p-1"
            title="Ir al panel de administración"
          >
            <span className="material-symbols-outlined text-[20px]">home</span>
          </Link>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-surface/85 backdrop-blur-xl border-b border-surface-container-high px-gutter flex items-center justify-between gap-space-md sticky top-0 z-30">
          <div className="flex items-center gap-space-sm w-80 min-w-0 flex-1 max-w-80 bg-surface-container-low px-space-md py-1.5 rounded-full border border-surface-container-high">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar mascota o registro..."
              className="bg-transparent border-none outline-none font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant w-full"
            />
          </div>

          <div className="flex items-center gap-space-md shrink-0">
            <button
              type="button"
              onClick={() => { setIsLoading(true); setError(''); void loadAdminData(); }}
              className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              title="Actualizar datos desde la API"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
            </button>
            <button
              type="button"
              onClick={() => { logout(); router.replace('/login'); }}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Cerrar sesión</span>
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        </header>

        {/* Content Container */}
        <main className="p-space-lg lg:p-space-xl flex-1 flex flex-col gap-space-xl">
          {error && <p role="alert" className="p-3 rounded-lg bg-error-container/40 text-error">{error}</p>}
          {isLoading && <p role="status">Actualizando datos…</p>}
          {/* Hero Welcome & Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                Gestión de Refugio y Adopciones
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Control centralizado del inventario de rescate, evaluaciones y flujo de adopción en tiempo real.
              </p>
            </div>

            <div className="flex items-center gap-space-sm flex-wrap">
              <button
                type="button"
                onClick={exportReport}
                className="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md shadow-xs hover:bg-surface-container transition-all border border-surface-container-high cursor-pointer font-semibold"
              >
                <span className="material-symbols-outlined text-[18px]">file_download</span>
                <span>Exportar CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md shadow-md hover:bg-primary-container transition-all cursor-pointer font-semibold"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Nuevo Ingreso</span>
              </button>
            </div>
          </div>

          {/* KPI Stat Cards (Real data from API) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs flex flex-col justify-between gap-space-md border border-surface-container-high">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                    Total en Refugios
                  </span>
                  <p className="font-display-lg text-display-lg text-on-surface mt-space-xs font-bold leading-none">
                    {stats ? stats.total_animales : inventory.length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">pets</span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs pt-space-xs font-label-sm text-label-sm text-secondary">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span className="font-semibold">{stats ? stats.total_animales_disponibles : inventory.length} disponibles</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs flex flex-col justify-between gap-space-md border border-surface-container-high">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                    Adopciones Exitosas
                  </span>
                  <p className="font-display-lg text-display-lg text-on-surface mt-space-xs font-bold leading-none">
                    {stats ? stats.total_animales_adoptados : 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">favorite</span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs pt-space-xs font-label-sm text-label-sm text-on-surface-variant">
                <span className="inline-block w-2 h-2 rounded-full bg-secondary" />
                <span className="font-medium">Vidas transformadas</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs flex flex-col justify-between gap-space-md border border-surface-container-high">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                    Solicitudes Pendientes
                  </span>
                  <p className="font-display-lg text-display-lg text-on-surface mt-space-xs font-bold leading-none">
                    {stats ? stats.solicitudes_pendientes : applications.filter((a) => a.status === 'Pendiente').length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[24px]">pending_actions</span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs pt-space-xs font-label-sm text-label-sm text-primary font-semibold">
                <span>Requieren revisión</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs flex flex-col justify-between gap-space-md border border-surface-container-high">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                    Refugios Activos
                  </span>
                  <p className="font-display-lg text-display-lg text-on-surface mt-space-xs font-bold leading-none">
                    {stats ? stats.total_refugios_activos : '—'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">home_work</span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs pt-space-xs font-label-sm text-label-sm text-on-surface-variant">
                <span>Red verificada</span>
              </div>
            </div>
          </div>

          {activeTab === 'volunteers' && <AdminVolunteerPanel />}

          {/* Tab 1: Inventory Table */}
          {activeTab === 'inventory' && (
            <div className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high overflow-hidden">
              <div className="p-space-md border-b border-surface-container-high flex flex-wrap items-center justify-between gap-space-md">
                <div className="flex items-center gap-space-xs overflow-x-auto">
                  {(['todos', 'disponible', 'proceso', 'adoptado'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setStatusFilter(filter)}
                      className={`px-space-md py-1 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                        statusFilter === filter
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={urgentOnly} onChange={(event) => setUrgentOnly(event.target.checked)} />
                  Solo casos urgentes
                </label>
                <span className="text-xs text-on-surface-variant">
                  {filteredInventory.length} animales registrados
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-low text-on-surface-variant text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Mascota</th>
                      <th className="py-3 px-4">Especie / Raza</th>
                      <th className="py-3 px-4">Sexo • Edad</th>
                      <th className="py-3 px-4">Refugio / Ubicación</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Prioridad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {filteredInventory.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-4 flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div>
                            <span className="font-bold text-on-surface block">{item.name}</span>
                            <span className="text-xs text-on-surface-variant font-mono">{item.code}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-on-surface-variant">{item.species}</td>
                        <td className="py-3 px-4 text-on-surface-variant">
                          {item.gender} • {item.age}
                        </td>
                        <td className="py-3 px-4 text-on-surface-variant">{item.shelter}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              item.status === 'Disponible'
                                ? 'bg-secondary-fixed text-on-secondary-fixed'
                                : item.status === 'Adoptado'
                                ? 'bg-surface-container-highest text-on-surface'
                                : 'bg-primary-fixed text-on-primary-fixed'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button type="button" disabled={saving} aria-pressed={item.urgent}
                            onClick={() => toggleUrgency(item)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap disabled:opacity-60 ${item.urgent ? 'bg-error-container text-error' : 'bg-surface-container text-on-surface-variant'}`}>
                            {item.urgent ? 'Quitar urgencia' : 'Marcar urgente'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!isLoading && !filteredInventory.length && <p className="p-4 text-on-surface-variant">No hay animales para estos filtros.</p>}
              </div>
            </div>
          )}

          {/* Tab 2: Requests Table */}
          {activeTab === 'requests' && (
            <div className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high overflow-hidden">
              <div className="p-space-md border-b border-surface-container-high flex items-center justify-between">
                <h3 className="font-bold text-on-surface">Postulaciones de Adopción Recibidas</h3>
                <span className="text-xs text-on-surface-variant">
                  {applications.length} solicitudes registradas
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-low text-on-surface-variant text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Postulante</th>
                      <th className="py-3 px-4">Mascota</th>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Detalles</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-on-surface block">{app.applicant}</span>
                          <span className="text-xs text-on-surface-variant">{app.email}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-primary">{app.petName}</td>
                        <td className="py-3 px-4 text-xs text-on-surface-variant">{app.date}</td>
                        <td className="py-3 px-4 text-xs text-on-surface-variant max-w-xs truncate">
                          {app.housing}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              app.status === 'Aprobada'
                                ? 'bg-secondary-fixed text-on-secondary-fixed'
                                : app.status === 'Rechazada'
                                ? 'bg-error-container text-error'
                                : 'bg-primary-fixed text-on-primary-fixed'
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          {app.status === 'Pendiente' && (
                            <>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleUpdateAppStatus(app.id, 'Aprobada')}
                                className="px-2.5 py-1 rounded bg-secondary text-white text-xs font-bold hover:bg-secondary/90 transition-colors cursor-pointer"
                              >
                                Aprobar
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleUpdateAppStatus(app.id, 'Rechazada')}
                                className="px-2.5 py-1 rounded bg-error-container text-error text-xs font-bold hover:bg-error-container/80 transition-colors cursor-pointer"
                              >
                                Rechazar
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!isLoading && !applications.length && <p className="p-4 text-on-surface-variant">No hay solicitudes de adopción.</p>}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* New Animal Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="animal-dialog-title" className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-xl border border-surface-container-high max-h-[90vh] overflow-y-auto">
            <h3 id="animal-dialog-title" className="font-headline-sm text-lg font-bold text-on-surface flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary">add_circle</span>
              Nuevo Ingreso de Animal
            </h3>
            <p className="font-body-sm text-xs text-on-surface-variant mb-4">
              Registra una nueva mascota a la base de datos oficial del refugio.
            </p>

            <form onSubmit={handleAddAnimal} className="space-y-3">
              {error && <p role="alert" className="text-error text-sm">{error}</p>}
              <div>
                <label htmlFor="animal-shelter" className="block text-xs font-semibold mb-1">Refugio</label>
                <select id="animal-shelter" required value={shelterId} onChange={(event) => setShelterId(event.target.value)}
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-sm">
                  <option value="">Selecciona un refugio</option>
                  {shelters.map((shelter) => <option key={shelter.id_refugio} value={shelter.id_refugio}>{shelter.nombre_organizacion}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="animal-name" className="block text-xs font-semibold text-on-surface mb-1">Nombre</label>
                <input
                  id="animal-name"
                  type="text"
                  required
                  value={newAnimal.name}
                  onChange={(e) => setNewAnimal({ ...newAnimal, name: e.target.value })}
                  placeholder="Ej. Toby"
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-sm outline-none border border-transparent focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="animal-species" className="block text-xs font-semibold text-on-surface mb-1">Especie</label>
                  <select
                    id="animal-species"
                    value={newAnimal.species}
                    onChange={(e) => setNewAnimal({ ...newAnimal, species: e.target.value })}
                    className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-sm outline-none border border-transparent focus:border-primary"
                  >
                    <option value="Perro">Perro</option>
                    <option value="Gato">Gato</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="animal-breed" className="block text-xs font-semibold text-on-surface mb-1">Raza</label>
                  <input
                    id="animal-breed"
                    type="text"
                    required
                    value={newAnimal.raza}
                    onChange={(e) => setNewAnimal({ ...newAnimal, raza: e.target.value })}
                    placeholder="Ej. Mestizo"
                    className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-sm outline-none border border-transparent focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="animal-age" className="block text-xs font-semibold text-on-surface mb-1">Edad</label>
                  <input
                    id="animal-age"
                    type="text"
                    value={newAnimal.age}
                    onChange={(e) => setNewAnimal({ ...newAnimal, age: e.target.value })}
                    placeholder="1 año"
                    className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-sm outline-none border border-transparent focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="animal-sex" className="block text-xs font-semibold text-on-surface mb-1">Sexo</label>
                  <select
                    id="animal-sex"
                    value={newAnimal.gender}
                    onChange={(e) => setNewAnimal({ ...newAnimal, gender: e.target.value })}
                    className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-sm outline-none border border-transparent focus:border-primary"
                  >
                    <option value="Macho">Macho</option>
                    <option value="Hembra">Hembra</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="animal-size" className="block text-xs font-semibold text-on-surface mb-1">Tamaño</label>
                  <select
                    id="animal-size"
                    value={newAnimal.size}
                    onChange={(e) => setNewAnimal({ ...newAnimal, size: e.target.value })}
                    className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-sm outline-none border border-transparent focus:border-primary"
                  >
                    <option value="Pequeño">Pequeño</option>
                    <option value="Mediano">Mediano</option>
                    <option value="Grande">Grande</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="animal-description" className="block text-xs font-semibold text-on-surface mb-1">Descripción del animal (opcional)</label>
                <textarea
                  id="animal-description"
                  rows={3}
                  maxLength={5000}
                  value={newAnimal.description}
                  onChange={(e) => setNewAnimal({ ...newAnimal, description: e.target.value })}
                  placeholder="Personalidad, historia y cuidados que necesita."
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-sm outline-none border border-transparent focus:border-primary"
                />
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={newAnimal.urgent}
                  onChange={(event) => setNewAnimal({ ...newAnimal, urgent: event.target.checked })} />
                Caso urgente
              </label>

              <div className="space-y-2">
                <label htmlFor="animal-photo" className="block text-xs font-semibold">Imagen del animal (opcional)</label>
                <input id="animal-photo" ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={saving}
                  className="w-full text-sm"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
                      setError('Selecciona una imagen JPG, PNG o WebP de hasta 5 MB.');
                      event.target.value = '';
                      setPhoto(null);
                      return;
                    }
                    setError('');
                    setPhoto(file);
                  }} />
                <p className="text-xs text-on-surface-variant">JPG, PNG o WebP; máximo 5 MB y 20 megapíxeles. Sin foto se asignará una imagen ilustrativa por especie.</p>
                {photo && <>
                  <ImagePreview file={photo} />
                  <button type="button" disabled={saving} className="text-error text-sm underline"
                    onClick={() => { setPhoto(null); if (photoInput.current) photoInput.current.value = ''; }}>Quitar imagen</button>
                </>}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeModal}
                  className="px-4 py-2 bg-surface-container text-on-surface rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-container cursor-pointer"
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
