// src/services/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session, AuthError } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { supabase } from "../services/supabase";

type SignUpResult = {
  data: any;
  error: AuthError | null;
};

type ResetResult = {
  data: any;
  error: AuthError | null;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<{ error: AuthError | null }>;
  refreshSession: () => Promise<void>;
  isAuthenticated: boolean;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  resetPassword: (email: string) => Promise<ResetResult>;
  emailJustVerified: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  error: null,
  signOut: async () => ({ error: null }),
  refreshSession: async () => {},
  isAuthenticated: false,
  signUp: async () => ({ data: null, error: null }),
  resetPassword: async () => ({ data: null, error: null }),
  emailJustVerified: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailJustVerified, setEmailJustVerified] = useState(false);

  const handleAuthError = (error: AuthError | Error | null) => {
    if (error) {
      console.error('Auth error:', error);
      setError((error as any).message || 'Error de autenticación');
    } else {
      setError(null);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    setSession(null);
    setUser(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        handleAuthError(error);
        setLoading(false);
        return { error };
      }
      console.log('Usuario deslogueado exitosamente (signOut).');
      setLoading(false);
      return { error: null };
    } catch (err) {
      handleAuthError(err as Error);
      setLoading(false);
      return { error: err as AuthError };
    }
  };

  const refreshSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        handleAuthError(error);
      } else {
        setSession(data.session);
        setUser(data.session?.user ?? null);
        console.log('Sesión refrescada exitosamente');
      }
    } catch (err) {
      handleAuthError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login?verified=true`,
        },
      });
      if (error) {
        handleAuthError(error);
        return { data, error };
      }
      console.log('SignUp: petición realizada, revisar email para confirmar');
      return { data, error: null };
    } catch (err: any) {
      handleAuthError(err);
      return { data: null, error: err as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/ResetPassword`;
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      return { data, error };
    } catch (err) {
      return { data: null, error: err as AuthError };
    }
  };

  useEffect(() => {
    let mounted = true;

    // Detectar si estamos en la ruta de ResetPassword o si la url contiene type=recovery
    const currentPath = window.location.pathname.toLowerCase();
    const isResetRoute = currentPath === '/resetpassword' || currentPath === '/resetpassword/';

    const url = new URL(window.location.href);
    const hasHashToken = window.location.hash && window.location.hash.includes("access_token");
    const hasQueryToken = Boolean(url.searchParams.get("access_token"));
    const hasAnyToken = hasHashToken || hasQueryToken;
    const isRecovery = (url.searchParams.get("type") || "").toLowerCase().includes("recovery");

    // SOLO limpiar tokens de la URL si NO estamos en ResetPassword y NO es flow de recovery.
    // Si limpiamos aquí y la URL tenía tokens para ResetPassword, la página no podrá leerlos.
    if (hasAnyToken && !isResetRoute && !isRecovery) {
      try {
        const clean = new URL(window.location.origin + window.location.pathname + window.location.search);
        // preserve verified flag explicitly if present
        if (url.searchParams.get("verified") === "true") clean.searchParams.set("verified", "true");
        window.history.replaceState({}, document.title, clean.toString());
        console.log("🧹 Tokens limpiados de URL (previniendo auto-login fuera de flows de recovery).");
      } catch (e) {
        // ignore
      }
    } else {
      // si estamos en ResetPassword o recovery token, no tocar la URL: la página ResetPassword se encargará.
      if (isResetRoute || isRecovery) {
        console.log("🔎 Reset/recovery detected — no limpiamos tokens de URL para permitir procesamiento.");
      }
    }

    const getInitialSession = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) {
          handleAuthError(error);
        } else {
          setSession(data.session);
          setUser(data.session?.user ?? null);
          console.log('Sesión inicial cargada:', data.session?.user?.email ?? 'No hay usuario');
        }
      } catch (err) {
        if (mounted) handleAuthError(err as Error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        console.log('🔐 Auth state change:', event, {
          userEmail: newSession?.user?.email,
          hasSession: !!newSession,
        });

        // Comportamiento para confirmación de correo (verified=true)
        // Si se detecta SIGNED_IN *y* estamos en verified=true, hacemos signOut forzado para evitar auto-login.
        try {
          const u = new URL(window.location.href);
          const verifiedRedirect = u.searchParams.get("verified");
          // no confundir con recovery flow: si es recovery no forzamos logout
          const isRecoveryNow = (u.searchParams.get("type") || "").toLowerCase().includes("recovery");
          if (event === "SIGNED_IN" && verifiedRedirect === "true" && !isRecoveryNow) {
            console.log("🛑 SIGNED_IN tras verified=true: forzando signOut y mostrando banner.");
            await supabase.auth.signOut();
            setEmailJustVerified(true);
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }
        } catch (e) {
          // ignore
        }

        // Actualizamos estado normalmente
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setError(null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      try {
        subscription.unsubscribe();
      } catch {}
    };
  }, []);

  const isAuthenticated = !!user && !!session;

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signOut,
    refreshSession,
    isAuthenticated,
    signUp,
    resetPassword,
    emailJustVerified,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
