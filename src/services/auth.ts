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
      },
      emailRedirectTo: `${window.location.origin}/login`,
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

export async function signIn(email: string, password: string) {
  return await signInUser({ email, password });
}

export async function signUp(email: string, password: string, firstName?: string, lastName?: string) {
  return await signUpUser({ email, password, firstName, lastName });
}

export async function updateProfileMetadata(metadata: Record<string, any>) {
  const result = await supabase.auth.updateUser({ data: metadata });
  return result;
}
