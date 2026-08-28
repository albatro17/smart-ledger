import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'voca_supabase_url';
const STORAGE_KEY_KEY = 'voca_supabase_anon_key';

const DEFAULT_SUPABASE_URL = 'https://mwudyejsturuzywguwil.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_gZrTdcal05SnpaO0Et_y2A_xkz9-91A';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const url = localStorage.getItem(STORAGE_URL_KEY) || import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey = localStorage.getItem(STORAGE_KEY_KEY) || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
  return { url, anonKey };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  localStorage.setItem(STORAGE_URL_KEY, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
}

export function clearSupabaseCredentials() {
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_KEY_KEY);
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey) return null;

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, anonKey, {
      auth: { persistSession: true },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return supabaseInstance;
}

export function resetSupabaseClient() {
  supabaseInstance = null;
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.includes('supabase.co'));
}
