import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.warn("SUPABASE_URL or SUPABASE_SERVICE_KEY not set, database unavailable");
    return null;
  }
  _supabase = createClient(url, key);
  return _supabase;
}
