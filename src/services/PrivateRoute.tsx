// src/services/
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.1rem',
        color: 'var(--color-text-secondary)'
      }}>
        Verificando autenticación...
      </div>
    );
  }

  // Si no hay usuario, redirigir a login guardando la ubicación actual
  if (!user) {
    console.log('PrivateRoute: Usuario no autenticado, redirigiendo a login');
    return <Navigate to="/login" state={{ from: location.pathname, registrationSuccess: false }} replace />;
  }

  // Usuario autenticado, mostrar el contenido protegido
  console.log('PrivateRoute: Usuario autenticado, mostrando contenido');
  return <>{children}</>;
};

export default PrivateRoute;
