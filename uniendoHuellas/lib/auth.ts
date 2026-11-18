import type { User } from './api';

export const isAdmin = (user: User | null) => user?.id_rol === 1;
export const isRegularUser = (user: User | null) => user?.id_rol === 3;
export const roleLabel = (user: User) => ({
  1: 'Administrador',
  2: 'Refugio / Encargado',
  3: 'Usuario',
}[user.id_rol] || 'Usuario');
