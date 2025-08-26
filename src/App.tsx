import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import ResetPassword from "./views/pages/ResetPassword";

<Route path="/ResetPassword" element={<ResetPassword />} />

// Lazy load de páginas
const Home = lazy(() => import("./views/pages/Home"));
const Login = lazy(() => import("./views/pages/Login"));
const Register = lazy(() => import("./views/pages/Register"));
const ConfirmEmail = lazy(() => import("./views/pages/ConfirmEmail"));
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

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Landing pública: Home */}
          <Route path="/" element={<Home />} />

          {/* Alias /home -> redirige a raíz pública (compatibilidad) */}
          <Route path="/home" element={<Navigate to="/" replace />} />

          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/confirm" element={<ConfirmEmail />} />
          <Route path="/about" element={<About />} />
          <Route path="/dishes" element={<Dishes />} />
          <Route path="/ResetPassword" element={<ResetPassword />} />
          
          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
