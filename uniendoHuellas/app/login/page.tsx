'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SessionStatus from '@/components/SessionStatus';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/lib/api';
import { useGuestOnly } from '@/lib/useGuestOnly';

export default function LoginPage() {
  const { sessionVersion } = useAuth();
  return <LoginForm key={sessionVersion} />;
}

function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const submittedHere = useRef(false);
  const blocked = useGuestOnly(submittedHere);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Introduce un correo válido, como nombre@ejemplo.com.');
      return;
    }
    if (!password) { setError('Introduce tu contraseña para continuar.'); return; }
    setIsSubmitting(true);
    submittedHere.current = true;
    try {
      const user = await login(email.trim(), password);
      router.replace(user.id_rol === 1 ? '/admin' : '/perfil');
    } catch (error) {
      submittedHere.current = false;
      setError(errorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (blocked) return <SessionStatus />;

  return (
    <>
      <Navbar />
      <main className="w-full pt-20 bg-background min-h-[calc(100vh-280px)]">
        <div className="max-w-[1120px] mx-auto px-gutter py-space-2xl grid grid-cols-1 lg:grid-cols-2 gap-space-xl items-center">
          <section className="hidden lg:block space-y-space-lg">
            <span className="inline-block bg-secondary-container text-secondary rounded-full px-4 py-2 text-sm font-semibold">Comunidad de Adopción Ética</span>
            <h1 className="font-display-lg text-display-lg leading-tight font-bold">Cada sesión te acerca a tu <span className="text-primary italic">nuevo hogar.</span></h1>
            <p className="text-on-surface-variant">Sigue tus solicitudes, guarda tus mascotas favoritas y conecta con refugios para ayudar.</p>
            <img className="w-full h-72 rounded-xl object-cover shadow-lg" alt="Gato rescatado"
              src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600" />
          </section>
          <section className="w-full max-w-[540px] mx-auto bg-surface-container-lowest rounded-xl shadow-md p-space-lg sm:p-space-xl border border-surface-container-high">
            <h2 className="font-headline-lg text-headline-lg font-bold">Bienvenido de nuevo</h2>
            <p className="text-on-surface-variant mt-2 mb-space-lg">Ingresa a tu cuenta para continuar.</p>
            <form noValidate onSubmit={handleLogin} className="space-y-space-md">
              <div>
                <label htmlFor="email" className="block font-semibold text-sm mb-1">Correo electrónico</label>
                <input id="email" type="email" autoComplete="email" required disabled={isSubmitting}
                  value={email} onChange={(event) => { setEmail(event.target.value); setEmailError(''); }}
                  aria-invalid={!!emailError} aria-describedby={emailError ? 'email-error' : undefined}
                  placeholder="tuemail@ejemplo.com"
                  className="w-full p-3 rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary" />
                {emailError && <p id="email-error" role="alert" className="text-sm text-error mt-1">{emailError}</p>}
              </div>
              <div>
                <label htmlFor="password" className="block font-semibold text-sm mb-1">Contraseña</label>
                <div className="relative">
                  <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                    required disabled={isSubmitting} value={password} onChange={(event) => setPassword(event.target.value)}
                    className="w-full p-3 pr-12 rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-3 text-on-surface-variant">
                    <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
              {error && <p role="alert" className="p-3 rounded-lg bg-error-container/40 text-error text-sm">{error}</p>}
              <button type="submit" disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-bold shadow-md hover:bg-primary-container disabled:opacity-60">
                {isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
              </button>
              <p className="text-center text-sm text-on-surface-variant">
                ¿No tienes una cuenta aún? <Link href="/registro" className="text-primary font-semibold hover:underline">Regístrate gratis aquí</Link>
              </p>
            </form>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
