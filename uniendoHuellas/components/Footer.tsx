'use client';

import Link from 'next/link';
import Logo from './Logo';
import { useAuth } from '@/context/AuthContext';

export default function Footer() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (user?.id_rol === 1) return (
    <footer className="mt-auto border-t border-surface-container-high bg-surface-container-low px-gutter py-space-lg">
      <div className="max-w-[1240px] mx-auto flex flex-wrap justify-between items-center gap-4 text-sm">
        <p>Conectando Huellas · Administración</p>
        <nav className="flex gap-4">
          <Link href="/admin" className="text-primary hover:underline">Panel de administración</Link>
          <Link href="/perfil" className="text-primary hover:underline">Mi Perfil</Link>
        </nav>
      </div>
    </footer>
  );
  return (
    <footer className="w-full bg-surface-container-low py-space-2xl mt-auto border-t border-surface-container-high/50">
      <div className="max-w-[1240px] mx-auto px-gutter">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-space-xl mb-space-xl">
          <div className="md:col-span-1">
            <div className="mb-space-sm">
              <Logo size="small" />
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Una plataforma cálida y humana dedicada a encontrar hogares dignos y responsables para cada compañero de cuatro patas.
            </p>
          </div>

          <div>
            <h4 className="font-label-md text-label-md text-on-surface font-bold mb-space-sm">
              Explorar
            </h4>
            <ul className="space-y-space-xs font-body-sm text-body-sm text-on-surface-variant">
              <li>
                <Link className="hover:text-primary transition-colors" href="/mascotas">
                  Mascotas en adopción
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary transition-colors" href="/mascotas#casos-urgentes">
                  Casos de rescate urgente
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary transition-colors" href="/#proceso">
                  Proceso de adopción ético
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-label-md text-label-md text-on-surface font-bold mb-space-sm">
              Comunidad
            </h4>
            <ul className="space-y-space-xs font-body-sm text-body-sm text-on-surface-variant">
              <li>
                <Link className="hover:text-primary transition-colors" href="/#impacto">
                  Historias rescatadas
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary transition-colors" href={isAuthenticated ? '/perfil?tab=voluntariado' : '/registro'}>
                  Voluntariado activo
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary transition-colors" href={isAuthenticated ? '/perfil?tab=voluntariado' : '/registro'}>
                  Hogares temporales
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-label-md text-label-md text-on-surface font-bold mb-space-sm">
              Para Refugios
            </h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm leading-relaxed">
               Consulta los refugios participantes y confirma directamente sus requisitos de adopción y colaboración.
            </p>
            <Link href="/refugios" className="text-secondary font-semibold hover:underline">Directorio de refugios</Link>
            {!isLoading && user?.id_rol === 1 && <Link
              className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary hover:text-on-surface font-bold transition-colors"
              href="/admin"
            >
              <span>Portal de Gestión</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>}
          </div>
        </div>

        <div className="pt-space-lg border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-space-md text-on-surface-variant font-body-sm text-body-sm">
          <p>Conectando Huellas · Proyecto de demostración académica.</p>
          <div className="flex gap-space-md font-label-sm text-label-sm">
            <Link className="hover:text-primary transition-colors" href="/informacion#privacidad">
              Privacidad
            </Link>
            <Link className="hover:text-primary transition-colors" href="/informacion#condiciones">
              Términos de Servicio
            </Link>
            <Link className="hover:text-primary transition-colors" href="/refugios">
              Contacto Ético
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
