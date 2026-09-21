import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { normalizePublicUrl } from './url-config';

let adminClient: SupabaseClient | null | undefined;

export function getAdminSupabase(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient;
  const url = normalizePublicUrl(process.env.NEXT_PUBLIC_SUPABASE_URL,{httpsOnly:true});
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url || !serviceKey){
    adminClient=null;
    return adminClient;
  }
  adminClient=createClient(url,serviceKey,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
  return adminClient;
}
