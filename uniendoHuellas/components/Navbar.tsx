'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from './Logo';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const admin = user?.id_rol === 1;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = admin ? [
    { href: '/admin', label: 'Panel de administración' },
    { href: '/perfil', label: 'Mi Perfil' },
  ] : [
    { href: '/', label: 'Inicio' },
    { href: '/mascotas', label: 'Buscar Mascotas' },
    { href: '/refugios', label: 'Refugios' },
    { href: '/#proceso', label: 'Cómo Adoptar' },
    ...(isAuthenticated ? [{ href: '/perfil', label: 'Mi Perfil' }] : []),
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-background/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-variant/50">
      <div className="h-20 max-w-[1240px] mx-auto px-gutter flex items-center justify-between gap-space-md">
        {/* Brand */}
        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-space-lg">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`font-label-md text-label-md transition-colors ${
                  isActive
                    ? 'text-primary font-bold border-b-2 border-primary py-1'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Items */}
        <div className="flex items-center gap-2 sm:gap-space-md">
          <ThemeToggle />
          {admin && <button type="button" onClick={() => { logout(); router.replace('/login'); }}
            className="text-error text-sm font-semibold">Cerrar sesión</button>}
          {!isLoading && !isAuthenticated ? (
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center justify-center px-space-md py-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all border border-surface-container-high"
            >
              Iniciar Sesión
            </Link>
          ) : null}

          {!isLoading && !isAuthenticated && <Link
            href="/registro"
            className="hidden sm:inline-flex items-center justify-center px-space-md py-space-sm rounded-lg bg-primary-container text-on-primary-container font-label-md text-label-md hover:bg-primary hover:text-on-primary transition-all shadow-[0_2px_8px_-2px_rgba(43,45,66,0.04)] hover:-translate-y-0.5 active:translate-y-0"
          >
              Ser voluntario
          </Link>}

          <Link
            href={isAuthenticated ? '/perfil' : '/login'}
            title={isAuthenticated ? `Perfil de ${user?.nombre_completo}` : 'Iniciar Sesión'}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold ring-2 ring-surface-container-high transition-transform hover:scale-105"
          >
            {isAuthenticated && user?.nombre_completo ? (
              user.nombre_completo.charAt(0).toUpperCase()
            ) : (
              <span className="material-symbols-outlined text-[20px]">person</span>
            )}
          </Link>

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            aria-label="Abrir menú de navegación"
            aria-expanded={mobileMenuOpen}
          >
            <span className="material-symbols-outlined text-[26px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-surface-container-lowest border-b border-surface-container-high px-gutter py-space-md shadow-lg animate-in fade-in duration-200">
          <nav className="flex flex-col gap-space-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 px-3 rounded-lg text-body-md font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-primary-fixed/50 text-primary font-bold'
                    : 'text-on-surface hover:bg-surface-container-low'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {!isLoading && !isAuthenticated && <div className="pt-2 border-t border-surface-container flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 text-center rounded-lg border border-outline-variant font-label-md text-on-surface"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/registro"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 text-center rounded-lg bg-primary text-white font-label-md"
              >
                Registrarme / Donar
              </Link>
            </div>}
          </nav>
        </div>
      )}
    </header>
  );
}
