// src/services/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session, AuthError } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { supabase } from "../services/supabase";

type SignUpResult = {
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
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manejo de errores
  const handleAuthError = (error: AuthError | Error | null) => {
    if (error) {
      console.error('Auth error:', error);
      setError((error as any).message || 'Error de autenticación');
    } else {
      setError(null);
    }
  };

  // Cerrar sesión: limpiamos estado local INMEDIATAMENTE y llamamos a supabase
  const signOut = async () => {
    setLoading(true);
    setError(null);

    // Optimista: limpiar estado local ya mismo para evitar que la UI muestre contenido privado
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

  // Refrescar sesión manualmente (usa supabase API)
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

  // signUp con emailRedirectTo para confirmación
  const signUp = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
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

  useEffect(() => {
    let mounted = true;

    // Obtener sesión inicial
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

    // Escuchar cambios de auth: siempre actualizamos el estado con la nueva sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        console.log('🔐 Auth state change:', event, {
          userEmail: newSession?.user?.email,
          hasSession: !!newSession,
          isExpired: newSession?.expires_at ? new Date(newSession.expires_at * 1000) < new Date() : false
        });

        // Actualizamos incondicionalmente para evitar problemas de closure/stale state
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setError(null);

        // Ajuste de loading según evento
        switch (event) {
          case 'SIGNED_IN':
            console.log('✅ Usuario autenticado:', newSession?.user?.email);
            setLoading(false);
            break;
          case 'SIGNED_OUT':
            console.log('🚪 Usuario deslogueado');
            setLoading(false);
            break;
          case 'TOKEN_REFRESHED':
            console.log('🔄 Token actualizado para:', newSession?.user?.email);
            break;
          case 'USER_UPDATED':
            console.log('👤 Usuario actualizado:', newSession?.user?.email);
            break;
          case 'PASSWORD_RECOVERY':
            console.log('🔑 Recovery de contraseña iniciado');
            break;
          case 'INITIAL_SESSION':
            console.log('📋 Sesión inicial:', newSession?.user?.email);
            break;
          default:
            console.log('🔔 Evento de auth:', event);
            break;
        }
      }
    );

    return () => {
      mounted = false;
      try {
        subscription.unsubscribe();
      } catch (e) {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
