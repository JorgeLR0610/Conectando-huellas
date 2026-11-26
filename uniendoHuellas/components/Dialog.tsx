'use client';

import { ReactNode, useEffect, useRef } from 'react';

/** Native modal: focus trap, inert background, Escape and focus restoration. */
export default function Dialog({ children, titleId, onClose, busy = false }: {
  children: ReactNode; titleId: string; onClose: () => void; busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    className="m-auto p-0 bg-transparent text-on-surface w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm">
    {children}
  </dialog>;
}
