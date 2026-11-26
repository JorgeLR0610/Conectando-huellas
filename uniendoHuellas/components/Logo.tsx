'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Logo({ size = 'default' }: { size?: 'small' | 'default' | 'large' }) {
  const { user } = useAuth();
  const isSmall = size === 'small';
  const isLarge = size === 'large';

  return (
    <Link href={user?.id_rol === 1 ? '/admin' : '/'} aria-label="Conectando Huellas" className="inline-flex items-center gap-2 group transition-opacity hover:opacity-90">
      <svg
        className={isSmall ? "h-6 w-auto" : isLarge ? "h-10 w-auto" : "h-8 w-auto"}
        viewBox="0 0 200 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform="translate(4, 5)">
          <path d="M18 30C13 30 7 26 7 20C7 14 13 10 18 10C23 10 29 14 29 20C29 26 23 30 18 30Z" fill="#E07A5F" fillOpacity="0.9"/>
          <circle cx="10" cy="8" r="4.5" fill="#81B29A"/>
          <circle cx="26" cy="8" r="4.5" fill="#81B29A"/>
          <circle cx="4" cy="18" r="3.5" fill="#F4A261"/>
          <circle cx="32" cy="18" r="3.5" fill="#F4A261"/>
          <path d="M18 17C16 15 13 16 13 18C13 21 18 24 18 24C18 24 23 21 23 18C23 16 20 15 18 17Z" fill="#FFFFFF"/>
        </g>
        <text x="46" y="27" fontFamily="'Plus Jakarta Sans', system-ui, sans-serif" fontSize="16" fontWeight="700" fill="currentColor" letterSpacing="-0.3">
          Conectando
        </text>
        <text x="46" y="41" fontFamily="'Plus Jakarta Sans', system-ui, sans-serif" fontSize="13" fontWeight="600" fill="#E07A5F" letterSpacing="0.5">
          HUELLAS
        </text>
      </svg>
    </Link>
  );
}
