import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { normalizePublicUrl } from './url-config';

let client: SupabaseClient | null | undefined;

export function getPublicSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = normalizePublicUrl(process.env.NEXT_PUBLIC_SUPABASE_URL,{httpsOnly:true});
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    client = null;
    return client;
  }

  client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  return client;
}
