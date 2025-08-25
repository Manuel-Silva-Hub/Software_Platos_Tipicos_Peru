// src/services/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

/**
 * Asegúrate de definir las variables de entorno:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 *
 * Si usas CRA cambia a process.env.REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || (process.env.REACT_APP_SUPABASE_URL as string);
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || (process.env.REACT_APP_SUPABASE_ANON_KEY as string);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Supabase: faltan variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(SUPABASE_URL || "", SUPABASE_ANON_KEY || "");
