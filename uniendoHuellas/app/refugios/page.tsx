'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AdminRouteBoundary from '@/components/AdminRouteBoundary';
import { api, BackendRefugio, errorMessage } from '@/lib/api';
import { determineCityKey } from '@/lib/adapters';
import { contactAvailable, normalizeSearch } from '@/lib/presentation';

export default function SheltersPage() {
  return <AdminRouteBoundary><Shelters /></AdminRouteBoundary>;
}

function Shelters() {
  const [shelters, setShelters] = useState<BackendRefugio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  useEffect(() => {
    let active = true;
    api.dashboard.getRefugiosDirectorio().then((items) => { if (active) setShelters(items); })
      .catch((error) => { if (active) setError(errorMessage(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  const filtered = shelters.filter((shelter) => normalizeSearch(`${shelter.nombre_organizacion} ${shelter.ciudad} ${shelter.estado}`).includes(normalizeSearch(search)));
  return <><Navbar /><main className="max-w-[1240px] mx-auto px-gutter pt-32 pb-16 min-h-[70vh]">
    <h1 className="text-3xl font-bold mb-3">Refugios participantes</h1>
    <p className="text-on-surface-variant mb-6">Conoce los refugios y sus mascotas. Confirma horarios, requisitos y visitas antes de acudir.</p>
    <label htmlFor="shelter-search" className="font-semibold block mb-2">Buscar por refugio o ciudad</label>
    <input id="shelter-search" value={search} onChange={(event) => setSearch(event.target.value)} type="search"
      className="w-full max-w-lg rounded-lg bg-surface-container-low p-3 mb-6 border border-outline-variant" />
    {loading && <p role="status">Cargando refugios…</p>}
    {error && <p role="alert" className="text-error">{error}{' '}<button type="button" className="underline" onClick={() => { setLoading(true); setError(''); setReload((value) => value + 1); }}>Reintentar</button></p>}
    {!loading && !error && <><p className="text-sm mb-4" role="status">{filtered.length} refugios encontrados</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{filtered.map((shelter) =>
        <article key={shelter.id_refugio} className="rounded-2xl bg-surface-container-lowest border border-surface-container-high p-6 space-y-3">
          <h2 className="text-xl font-bold">{shelter.nombre_organizacion}</h2>
          <p className="text-secondary font-semibold">{shelter.ciudad}, {shelter.estado}</p>
          <p className="text-sm">{shelter.direccion}</p>
          {contactAvailable(shelter.telefono) ?
            <a className="block text-primary underline" href={`tel:${shelter.telefono.replace(/[^\d+]/g, '')}`}>{shelter.telefono}</a> :
            <p className="text-sm text-on-surface-variant">Contacto no disponible en esta instalación.</p>}
          <Link className="inline-block text-primary font-semibold underline" href={`/mascotas?location=${encodeURIComponent(
            // The same key as the catalog adapter, including non-predefined cities.
            determineCityKey(shelter.ciudad))}`}>Ver mascotas en esta ciudad</Link>
        </article>)}</div>
      {!filtered.length && <p>No hay refugios que coincidan con la búsqueda.</p>}
    </>}
  </main><Footer /></>;
}
