import { useDishesController } from '../../controllers/useDishesController';
import { DishCard } from '../components/DishCard';

/**
 * Home page component - Main view for displaying typical dishes
 *
 * - Fixed component import path for DishCard
 * - Keeps loading/error/empty states unchanged
 * - Uses semantic & accessible structure
 */

export default function Home() {
  const { dishes, loading, error } = useDishesController();

  return (
    <main className="home-container" role="main" aria-labelledby="main-heading">
      <header className="home-header">
        <h1 id="main-heading" className="home-title">
        Platos Típicos Peruanos
        </h1>
        <p className="home-description">
        Explora la enorme tradición culinaria peruana y sus sabores regionales más emblemáticos
        </p>
      </header>

      {loading && (
        <div className="loading-state" role="status" aria-live="polite">
          <div className="loading-spinner" aria-hidden="true"></div>
          <span className="sr-only">Cargando platos típicos...</span>
          <p className="loading-text">Preparando los mejores sabores de Perú...</p>
        </div>
      )}

      {error && (
        <div className="error-state" role="alert" aria-live="assertive">
          <h2 className="error-title">¡Ups! Algo salió mal</h2>
          <p className="error-message">{error}</p>
          <button
            className="retry-button"
            onClick={() => window.location.reload()}
            aria-label="Intentar cargar los platos nuevamente"
          >
            Intentar nuevamente
          </button>
        </div>
      )}

      {dishes.length > 0 && (
        <section className="dishes-section" aria-labelledby="dishes-heading">
          <h2 id="dishes-heading" className="sr-only">
            Lista de platos típicos
          </h2>
          <div className="dishes-grid" role="list">
            {dishes.map((dish) => (
              <DishCard key={String(dish.id)} dish={dish} role="listitem" />
            ))}
          </div>
        </section>
      )}

      {!loading && !error && dishes.length === 0 && (
        <div className="empty-state" role="status">
          <h2 className="empty-title">No hay platos disponibles</h2>
          <p className="empty-message">
            Actualmente no tenemos platos típicos para mostrar. Vuelve pronto para descubrir nuevas delicias.
          </p>
        </div>
      )}
    </main>
  );
}
