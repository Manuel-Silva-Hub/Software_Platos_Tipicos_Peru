// src/views/components/DishModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import type { Dish } from '../../models/dish';
import { supabase } from '../../services/supabase';

type Props = {
  open: boolean;
  dish?: Dish | null;
  onClose: () => void;
};

type DishDetail = {
  id: number;
  name: string;
  description?: string | null;
  photo_url?: string | null;
  region?: { name?: string | null } | null;
  regions?: { name?: string | null }[];
  ingredients?: { id: number; name: string; quantity?: string | null }[];
};


export function DishModal({ open, dish, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const [detail, setDetail] = useState<DishDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favChecking, setFavChecking] = useState(false);

  useEffect(() => {
    if (!open || !dish) {
      setDetail(null);
      setIsFavorite(false);
      return;
    }
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('dishes')
          .select(`
            id,
            name,
            description,
            photo_url,
            region:regions ( name ),
            ingredients ( id, name, quantity )
          `)
          .eq('id', dish.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching dish details:', error);
        } else if (mounted) {
          setDetail(data as DishDetail | null);
        }
      } catch (err) {
        console.error('Unexpected error fetching details:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [open, dish]);

  useEffect(() => {
    if (!open || !dish) return;
    let mounted = true;
    const checkFav = async () => {
      setFavChecking(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user ?? null;

        if (user) {
          const { data: fav, error } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', user.id)
            .eq('dish_id', dish.id)
            .maybeSingle();

          if (error) {
            console.error('Error checking favorite:', error);
            if (mounted) setIsFavorite(false);
          } else if (mounted) {
            setIsFavorite(Boolean(fav));
          }
        } else {
          const raw = localStorage.getItem('fav_dish_ids');
          const favs: number[] = raw ? JSON.parse(raw) : [];
          if (mounted) setIsFavorite(favs.includes(Number(dish.id)));
        }
      } catch (err) {
        console.error('Error checking favorite state:', err);
      } finally {
        if (mounted) setFavChecking(false);
      }
    };

    checkFav();
    return () => { mounted = false; };
  }, [open, dish]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        if (document.activeElement === overlayRef.current) {
          e.preventDefault();
          closeButtonRef.current?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    closeButtonRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !dish) return null;

  // normalizar imagen y alt
  const imgSrc = (detail?.photo_url ?? dish.photo_url) ?? undefined;
  const altText = (detail?.name ?? dish.name) ?? undefined;

  // regionName: intenta detail.regions, dish.region (si lo tienes), dish.regions
  const regionName =
  detail?.region?.name ??
  detail?.regions?.[0]?.name ??
  dish.region?.name ??
  dish.regions?.[0]?.name ??
  'Desconocida';

  // dedupe ingredientes por (name + quantity) para evitar duplicados en UI
  const uniqueIngredients = (() => {
    const list = detail?.ingredients ?? [];
    const map = new Map<string, { id: number; name: string; quantity?: string | null }>();
    list.forEach((it) => {
      const key = `${(it.name ?? '').trim().toLowerCase()}|${(it.quantity ?? '').trim()}`;
      if (!map.has(key)) map.set(key, it);
    });
    return Array.from(map.values());
  })();

  const handleToggleFavorite = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user ?? null;

      if (user) {
        const { data: existing, error: selectErr } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('dish_id', dish.id)
          .maybeSingle();

        if (selectErr) {
          console.error('Error checking favorites:', selectErr);
          return;
        }

        if (existing) {
          const { error: delErr } = await supabase
            .from('favorites')
            .delete()
            .eq('id', existing.id);

          if (delErr) {
            console.error('Error removing favorite:', delErr);
            return;
          }
          setIsFavorite(false);
        } else {
          const { error: insertErr } = await supabase
            .from('favorites')
            .insert([{ user_id: user.id, dish_id: Number(dish.id) }]);

          if (insertErr) {
            console.error('Error adding favorite:', insertErr);
            return;
          }
          setIsFavorite(true);
        }
      } else {
        const raw = localStorage.getItem('fav_dish_ids');
        const favs: number[] = raw ? JSON.parse(raw) : [];
        const idNum = Number(dish.id);
        const idx = favs.indexOf(idNum);
        if (idx >= 0) {
          favs.splice(idx, 1);
          setIsFavorite(false);
        } else {
          favs.push(idNum);
          setIsFavorite(true);
        }
        localStorage.setItem('fav_dish_ids', JSON.stringify(favs));
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`modal-title-${dish.id}`}
      className="modal-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 16, zIndex: 9999
      }}
    >
      <div
        className="modal-content"
        style={{
          background: 'var(--color-background)',
          borderRadius: 12,
          maxWidth: 980,
          width: '100%',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8 }}>
          <div />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={handleToggleFavorite}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              disabled={favChecking}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: isFavorite ? 'var(--color-primary)' : 'transparent',
                color: isFavorite ? 'white' : 'var(--color-text-primary)',
                cursor: 'pointer'
              }}
            >
              {isFavorite ? 'Quitar favorito' : 'Agregar a favoritos'}
            </button>

            <button
              onClick={onClose}
              aria-label="Cerrar diálogo"
              ref={closeButtonRef}
              style={{ padding: '6px 12px', borderRadius: 8 }}
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* grid: image left, content right (texto más ancho) */}
        <div style={{ display: 'grid', gridTemplateColumns: '42% 58%', gap: 18, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={altText}
                style={{ width: '100%', height: 'auto', borderRadius: 8, objectFit: 'cover' }}
                loading="lazy"
              />
            ) : (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Sin imagen
              </div>
            )}
          </div>

          <div style={{ paddingRight: 8 }}>
            <h2 id={`modal-title-${dish.id}`} style={{ marginTop: 0 }}>{detail?.name ?? dish.name}</h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              {detail?.description ?? dish.description ?? 'Sin descripción.'}
            </p>

            <div style={{ marginTop: 14 }}>
              <strong>Región:</strong> <span style={{ marginLeft: 6 }}>{regionName}</span>
            </div>

            <div style={{ marginTop: 12 }}>
              <strong>Ingredientes:</strong>
              {loading ? (
                <p className="sr-only">Cargando ingredientes...</p>
              ) : uniqueIngredients.length > 0 ? (
                <ul className="ingredient-list" aria-live="polite">
                  {uniqueIngredients.map((ing) => (
                    <li key={ing.id}>
                      {ing.quantity ? `${ing.quantity} ` : ''}{ing.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No hay ingredientes registrados.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
