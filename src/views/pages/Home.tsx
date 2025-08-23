import { useDishesController } from '../../controllers/useDishesController';
import { DishCard } from '../../views/components/DishCard';

/**
 Home page of the application.
 This view displays a list of typical dishes,
 obtained through the `useDishesController` hook, which handles
 the data logic (loading, errors, and results).
 */

export default function Home() {
  // Hook that manages the business logic to obtain the dishes
  const { dishes, loading, error } = useDishesController();

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <h1>Platos típicos</h1>
      {/* Estado de carga */}
      {loading && <p>Cargando...</p>}
      {/* Estado de error */}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {/* Renderizado de los platos */}
      {dishes.map(d => <DishCard key={d.id} dish={d} />)}
    </main>
  );
}
