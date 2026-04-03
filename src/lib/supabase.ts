import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL || "https://bxohbhrrdxuahbwllqqf.supabase.co";
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) {
    console.warn("SUPABASE_SERVICE_KEY not set, leads will not be saved");
    return null;
  }
  _supabase = createClient(url, key);
  return _supabase;
}
