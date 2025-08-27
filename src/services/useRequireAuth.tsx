// src/services/useRequireAuth.tsx
import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
This function forces authentication before allowing access to certain actions or routes. It validates whether the user is authenticated.
- If an authenticated user is present:
Executes `onAllowed` if provided, and returns `true`.
- If no authenticated user is present:
Redirects to login, saving the current route in `state.from` for later return, and returns `false`.
 */
export function useRequireAuth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
      // If onAllowed is provided it is executed when there is a user.
    (onAllowed?: () => void) => {
      if (user) {
        if (typeof onAllowed === "function") onAllowed();
        return true;
      }
      // not authenticated -> send to login saving where it came from
      navigate("/login", { state: { from: location.pathname || "/" }, replace: false });
      return false;
    },
    [user, navigate, location.pathname]
  );
}
