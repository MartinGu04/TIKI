import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// When env vars are absent the app runs in LocalStorage-only mode.
export const supabase = url && key ? createClient(url, key) : null;

export const isSupabaseConfigured = !!supabase;
