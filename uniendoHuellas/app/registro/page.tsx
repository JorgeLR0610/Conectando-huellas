'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SessionStatus from '@/components/SessionStatus';
import { useAuth } from '@/context/AuthContext';
import { ApiError, errorMessage, RegisterData } from '@/lib/api';
import { useGuestOnly } from '@/lib/useGuestOnly';

type Field = 'nombre_completo' | 'correo' | 'telefono' | 'password' | 'ciudad';
const fields: { key: Field; label: string; type: string; placeholder: string; autoComplete: string; max?: number }[] = [
  { key: 'nombre_completo', label: 'Nombre y Apellido', type: 'text', placeholder: 'Ej. Valeria Morales', autoComplete: 'name', max: 150 },
  { key: 'correo', label: 'Correo electrónico', type: 'email', placeholder: 'nombre@ejemplo.com', autoComplete: 'email', max: 150 },
  { key: 'telefono', label: 'Teléfono / WhatsApp', type: 'tel', placeholder: '+52 81 1234 5678', autoComplete: 'tel', max: 30 },
  { key: 'password', label: 'Crear Contraseña', type: 'password', placeholder: 'Mínimo 8 caracteres', autoComplete: 'new-password' },
  { key: 'ciudad', label: 'Ciudad / Región', type: 'text', placeholder: 'Escribe tu ciudad o región', autoComplete: 'address-level2', max: 150 },
];

function validate(key: Field, value: string) {
  if (key === 'correo') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? '' : 'Introduce un correo válido, como nombre@ejemplo.com.';
  if (key === 'password') {
    if ([...value].length < 8) return 'Usa al menos 8 caracteres para tu contraseña.';
    if (new TextEncoder().encode(value).length > 72) return 'La contraseña es demasiado larga; utiliza como máximo 72 bytes.';
    return '';
  }
  const min = key === 'telefono' ? 5 : 2;
  return value.trim().length >= min ? ''
    : key === 'nombre_completo' ? 'Introduce tu nombre y apellido.'
    : key === 'telefono' ? 'Introduce un teléfono de contacto válido.'
    : 'Introduce tu ciudad o región.';
}

export default function RegisterPage() {
  const { sessionVersion } = useAuth();
  return <RegistrationForm key={sessionVersion} />;
}

function RegistrationForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [data, setData] = useState<RegisterData>({
    nombre_completo: '', correo: '', telefono: '', password: '', ciudad: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const submittedHere = useRef(false);
  const blocked = useGuestOnly(submittedHere);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    for (const { key } of fields) {
      const message = validate(key, data[key]);
      if (message) nextErrors[key] = message;
    }
    if (!acceptTerms) nextErrors.terms = 'Acepta los términos y el compromiso ético para continuar.';
    setErrors(nextErrors);
    setGeneralError('');
    if (Object.keys(nextErrors).length) {
      const first = fields.find(({ key }) => nextErrors[key]);
      document.getElementById(first?.key || 'terms')?.focus();
      return;
    }
    setIsSubmitting(true);
    submittedHere.current = true;
    try {
      await register({
        ...data, nombre_completo: data.nombre_completo.trim(), correo: data.correo.trim(),
        telefono: data.telefono.trim(), ciudad: data.ciudad.trim(),
      });
      router.replace('/perfil');
    } catch (error) {
      submittedHere.current = false;
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length) {
        setErrors(error.fieldErrors);
      } else {
        setGeneralError(errorMessage(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (blocked) return <SessionStatus />;

  return (
    <>
      <Navbar />
      <main className="w-full pt-20 bg-background min-h-[calc(100vh-280px)]">
        <div className="max-w-[1240px] mx-auto px-gutter py-space-xl grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          <section className="lg:col-span-5 space-y-space-lg">
            <span className="inline-block rounded-full bg-secondary-container px-4 py-2 text-secondary font-semibold text-sm">
              Comunidad Conectando Huellas
            </span>
            <h2 className="font-display-lg text-display-lg font-bold leading-tight">Cada historia feliz comienza con un primer paso.</h2>
            <p className="text-on-surface-variant">
              Encuentra a tu nuevo compañero o colabora con refugios como voluntario y hogar temporal.
            </p>
            <img className="w-full h-72 object-cover rounded-xl shadow-sm" alt="Perro rescatado esperando un hogar"
              src="https://images.unsplash.com/photo-1552053831-71594a27632d?w=600" />
            <div className="bg-surface-container-low p-space-md rounded-xl border border-surface-container-high">
              <h3 className="font-bold mb-2">Compromiso Ético & Seguridad</h3>
              <p className="text-sm text-on-surface-variant">Tus datos de contacto solo se compartirán con el personal autorizado para revisar tus solicitudes.</p>
            </div>
          </section>
          <section className="lg:col-span-7 bg-surface-container-lowest rounded-xl shadow-md p-space-lg md:p-space-xl border border-surface-container-high">
            <h1 className="font-headline-lg text-headline-lg font-bold">Crea tu cuenta y conecta una huella</h1>
            <p className="text-on-surface-variant mt-2 mb-space-lg">Una sola cuenta para adoptar, guardar favoritos y colaborar como voluntario u hogar temporal.</p>
            <form noValidate onSubmit={handleSubmit} className="space-y-space-md">
              <fieldset disabled={isSubmitting} className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <legend className="sr-only">Datos de tu cuenta</legend>
                {fields.map(({ key, label, type, placeholder, autoComplete, max }) => (
                  <div key={key} className={key === 'nombre_completo' ? 'sm:col-span-2' : ''}>
                    <label htmlFor={key} className="block font-semibold text-sm mb-1">{label}</label>
                    <input id={key} name={key} type={type} value={data[key]} required
                      autoComplete={autoComplete} placeholder={placeholder} maxLength={max}
                      minLength={key === 'password' ? 8 : undefined}
                      list={key === 'ciudad' ? 'cities' : undefined}
                      aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : undefined}
                      onBlur={() => setErrors((prev) => ({ ...prev, [key]: validate(key, data[key]) }))}
                      onChange={(event) => {
                        setData({ ...data, [key]: event.target.value });
                        setErrors((prev) => ({ ...prev, [key]: '' }));
                      }}
                      className={`w-full px-3 py-3 rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary ${errors[key] ? 'border border-error' : 'border border-transparent'}`} />
                    {errors[key] && <p id={`${key}-error`} role="alert" className="text-error text-sm mt-1">{errors[key]}</p>}
                  </div>
                ))}
              </fieldset>
              <datalist id="cities">
                {['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Santiago de Chile'].map((city) => <option key={city} value={city} />)}
              </datalist>
              <p className="text-xs text-on-surface-variant">Puedes escribir cualquier ciudad o región; las sugerencias son opcionales.</p>
              <label className="flex gap-2 items-start text-sm">
                <input id="terms" type="checkbox" checked={acceptTerms} disabled={isSubmitting}
                  aria-invalid={!!errors.terms} aria-describedby={errors.terms ? 'terms-error' : undefined}
                  onChange={(event) => { setAcceptTerms(event.target.checked); setErrors((prev) => ({ ...prev, terms: '' })); }} />
                Acepto los Términos de Servicio y el Compromiso Ético de Bienestar Animal de Conectando Huellas.
              </label>
              {errors.terms && <p id="terms-error" role="alert" className="text-error text-sm">{errors.terms}</p>}
              {generalError && <p role="alert" className="p-3 bg-error-container/40 text-error rounded-lg text-sm">{generalError}</p>}
              <button type="submit" disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-bold shadow-md hover:bg-primary-container disabled:opacity-60">
                {isSubmitting ? 'Creando tu cuenta…' : 'Crear mi cuenta'}
              </button>
              <p className="text-center text-sm text-on-surface-variant">¿Ya tienes cuenta? <Link href="/login" className="text-primary font-semibold hover:underline">Inicia sesión aquí</Link></p>
            </form>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
