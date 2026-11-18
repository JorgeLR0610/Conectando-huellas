'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isAdmin } from '@/lib/auth';
import SessionStatus from './SessionStatus';

export default function AdminRouteBoundary({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const redirect = !isLoading && isAdmin(user);
  useEffect(() => {
    if (redirect) router.replace('/admin');
  }, [redirect, router]);
  // Aplicar en las vistas públicas, nunca alrededor del LayoutRouter raíz.
  // Así no se bloquea la hidratación ni se montan consultas de catálogo antes
  // de validar la sesión.
  if (isLoading || redirect) return <SessionStatus />;
  return children;
}
