'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { roleLabel } from '@/lib/auth';
import Navbar from './Navbar';
import Footer from './Footer';

export default function StaffProfile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user) return null;
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-space-2xl px-gutter min-h-[70vh]">
        <section className="max-w-3xl mx-auto rounded-2xl border border-surface-container-high bg-surface-container-lowest p-space-lg sm:p-space-xl shadow-sm space-y-6">
          <div>
            <p className="text-primary font-semibold mb-2">{roleLabel(user)}</p>
            <h1 className="font-headline-lg text-headline-lg font-bold break-words">{user.nombre_completo}</h1>
            <p className="mt-2 text-on-surface-variant">Datos personales de tu cuenta de gestión.</p>
          </div>
          <dl className="space-y-4">
            <div><dt className="font-semibold">Correo electrónico</dt><dd className="break-all">{user.correo}</dd></div>
            <div><dt className="font-semibold">Teléfono</dt><dd>{user.telefono}</dd></div>
            {user.ciudad && <div><dt className="font-semibold">Ciudad / Región</dt><dd className="break-words">{user.ciudad}</dd></div>}
          </dl>
          <div className="flex flex-wrap gap-3">
            {user.id_rol === 1 && <Link href="/admin" className="px-5 py-3 rounded-xl bg-primary text-white font-bold">Ir al panel de administración</Link>}
            <button type="button" onClick={() => { logout(); router.replace('/login'); }}
              className="px-5 py-3 rounded-xl bg-error-container/30 text-error font-semibold">Cerrar sesión</button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
