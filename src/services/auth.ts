// src/services/auth.ts
import { supabase } from './supabase';

type SignUpPayload = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

export async function signUpUser({ email, password, firstName, lastName }: SignUpPayload) {
  const display_name = `${(firstName ?? '').trim()} ${(lastName ?? '').trim()}`.trim() || null;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName ?? null,
        last_name: lastName ?? null,
        display_name
      }
    }
  });

  return { data, error };
}

export async function signInUser({ email, password }: { email: string; password: string; }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
}

/* === ALIAS/COMPATIBILIDAD para componentes que importan signIn/signUp === */

/**
 * Mantengo la firma antigua (signIn(email,password)) para compatibilidad
 * con tu Login/Register sin tener que cambiar los componentes.
 */
export async function signIn(email: string, password: string) {
  // devuelve el mismo shape { data, error }
  return await signInUser({ email, password });
}

export async function signUp(email: string, password: string, firstName?: string, lastName?: string) {
  return await signUpUser({ email, password, firstName, lastName });
}

/* Opcional: exportar una función para actualizar metadata del usuario */
export async function updateProfileMetadata(metadata: Record<string, any>) {
  // supabase.auth.updateUser espera un objeto { data: {...} }
  const result = await supabase.auth.updateUser({ data: metadata });
  return result; // { data, error }
}
