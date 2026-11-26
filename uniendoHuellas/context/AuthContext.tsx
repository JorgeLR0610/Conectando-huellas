'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, ApiError, User, RegisterData } from '@/lib/api';
import { roleLabel } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  roleName: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionVersion: number;
  login: (correo: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionVersion, setSessionVersion] = useState(0);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setSessionVersion((version) => version + 1);
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_role');
    } catch { /* Public pages must remain usable when storage is blocked. */ }
  }, []);

  const saveUser = useCallback((data: User) => {
    setUser(data);
    try {
      localStorage.setItem('auth_user', JSON.stringify(data));
      localStorage.setItem('auth_role', roleLabel(data));
    } catch { /* Cached profile data is optional; authorization remains server-side. */ }
  }, []);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      setIsLoading(true);
      // Never trust cached roles/user data before /me validates the session.
      try {
        const storedToken = localStorage.getItem('auth_token');
        if (!storedToken) {
          if (active) { setUser(null); setToken(null); }
          return;
        }
        const data = await api.auth.me();
        if (active && storedToken === localStorage.getItem('auth_token')) {
          setToken(storedToken);
          saveUser(data);
        }
      } catch {
        if (active) logout();
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void restore();
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'auth_token' || event.key === null) void restore();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('auth:expired', logout);
    return () => {
      active = false;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth:expired', logout);
    };
  }, [logout, saveUser]);

  useEffect(() => {
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const remaining = payload.exp * 1000 - Date.now();
      const timer = window.setTimeout(logout, Math.max(0, Math.min(remaining, 2147483647)));
      return () => window.clearTimeout(timer);
    } catch {
      const timer = window.setTimeout(logout, 0);
      return () => window.clearTimeout(timer);
    }
  }, [token, logout]);

  const login = async (correo: string, password: string) => {
    const response = await api.auth.login(correo.trim(), password);
    try { localStorage.setItem('auth_token', response.access_token); }
    catch { throw new ApiError(400, 'Permite el almacenamiento local de este sitio para iniciar sesión. Puedes seguir explorando el catálogo sin cuenta.'); }
    setToken(response.access_token);
    saveUser(response.usuario);
    return response.usuario;
  };

  const register = async (data: RegisterData) => {
    await api.auth.register(data);
    return login(data.correo, data.password);
  };

  const refreshUser = async () => {
    try { saveUser(await api.auth.me()); } catch { logout(); }
  };

  return (
    <AuthContext.Provider value={{
      user, token, roleName: user ? roleLabel(user) : null,
      isAuthenticated: !isLoading && !!user && !!token, isLoading,
      sessionVersion,
      login, register, logout, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
