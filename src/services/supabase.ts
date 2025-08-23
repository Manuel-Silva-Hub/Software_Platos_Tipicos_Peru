import { createClient } from '@supabase/supabase-js';

/**
 Supabase client configuration.

 The project URL and public key (anon key) are obtained from the
 environment variables defined in the `.env` file.
 These credentials allow secure communication with the Supabase database
 from the frontend. A `supabase` instance is exported, which will be used throughout the project
 to perform queries (select, insert, update, delete) and handle authentication.
 
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
