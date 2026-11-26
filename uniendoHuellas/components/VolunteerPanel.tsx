'use client';

import { useEffect, useState } from 'react';
import { api, BackendRefugio, errorMessage, VolunteerApplication, VolunteerMode } from '@/lib/api';

const modes: Record<VolunteerMode, string> = {
  paseos: 'Paseos y compañía', traslados: 'Traslados', hogar_temporal: 'Hogar temporal',
};
const inputClass = 'w-full p-3 rounded-lg bg-surface-container-low border border-outline-variant focus:ring-2 focus:ring-primary outline-none';

function ApplicationCard({ application, children }: { application: VolunteerApplication; children?: React.ReactNode }) {
  return (
    <article className="p-space-md rounded-xl border border-surface-container-high bg-surface-container-lowest space-y-2">
      <div className="flex flex-wrap justify-between gap-2">
        <h3 className="font-bold">{modes[application.modalidad]} · {application.refugio.nombre_organizacion}</h3>
        <span className="capitalize text-sm font-semibold text-primary">{application.estado}</span>
      </div>
      <p className="text-sm text-on-surface-variant break-words">Disponibilidad: {application.disponibilidad}</p>
      {application.comentarios && <p className="text-sm whitespace-pre-wrap break-words">{application.comentarios}</p>}
      {children}
    </article>
  );
}

export default function VolunteerPanel() {
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [shelters, setShelters] = useState<BackendRefugio[]>([]);
  const [shelter, setShelter] = useState('');
  const [mode, setMode] = useState<VolunteerMode>('paseos');
  const [availability, setAvailability] = useState('');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [success, setSuccess] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([api.voluntariado.mine(), api.dashboard.getRefugiosDirectorio()])
      .then(([items, shelters]) => { if (active) { setApplications(items); setShelters(shelters); } })
      .catch((error) => { if (active) setLoadError(errorMessage(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    setSuccess('');
    if (!shelter || availability.trim().length < 5) {
      setError('Selecciona un refugio e indica tu disponibilidad (al menos 5 caracteres).');
      return;
    }
    setSaving(true);
    try {
      const application = await api.voluntariado.create({
        id_refugio: Number(shelter), modalidad: mode,
        disponibilidad: availability.trim(), comentarios: comments.trim() || undefined,
      });
      setApplications((prev) => [application, ...prev]);
      setAvailability('');
      setComments('');
      setSuccess('¡Gracias por ayudar! Tu solicitud quedó enviada para revisión.');
    } catch (error) { setError(errorMessage(error)); }
    finally { setSaving(false); }
  };

  return (
    <section className="space-y-space-lg">
      <div>
        <h2 className="font-headline-md text-headline-md font-bold">Mi voluntariado</h2>
        <p className="text-on-surface-variant">Ofrece tu tiempo o un hogar temporal y sigue la revisión de tus solicitudes.</p>
      </div>
      {loading ? <p role="status">Cargando tu voluntariado…</p> : loadError ? null : (
        <form onSubmit={submit} className="p-space-lg rounded-xl border border-surface-container-high bg-surface-container-lowest space-y-4">
          <h3 className="font-bold text-lg">Quiero colaborar</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="volunteer-shelter" className="block font-semibold text-sm mb-1">Refugio</label>
              <select id="volunteer-shelter" required disabled={saving} value={shelter} onChange={(event) => setShelter(event.target.value)} className={inputClass}>
                <option value="">Selecciona un refugio</option>
                {shelters.map((item) => <option key={item.id_refugio} value={item.id_refugio}>{item.nombre_organizacion} — {item.ciudad}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="volunteer-mode" className="block font-semibold text-sm mb-1">Tipo de colaboración</label>
              <select id="volunteer-mode" disabled={saving} value={mode} onChange={(event) => setMode(event.target.value as VolunteerMode)} className={inputClass}>
                {Object.entries(modes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="volunteer-availability" className="block font-semibold text-sm mb-1">Disponibilidad</label>
            <input id="volunteer-availability" required minLength={5} maxLength={300} disabled={saving} value={availability}
              onChange={(event) => setAvailability(event.target.value)} placeholder="Ej. Sábados de 9 a 13 h, a partir de diciembre" className={inputClass} />
          </div>
          <div>
            <label htmlFor="volunteer-comments" className="block font-semibold text-sm mb-1">Comentarios (opcional)</label>
            <textarea id="volunteer-comments" maxLength={1000} disabled={saving} value={comments} onChange={(event) => setComments(event.target.value)}
              placeholder="Cuéntanos tu experiencia o el espacio disponible para acogida." className={inputClass} rows={3} />
          </div>
          <p className="text-xs text-on-surface-variant">La solicitud no confirma una asignación. El equipo revisará tus datos antes de coordinar la colaboración.</p>
          <button disabled={saving || !shelters.length} className="bg-primary text-white px-5 py-3 rounded-lg font-bold disabled:opacity-60">
            {saving ? 'Enviando…' : 'Enviar solicitud de voluntariado'}
          </button>
        </form>
      )}
      {loadError && <div role="alert" className="text-error bg-error-container/30 p-3 rounded-lg">
        <p>No pudimos cargar tu voluntariado. {loadError}</p><button type="button" onClick={() => {
          setLoading(true); setLoadError(''); setReload((value) => value + 1);
        }} className="underline text-sm mt-2">Volver a cargar</button>
      </div>}
      {error && <p role="alert" className="text-error bg-error-container/30 p-3 rounded-lg">{error}</p>}
      {success && <p role="status" className="text-secondary bg-secondary-container/40 p-3 rounded-lg">{success}</p>}
      <h3 className="font-bold text-lg">Mis solicitudes de colaboración</h3>
      {!loading && !loadError && !applications.length && <p className="text-on-surface-variant">Aún no has enviado solicitudes de voluntariado.</p>}
      {!loadError && applications.map((item) => <ApplicationCard key={item.id_solicitud} application={item} />)}
    </section>
  );
}

export function AdminVolunteerPanel() {
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    api.voluntariado.all().then((items) => { if (active) setApplications(items); })
      .catch((error) => { if (active) setError(errorMessage(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  const review = async (id: number, status: 'aprobada' | 'rechazada') => {
    setBusy(id);
    setError('');
    try {
      const updated = await api.voluntariado.updateStatus(id, status);
      setApplications((items) => items.map((item) => item.id_solicitud === id ? updated : item));
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(null); }
  };
  return (
    <section className="space-y-4">
      <h2 className="font-headline-md text-headline-md font-bold">Solicitudes de voluntariado</h2>
      <button type="button" className="text-primary underline" onClick={() => {
        setLoading(true); setError(''); setReload((value) => value + 1);
      }}>Actualizar voluntariado</button>
      {error && <p role="alert" className="text-error">{error}</p>}
      {loading ? <p role="status">Cargando solicitudes…</p> : applications.length === 0 ? <p>No hay solicitudes de voluntariado.</p> : applications.map((item) => (
        <ApplicationCard key={item.id_solicitud} application={item}>
          <p className="text-sm break-all">{item.usuario?.nombre_completo} · {item.usuario?.correo} · {item.usuario?.telefono}</p>
          {item.estado === 'pendiente' && <div className="flex gap-2">
            <button type="button" disabled={busy !== null} onClick={() => review(item.id_solicitud, 'aprobada')}
              className="bg-secondary text-white px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-60">Aprobar</button>
            <button type="button" disabled={busy !== null} onClick={() => review(item.id_solicitud, 'rechazada')}
              className="bg-error-container text-error px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-60">Rechazar</button>
          </div>}
        </ApplicationCard>
      ))}
    </section>
  );
}
