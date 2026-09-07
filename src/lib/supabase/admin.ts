import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, assertSecretKey } from '../env';

let cached: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS, so it must never reach the browser.
 * Every guest write goes through this after server-side validation.
 */
export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(SUPABASE_URL, assertSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': 'laya-bee-wish-wall' } },
  });
  return cached;
}

export const ASSET_BUCKET = 'assets';
export const MEMORY_BUCKET = 'memories';
