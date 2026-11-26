'use client';

import { useRef, useState } from 'react';
import { api, ApiError, BackendRefugio, errorMessage, ManagedShelter, ShelterData } from '@/lib/api';
import { normalizeSearch } from '@/lib/presentation';
import Dialog from '@/components/Dialog';

const emptyForm: ShelterData = { nombre_organizacion: '', direccion: '', ciudad: '', estado: '', telefono: '' };
const fields = [
  { key: 'nombre_organizacion', label: 'Nombre del refugio', min: 2, max: 150 },
  { key: 'direccion', label: 'Dirección completa', min: 5, max: 255 },
  { key: 'ciudad', label: 'Ciudad', min: 2, max: 100 },
  { key: 'estado', label: 'Estado o provincia', min: 2, max: 100 },
  { key: 'telefono', label: 'Teléfono de contacto', min: 7, max: 30 },
] as const;
const statusNames: Record<string, string> = { activo: 'Activo', pendiente: 'Pendiente', suspendido: 'Suspendido' };
const buttonClass = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-60';

export default function AdminShelters({ items, loading, loadError, onRetry, onSaved, search }: {
  items: ManagedShelter[]; loading: boolean; loadError: string; search: string;
  onRetry: () => void; onSaved: (shelter: BackendRefugio) => void;
}) {
  const [filter, setFilter] = useState('todos');
  const [form, setForm] = useState<ShelterData>(emptyForm);
  const [editing, setEditing] = useState<ManagedShelter | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [decision, setDecision] = useState<ManagedShelter | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');

  const openForm = (item: ManagedShelter | null) => {
    setEditing(item);
    setForm(item ? { nombre_organizacion: item.nombre_organizacion, direccion: item.direccion,
      ciudad: item.ciudad, estado: item.estado, telefono: item.telefono } : { ...emptyForm });
    setError(''); setFieldErrors({}); setSuccess(''); setModalOpen(true);
  };
  const closeForm = () => { if (!busy.current) { setModalOpen(false); setError(''); } };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    const data = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])) as ShelterData;
    const errors: Record<string, string> = {};
    for (const field of fields) {
      if (data[field.key].length < field.min || data[field.key].length > field.max)
        errors[field.key] = `Introduce ${field.label.toLowerCase()} (${field.min}–${field.max} caracteres).`;
    }
    const digits = data.telefono.replace(/\D/g, '');
    if (!/^\+?[0-9 ()-]+$/.test(data.telefono) || digits.length < 7 || digits.length > 15)
      errors.telefono = 'Introduce un teléfono de 7 a 15 dígitos; puedes usar +, espacios, paréntesis o guiones.';
    setError(''); setFieldErrors(errors);
    if (Object.keys(errors).length) {
      document.getElementById(`shelter-${Object.keys(errors)[0]}`)?.focus();
      return;
    }
    busy.current = true; setSaving(true);
    try {
      const saved = editing ? await api.refugios.update(editing.id_refugio, data) : await api.refugios.create(data);
      setModalOpen(false);
      setSuccess(editing ? 'Datos del refugio actualizados.' : 'Refugio creado. Ya puedes seleccionarlo en Nuevo Ingreso.');
      onSaved(saved);
    } catch (error) {
      setError(errorMessage(error));
      if (error instanceof ApiError) setFieldErrors(error.fieldErrors);
    } finally { busy.current = false; setSaving(false); }
  };
  const changeStatus = async () => {
    if (!decision || busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try {
      const estado_cuenta = decision.estado_cuenta === 'activo' ? 'suspendido' : 'activo';
      const saved = await api.refugios.update(decision.id_refugio, { estado_cuenta });
      setDecision(null);
      setSuccess(estado_cuenta === 'activo' ? 'Refugio activado. Vuelve a recibir solicitudes.' :
        'Refugio suspendido. Se conservaron sus animales y su historial.');
      onSaved(saved);
    } catch (error) { setError(errorMessage(error)); }
    finally { busy.current = false; setSaving(false); }
  };
  const visible = items.filter((item) => (filter === 'todos' || item.estado_cuenta === filter) &&
    normalizeSearch(`${item.nombre_organizacion} ${item.direccion} ${item.ciudad} ${item.estado}`).includes(normalizeSearch(search)));

  return <section aria-labelledby="shelters-heading" className="space-y-4">
    <div className="flex flex-wrap justify-between items-start gap-3">
      <div>
        <h2 id="shelters-heading" className="text-xl font-bold">Gestión de refugios</h2>
        <p className="text-sm text-on-surface-variant">Administra organizaciones sin crear nuevas cuentas. Suspender conserva sus animales e historiales.</p>
      </div>
      <button type="button" onClick={() => openForm(null)} disabled={loading || !!loadError}
        className={`${buttonClass} bg-primary text-on-primary`}>Añadir refugio</button>
    </div>
    {success && <p role="status" className="p-3 rounded-lg bg-secondary-container text-on-secondary-container">{success}</p>}
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="shelter-status" className="text-sm font-semibold">Estado del refugio</label>
      <select id="shelter-status" value={filter} onChange={(event) => setFilter(event.target.value)}
        className="p-2 rounded-lg border border-outline-variant bg-surface-container-lowest">
        <option value="todos">Todos</option>
        {Object.entries(statusNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      {!loading && !loadError && <span className="text-sm text-on-surface-variant">{visible.length} de {items.length} refugios</span>}
    </div>
    {loading ? <p role="status">Cargando refugios…</p> : loadError ? <div role="alert" className="p-4 rounded-xl bg-error-container/30 text-error">
      <p>No pudimos cargar los refugios. {loadError}</p>
      <button type="button" onClick={onRetry} className="underline font-semibold mt-2">Reintentar refugios</button>
    </div> : visible.length ? <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {visible.map((item) => <article key={item.id_refugio} className="min-w-0 p-5 rounded-xl bg-surface-container-lowest border border-surface-container-high space-y-3">
        <div className="flex flex-wrap justify-between gap-2">
          <h3 className="font-bold break-words min-w-0">{item.nombre_organizacion}</h3>
          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${item.estado_cuenta === 'activo' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface'}`}>
            {statusNames[item.estado_cuenta] || item.estado_cuenta}
          </span>
        </div>
        <p className="text-sm text-on-surface-variant break-words">{item.direccion}</p>
        <p className="text-sm break-words">{item.ciudad}, {item.estado}</p>
        <p className="text-sm break-words">Teléfono: {item.telefono}</p>
        <p className="text-sm font-semibold">{item.total_animales} animales registrados</p>
        <div className="flex flex-wrap gap-2 border-t border-surface-container-high pt-3">
          <button type="button" onClick={() => openForm(item)} className={`${buttonClass} bg-surface-container text-on-surface`}
            aria-label={`Editar refugio: ${item.nombre_organizacion}`}>Editar datos</button>
          <button type="button" onClick={() => { setDecision(item); setError(''); setSuccess(''); }}
            className={`${buttonClass} ${item.estado_cuenta === 'activo' ? 'bg-error-container/30 text-error' : 'bg-secondary-container text-on-secondary-container'}`}
            aria-label={`${item.estado_cuenta === 'activo' ? 'Suspender' : 'Activar'} refugio: ${item.nombre_organizacion}`}>
            {item.estado_cuenta === 'activo' ? 'Suspender' : 'Activar'}
          </button>
        </div>
      </article>)}
    </div> : <p className="p-6 rounded-xl bg-surface-container-lowest text-on-surface-variant">
      {items.length ? 'No hay refugios que coincidan con la búsqueda y el estado. Ajusta los filtros.' : 'Aún no hay refugios. Añade el primero para registrar animales.'}
    </p>}
    {modalOpen && <Dialog titleId="shelter-form-title" busy={saving} onClose={closeForm}>
      <form noValidate onSubmit={save} className="p-6 bg-surface-container-lowest space-y-4">
        <h2 id="shelter-form-title" className="text-xl font-bold">{editing ? 'Editar refugio' : 'Añadir refugio'}</h2>
        <p className="text-sm text-on-surface-variant">Todos los campos son obligatorios. Los datos de contacto se mostrarán en el directorio cuando el refugio esté activo.</p>
        {fields.map((field) => <div key={field.key}>
          <label htmlFor={`shelter-${field.key}`} className="block text-sm font-semibold mb-1">{field.label}</label>
          <input id={`shelter-${field.key}`} type={field.key === 'telefono' ? 'tel' : 'text'} required
            minLength={field.min} maxLength={field.max} value={form[field.key]} disabled={saving}
            aria-invalid={!!fieldErrors[field.key]} aria-describedby={fieldErrors[field.key] ? `shelter-error-${field.key}` : undefined}
            onChange={(event) => { setForm({ ...form, [field.key]: event.target.value }); setFieldErrors({ ...fieldErrors, [field.key]: '' }); }}
            className="w-full p-3 rounded-lg bg-surface-container-low border border-outline-variant" />
          {fieldErrors[field.key] && <p id={`shelter-error-${field.key}`} role="alert" className="text-error text-sm mt-1">{fieldErrors[field.key]}</p>}
        </div>)}
        {error && <p role="alert" className="p-3 rounded-lg text-error bg-error-container/30">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={saving} onClick={closeForm} className={`${buttonClass} bg-surface-container text-on-surface`}>Cancelar</button>
          <button type="submit" disabled={saving} className={`${buttonClass} bg-primary text-on-primary`}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear refugio'}
          </button>
        </div>
      </form>
    </Dialog>}
    {decision && <Dialog titleId="shelter-decision-title" busy={saving} onClose={() => { if (!busy.current) setDecision(null); }}>
      <div className="p-6 bg-surface-container-lowest space-y-4">
        <h2 id="shelter-decision-title" className="text-xl font-bold">{decision.estado_cuenta === 'activo' ? 'Suspender refugio' : 'Activar refugio'}</h2>
        <p className="font-semibold break-words">{decision.nombre_organizacion}</p>
        <p className="text-sm text-on-surface-variant">{decision.estado_cuenta === 'activo'
          ? 'Dejará de aparecer en el directorio y sus animales saldrán del catálogo público. No recibirá nuevas solicitudes de adopción ni voluntariado ni nuevos ingresos. Sus animales, estados e historiales se conservarán; podrás seguir revisándolos y reactivarlo después.'
          : 'Volverá al directorio, sus animales disponibles aparecerán en el catálogo y podrá recibir nuevas solicitudes e ingresos. No se cambiarán los estados de sus animales ni las resoluciones anteriores.'}</p>
        {error && <p role="alert" className="p-3 rounded-lg text-error bg-error-container/30">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={saving} onClick={() => setDecision(null)} className={`${buttonClass} bg-surface-container text-on-surface`}>Cancelar</button>
          <button type="button" disabled={saving} onClick={changeStatus} className={`${buttonClass} bg-primary text-on-primary`}>
            {saving ? 'Guardando…' : decision.estado_cuenta === 'activo' ? 'Confirmar suspensión' : 'Confirmar activación'}
          </button>
        </div>
      </div>
    </Dialog>}
  </section>;
}
