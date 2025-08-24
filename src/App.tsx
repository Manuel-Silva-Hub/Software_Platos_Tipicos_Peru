import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./services/AuthContext";
import "./App.css";

import PrivateRoute from "./services/PrivateRoute";

// Lazy load de páginas
const Home = lazy(() => import("./views/pages/Home"));
const Login = lazy(() => import("./views/pages/Login"));
const Register = lazy(() => import("./views/pages/Register"));
const ConfirmEmail = lazy(() => import("./views/pages/ConfirmEmail")); // 👈 nueva ruta
const About = lazy(() => import("./views/pages/About")); 
const Dishes = lazy(() => import("./views/pages/Dishes"));

// Loading fallback
const LoadingSpinner = () => (
  <div
    className="flex flex-col items-center justify-center min-h-screen"
    role="status"
    aria-label="Cargando contenido"
  >
    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    <span className="mt-4 text-gray-600">Cargando...</span>
  </div>
);

// Componente para manejar la ruta raíz
const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Si está autenticado, va a home; si no, va a login
  return user ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Ruta raíz que redirige según autenticación */}
          <Route path="/" element={<RootRedirect />} />

          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/confirm" element={<ConfirmEmail />} /> {/* 👈 nueva ruta */}
          <Route path="/about" element={<About />} />
          <Route path="/dishes" element={<Dishes />} />

          {/* Ruta protegida para la página principal */}
          <Route
            path="/home"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />

          {/* Ruta catch-all para URLs no encontradas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
