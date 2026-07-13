/**
 * Supabase Client Configuration
 *
 * Initializes the Supabase client for authentication and database operations.
 * Reads configuration from environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
