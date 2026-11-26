'use client';

import { useSyncExternalStore } from 'react';

const key = 'huellas_theme';
const eventName = 'huellas-theme-change';
const snapshot = () => document.documentElement.dataset.theme === 'dark';
const serverSnapshot = () => false;

function systemTheme() {
  let preference: string | null = null;
  try { preference = localStorage.getItem(key); } catch { /* Storage may be disabled. */ }
  document.documentElement.dataset.theme = preference === 'dark' || (
    preference !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches
  ) ? 'dark' : 'light';
  window.dispatchEvent(new Event(eventName));
}

function subscribe(notify: () => void) {
  const media = matchMedia('(prefers-color-scheme: dark)');
  const storage = (event: StorageEvent) => { if (event.key === key || event.key === null) systemTheme(); };
  window.addEventListener(eventName, notify);
  window.addEventListener('storage', storage);
  media.addEventListener('change', systemTheme);
  systemTheme();
  return () => {
    window.removeEventListener(eventName, notify);
    window.removeEventListener('storage', storage);
    media.removeEventListener('change', systemTheme);
  };
}

export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return <button type="button" aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
    aria-pressed={dark} title={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
    onClick={() => {
      const theme = snapshot() ? 'light' : 'dark';
      document.documentElement.dataset.theme = theme;
      try { localStorage.setItem(key, theme); } catch { /* Keep working without persistence. */ }
      window.dispatchEvent(new Event(eventName));
    }}
    className="shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-full bg-surface-container text-on-surface border border-outline-variant hover:bg-surface-container-high">
    <span aria-hidden="true" className="material-symbols-outlined">{dark ? 'light_mode' : 'dark_mode'}</span>
  </button>;
}
