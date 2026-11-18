'use client';

import { RefObject, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function useGuestOnly(submittedHere: RefObject<boolean>) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  // Next.js can retain a page in an Activity boundary. A new visit must
  // enforce the guest guard again, even after a successful form submission.
  useEffect(() => () => { submittedHere.current = false; }, [submittedHere]);
  useEffect(() => {
    if (!isLoading && isAuthenticated && !submittedHere.current) router.replace(user?.id_rol === 1 ? '/admin' : '/');
  }, [user?.id_rol, isAuthenticated, isLoading, submittedHere, router]);
  return isLoading || isAuthenticated;
}
