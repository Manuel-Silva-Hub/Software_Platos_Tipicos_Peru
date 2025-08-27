// src/views/components/DishCard.tsx
import React, { memo, useState, useCallback } from 'react';
import type { Dish } from '../../models/dish';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useRequireAuth } from '../../services/useRequireAuth';

/**
 * DishCard component - Displays individual dish information in an accessible card format
 */

interface DishCardProps {
  dish: Dish;
  role?: string;
  className?: string;
  onOpen?: (dish: Dish) => void;
}

interface ImageLoadingState {
  isLoading: boolean;
  hasError: boolean;
}

export const DishCard = memo(function DishCard({ dish, role = 'article', className = '', onOpen }: DishCardProps) {
  const [imageState, setImageState] = useState<ImageLoadingState>({ isLoading: true, hasError: false });
  const [favIds, setFavIds] = useLocalStorage<number[]>('fav_dish_ids', []);
  const requireAuth = useRequireAuth();

  const isFav = favIds?.includes(Number(dish.id));

  /**
  This function toggles a dish's favorite status. It requires authentication (redirects to `/login` if the user isn't logged in). 
  If the dish is already in favorites, it removes it. If it isn't, it adds it to the list in localStorage.
  */
  const toggleFav = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Require authentication to toggle favorites (redirects to /login if not)
    const allowed = requireAuth();
    if (!allowed) return;

    const idNum = Number(dish.id);
    setFavIds((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      const idx = next.indexOf(idNum);
      if (idx >= 0) next.splice(idx, 1);
      else next.push(idNum);
      return next;
    });
  }, [dish.id, setFavIds, requireAuth]);

  /**
  This function handles the dish's opening action (e.g., displaying details in a modal or navigating). 
  To do this, it calls the `onOpen` callback if it was provided as a prop.
  */
  const handleOpen = useCallback(() => {
    onOpen?.(dish);
  }, [dish, onOpen]);

  /**
  This function handles keyboard events for accessibility. If the user presses `Enter` or `Space`, `handleOpen` is executed.
  @param {React.KeyboardEvent} e - Keyboard event.
  */
    const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpen();
    }
  }, [handleOpen]);

  /**
  This function marks that the dish image has loaded correctly.
  */
  const handleImageLoad = useCallback(() => setImageState({ isLoading: false, hasError: false }), []);
  /**
  This function marks that an error occurred while loading the dish image.
  */
  const handleImageError = useCallback(() => setImageState({ isLoading: false, hasError: true }), []);

  const primaryRegion = (dish as any).region?.name ?? dish.regions?.[0]?.name ?? undefined;

  const imgSrc = (dish.photo_url ?? undefined) as string | undefined;
  const altText = `${dish.name}${primaryRegion ? ` — ${primaryRegion}` : ''}`;

  const idSafe = String(dish.id);

  return (
    <article
      className={`dish-card ${className}`}
      role={role}
      tabIndex={0}
      aria-labelledby={`dish-name-${idSafe}`}
      aria-describedby={`dish-description-${idSafe}`}
      onClick={handleOpen}
      onKeyDown={handleKey}
    >
      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
        <button
          aria-pressed={isFav}
          aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          onClick={toggleFav}
          style={{
            background: isFav ? 'var(--color-primary)' : 'rgba(255,255,255,0.9)',
            color: isFav ? 'white' : 'var(--color-text-primary)',
            borderRadius: 8,
            padding: '6px 8px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {isFav ? '❤' : '♡'}
        </button>
      </div>

      {imgSrc ? (
        <figure className="dish-image-container" style={{ margin: 0 }}>
          {imageState.isLoading && (
            <div className="image-placeholder" aria-hidden="true">
              <span className="loading-placeholder">Loading image...</span>
            </div>
          )}

          {!imageState.hasError ? (
            <img
              src={imgSrc}
              alt={altText}
              className={`dish-image ${imageState.isLoading ? 'loading' : 'loaded'}`}
              loading="lazy"
              onLoad={handleImageLoad}
              onError={handleImageError}
              width={400}
              height={260}
            />
          ) : (
            <div className="image-fallback" aria-hidden="true">
              <span className="fallback-icon">🍽️</span>
              <span className="fallback-text">Image not available</span>
            </div>
          )}
        </figure>
      ) : (
        <div className="dish-image-container" aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ padding: 12 }}>No image</div>
        </div>
      )}

      <div className="dish-content">
        <header className="dish-header">
          <h3 id={`dish-name-${idSafe}`} className="dish-name">{dish.name}</h3>
          {primaryRegion && <span className="dish-region" aria-label={`Región: ${primaryRegion}`}>📍 {primaryRegion}</span>}
        </header>

        <div className="dish-body">
          <p id={`dish-description-${idSafe}`} className="dish-description">{dish.description || 'No description available.'}</p>
        </div>

        <footer className="dish-footer">
          <span className="sr-only">ID: {idSafe}</span>
        </footer>
      </div>
    </article>
  );
});
DishCard.displayName = 'DishCard';
