// src/services/auth.ts
import { supabase } from './supabase';

type SignUpPayload = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

/**
This function registers a new user in Supabase. It creates a user with `email` and `password`. 
It then saves additional metadata: `first_name`, `last_name`, and `display_name`. It then configures 
confirmation email redirection to `/login`.
*/
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

/**
* This function logs a user into Supabase using their email address and password. 
* It does this by calling `supabase.auth.signInWithPassword`.
*/
export async function signInUser({ email, password }: { email: string; password: string; }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
}

/**
* Shortcut to log in with email and password. Wraps `signInUser`.
*/
export async function signIn(email: string, password: string) {
  return await signInUser({ email, password });
}

/**
Shortcut to register a new user. Wraps `signUpUser`.
*/
export async function signUp(email: string, password: string, firstName?: string, lastName?: string) {
  return await signUpUser({ email, password, firstName, lastName });
}

/**
Function that updates the current user's profile metadata in Supabase. To do this, it 
receives a `metadata` object with the custom fields to update. It then returns the result 
of `supabase.auth.updateUser`.
*/
export async function updateProfileMetadata(metadata: Record<string, any>) {
  const result = await supabase.auth.updateUser({ data: metadata });
  return result;
}
