// src/services/
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading while authentication is being verified
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

  // If there is no user, redirect to login saving the current location
  if (!user) {
    console.log('PrivateRoute: Usuario no autenticado, redirigiendo a login');
    return <Navigate to="/login" state={{ from: location.pathname, registrationSuccess: false }} replace />;
  }

 // Authenticated user, display protected content
  console.log('PrivateRoute: Usuario autenticado, mostrando contenido');
  return <>{children}</>;
};

export default PrivateRoute;
