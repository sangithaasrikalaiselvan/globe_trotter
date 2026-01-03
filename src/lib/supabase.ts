// supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types'; 

// Use Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Safety check
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create and export Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
