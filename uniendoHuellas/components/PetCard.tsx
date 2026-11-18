'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Pet } from '@/data/pets';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

interface PetCardProps {
  pet: Pet;
  isUrgentCard?: boolean;
  initialFavorite?: boolean;
  onFavoriteChange?: (favorite: boolean) => void;
}

export default function PetCard({ pet, isUrgentCard = false, initialFavorite = false, onFavoriteChange }: PetCardProps) {
  const { isAuthenticated, user } = useAuth();
  const [storedFavorite, setFavorite] = useState(initialFavorite);
  const favorite = isAuthenticated && storedFavorite;
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    if (!isAuthenticated) return;
    api.favoritos.check(Number(pet.id)).then((data) => { if (active) setFavorite(data.es_favorito); }).catch(() => {});
    return () => { active = false; };
  }, [isAuthenticated, user?.id_usuario, pet.id]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;

    const animalIdNum = parseInt(pet.id, 10);
    if (!isAuthenticated) {
      alert('Inicia sesión para guardar favoritos.');
      return;
    }

    const nextState = !favorite;
    setFavorite(nextState);
    setSaving(true);

    try {
      if (!isNaN(animalIdNum)) {
        if (nextState) {
          await api.favoritos.add(animalIdNum);
        } else {
          await api.favoritos.removeByAnimal(animalIdNum);
        }
      }
      onFavoriteChange?.(nextState);
    } catch (err) {
      console.warn('Error al alternar favorito:', err);
      setFavorite(!nextState);
    } finally {
      setSaving(false);
    }
  };

  if (isUrgentCard) {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-space-sm flex flex-col justify-between shadow-sm border border-error-container hover:shadow-md transition-all group">
        <div className="relative h-44 rounded-lg overflow-hidden mb-space-sm bg-surface-container">
          <img
            src={pet.images[0]}
            alt={pet.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {pet.urgencyTag && (
            <span className="absolute top-2 left-2 bg-error text-on-error font-label-sm text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <span className="material-symbols-outlined text-[13px]">alarm</span>
              {pet.urgencyTag}
            </span>
          )}
          <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white font-label-sm text-[11px] px-2 py-0.5 rounded">
            {pet.location}
          </span>
          <button
            disabled={saving}
            aria-pressed={favorite}
            onClick={toggleFavorite}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-primary shadow-sm hover:scale-110 transition-transform"
            title={favorite ? 'Quitar favorito' : 'Guardar favorito'}
          >
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: favorite ? "'FILL' 1" : "'FILL' 0" }}
            >
              favorite
            </span>
          </button>
        </div>

        <div className="px-space-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">{pet.name}</h3>
            <span className="text-xs text-on-surface-variant font-medium">
              {pet.gender} • {pet.age}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">
            {pet.description}
          </p>
        </div>

        <div className="mt-space-sm pt-space-xs border-t border-surface-variant/40 flex items-center justify-between">
          <span className="text-xs text-secondary font-semibold truncate max-w-[150px]">
            {pet.shelter}
          </span>
          <Link
            href={`/mascotas/${pet.id}`}
            className="inline-flex items-center text-xs font-bold text-primary hover:text-on-primary-container bg-primary-fixed/60 hover:bg-primary-fixed px-2.5 py-1 rounded-md transition-colors"
          >
            Postularme
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl bg-surface-container-lowest overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group border border-surface-container-high/40">
      <div className="relative h-64 overflow-hidden bg-surface-container">
        <img
          src={pet.images[0]}
          alt={pet.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3">
          <button
            disabled={saving}
            aria-pressed={favorite}
            type="button"
            onClick={toggleFavorite}
            className={`w-10 h-10 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-surface-container-lowest transition-all hover:scale-105 ${
              favorite ? 'text-primary' : 'text-on-surface-variant'
            }`}
            title={favorite ? 'Quitar favorito' : 'Guardar favorito'}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: favorite ? "'FILL' 1" : "'FILL' 0" }}
            >
              favorite
            </span>
          </button>
        </div>
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
          {pet.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-space-sm py-0.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface font-label-sm text-label-sm shadow-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="p-space-lg flex flex-col flex-1 justify-between gap-space-md">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {pet.name}
            </h3>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
              {pet.gender} • {pet.age}
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs leading-relaxed line-clamp-2">
            {pet.description}
          </p>
        </div>

        <div className="pt-space-sm flex items-center justify-between border-t border-surface-container-high/60 bg-surface-container-low/70 p-space-sm rounded-xl">
          <div className="flex items-center gap-space-xs overflow-hidden pr-2">
            <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">
              home_pin
            </span>
            <span className="font-body-sm text-body-sm text-on-surface truncate">
              {pet.shelter}
            </span>
          </div>
          <Link
            href={`/mascotas/${pet.id}`}
            className="font-label-sm text-label-sm text-primary font-bold hover:underline shrink-0"
          >
            Conocer más →
          </Link>
        </div>
      </div>
    </div>
  );
}
