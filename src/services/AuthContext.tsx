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

    // limpiamos tokens que puedan venir en hash (evita auto-login no deseado)
    const url = new URL(window.location.href);
    const hasAccessToken = url.searchParams.get("access_token") || window.location.hash.includes("access_token");
    if (hasAccessToken) {
      // reemplazamos el historial para evitar que el app lea tokens desde otras páginas
      try {
        const clean = new URL(window.location.origin + window.location.pathname + window.location.search);
        // preserve verified query param if present
        if (url.searchParams.get("verified") === "true") clean.searchParams.set("verified", "true");
        window.history.replaceState({}, document.title, clean.toString());
        console.log("🧹 Tokens limpiados de URL (previniendo auto-login).");
      } catch (e) {
        // ignore
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

        // Si se produce SIGNED_IN pero la URL original contenía un parámetro
        // de verificación (usuario viene de confirmar cuenta) entonces no
        // mantener sesión automática: forzamos signOut y marcamos flag para mostrar banner.
        // Esto evita el caso donde el correo confirma y te deja automáticamente logueado.
        try {
          const u = new URL(window.location.href);
          const verifiedRedirect = u.searchParams.get("verified");
          if (event === "SIGNED_IN" && verifiedRedirect === "true") {
            // forzamos cerrar sesión, el usuario deberá iniciar desde login
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
