// src/services/useRequireAuth.tsx
import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * Uso:
 * const requireAuth = useRequireAuth();
 * <button onClick={() => {
 *   if (!requireAuth()) return;
 *   // usuario autenticado: ejecutar acción
 * }}>
 */
export function useRequireAuth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    // Si onAllowed es provisto se ejecuta cuando hay usuario.
    (onAllowed?: () => void) => {
      if (user) {
        if (typeof onAllowed === "function") onAllowed();
        return true;
      }
      // no autenticado -> mandar a login guardando de dónde vino
      navigate("/login", { state: { from: location.pathname || "/" }, replace: false });
      return false;
    },
    [user, navigate, location.pathname]
  );
}
