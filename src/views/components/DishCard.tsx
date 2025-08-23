import React, { memo, useState, useCallback } from 'react';
import type { Dish } from '../../models/dish';

/**
 * DishCard component - Displays individual dish information in an accessible card format
 *
 * - Memoized functional component with explicit props typing
 * - Lazy-loading image with load/error handlers
 * - Accessible attributes (aria-labelledby, aria-describedby)
 * - English header comments kept minimal; UI strings left in Spanish to match project
 */

interface DishCardProps {
  dish: Dish;
  role?: string;
  className?: string;
}

interface ImageLoadingState {
  isLoading: boolean;
  hasError: boolean;
}

const DishCard = memo(function DishCard({ dish, role = 'article', className = '' }: DishCardProps) {
  const [imageState, setImageState] = useState<ImageLoadingState>({ isLoading: true, hasError: false });

  const handleImageLoad = useCallback(() => {
    setImageState({ isLoading: false, hasError: false });
  }, []);

  const handleImageError = useCallback(() => {
    setImageState({ isLoading: false, hasError: true });
  }, []);

  const primaryRegion = dish.region?.[0]?.name;
  const hasImage = Boolean(dish.photo_url) && !imageState.hasError;
  const idSafe = String(dish.id);

  return (
    <article
      className={`dish-card ${className}`}
      role={role}
      tabIndex={0}
      aria-labelledby={`dish-name-${idSafe}`}
      aria-describedby={`dish-description-${idSafe}`}
    >
      {dish.photo_url && (
        <figure className="dish-image-container">
          {imageState.isLoading && (
            <div className="image-placeholder" aria-hidden="true">
              <span className="loading-placeholder">Cargando imagen...</span>
            </div>
          )}

          {!imageState.hasError ? (
            <img
              src={dish.photo_url}
              alt={`Fotografía del plato típico ${dish.name}${primaryRegion ? ` de la región de ${primaryRegion}` : ''}`}
              className={`dish-image ${imageState.isLoading ? 'loading' : 'loaded'}`}
              loading="lazy"
              onLoad={handleImageLoad}
              onError={handleImageError}
              width={300}
              height={200}
            />
          ) : (
            <div className="image-fallback" aria-hidden="true">
              <span className="fallback-icon" aria-hidden="true">🍽️</span>
              <span className="fallback-text">Imagen no disponible</span>
            </div>
          )}
        </figure>
      )}

      <div className="dish-content">
        <header className="dish-header">
          <h3 id={`dish-name-${idSafe}`} className="dish-name">
            {dish.name}
          </h3>

          {primaryRegion && (
            <span className="dish-region" aria-label={`Región: ${primaryRegion}`}>
              📍 {primaryRegion}
            </span>
          )}
        </header>

        <div className="dish-body">
          <p id={`dish-description-${idSafe}`} className="dish-description">
            {dish.description || 'Descripción no disponible para este delicioso plato típico.'}
          </p>
        </div>

        <footer className="dish-footer">
          <span className="dish-id sr-only" aria-hidden="true">
            ID: {idSafe}
          </span>
        </footer>
      </div>
    </article>
  );
});

DishCard.displayName = 'DishCard';

export { DishCard };
export type { DishCardProps };
