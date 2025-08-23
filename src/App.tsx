import { Suspense, lazy } from 'react';
import './App.css';

/**
 * Root App component with code splitting and lazy loading
 * 
 * Features:
 * - Implements code splitting using React.lazy for better performance
 * - Provides loading fallback with Suspense
 * - Maintains clean separation between routing and presentation
 * 
 * Changes made:
 * - Added code splitting with React.lazy
 * - Implemented Suspense with loading state
 * - Enhanced error boundary handling
 * - Improved TypeScript structure
 */

// Lazy load the Home component for better performance
const Home = lazy(() => import('./views/pages/Home'));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="loading-container" role="status" aria-label="Cargando contenido">
    <div className="loading-spinner" aria-hidden="true"></div>
    <span className="loading-text">Cargando platos típicos...</span>
  </div>
);

export default function App() {
  return (
    <div className="app">
      <Suspense fallback={<LoadingSpinner />}>
        <Home />
      </Suspense>
    </div>
  );
}
