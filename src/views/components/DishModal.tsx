// src/views/components/DishModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import type { Dish } from '../../models/dish';
import { supabase } from '../../services/supabase';
import type { Review } from '../../models/review';
import { getDishReviews } from '../../repositories/dishRepository';
import { addDishReview } from '../../repositories/dishRepository';

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

  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');

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

  //UseEffect for the reviews
  useEffect(() => {
  if (dish) {
    getDishReviews(dish.id).then(setReviews).catch(console.error);
  }
}, [dish]);

const handleAddReview = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!dish) return;
  try {
    await addDishReview(dish.id, newRating, newComment);
    setNewComment('');
    setNewRating(5);
    const updated = await getDishReviews(dish.id);
    setReviews(updated);
  } catch (err) {
    console.error(err);
  }
};

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
          maxHeight: '90vh',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header fijo con botones */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: 16,
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0
        }}>
          <div />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={handleToggleFavorite}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              disabled={favChecking}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: isFavorite ? 'var(--color-primary)' : 'transparent',
                color: isFavorite ? 'white' : 'var(--color-text-primary)',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {isFavorite ? 'Quitar favorito' : 'Agregar a favoritos'}
            </button>

            <button
              onClick={onClose}
              aria-label="Cerrar diálogo"
              ref={closeButtonRef}
              style={{ 
                padding: '8px 16px', 
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Contenido desplazable */}
        <div style={{ 
          flex: 1,
          overflowY: 'auto',
          padding: 0
        }}>

          {/* grid: image left, content right (texto más ancho) - estructura original */}
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

              {/* Reviews section movida aquí - entre región e ingredientes */}
              <div style={{ marginTop: 24, marginBottom: 24, borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>
                  Reviews ({reviews.length})
                </h3>

                {/* Mostrar reviews */}
                <div style={{ marginBottom: 20, maxHeight: '200px', overflowY: 'auto' }}>
                  {reviews.length > 0 ? (
                    reviews.map((rev) => (
                      <div 
                        key={rev.id} 
                        style={{ 
                          background: 'var(--color-surface, #6b7280)',
                          border: '1px solid var(--color-border, #6b7280)',
                          borderRadius: 8,
                          padding: 12,
                          marginBottom: 10,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: 6
                        }}>
                          <strong style={{ color: 'var(--color-text-primary)', fontSize: '0.85rem' }}>
                            {rev.user?.email ?? 'Usuario Anónimo'}
                          </strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: '0.9rem' }}>{'⭐'.repeat(rev.rating)}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                              ({rev.rating}/5)
                            </span>
                          </div>
                        </div>
                        {rev.comment && (
                          <p style={{ 
                            margin: 0, 
                            fontSize: '0.8rem', 
                            lineHeight: 1.3,
                            color: 'var(--color-text-secondary)'
                          }}>
                            "{rev.comment}"
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: 16, 
                      color: 'var(--color-text-secondary)',
                      fontStyle: 'italic',
                      fontSize: '0.85rem'
                    }}>
                      No hay reviews aún. ¡Sé el primero en dejar una!
                    </div>
                  )}
                </div>

                {/* Formulario para agregar review */}
                <div style={{ 
                  background: 'var(--color-surface, #6b7280)',
                  border: '1px solid var(--color-border, #6b7280)',
                  borderRadius: 8,
                  padding: 16
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                    Agregar Review
                  </h4>
                  <form onSubmit={handleAddReview} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: '500', minWidth: '50px' }}>
                        Rating:
                      </label>
                      <select 
                        value={newRating} 
                        onChange={(e) => setNewRating(Number(e.target.value))}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          border: '1px solid var(--color-border, #6b7280)',
                          fontSize: '0.8rem',
                          background: 'white'
                        }}
                      >
                        {[1,2,3,4,5].map((n) => (
                          <option key={n} value={n}>{n} ⭐</option>
                        ))}
                      </select>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: '500' }}>
                        Comentario:
                      </label>
                      <textarea 
                        value={newComment} 
                        onChange={(e) => setNewComment(e.target.value)} 
                        placeholder="Comparte tu experiencia..."
                        rows={2}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 4,
                          border: '1px solid var(--color-border, #6b7280)',
                          fontSize: '0.8rem',
                          resize: 'vertical',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                    
                    <button 
                      type="submit"
                      style={{
                        alignSelf: 'flex-start',
                        padding: '6px 12px',
                        borderRadius: 4,
                        border: 'none',
                        background: 'var(--color-primary, #007bff)',
                        color: 'white',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Publicar
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
