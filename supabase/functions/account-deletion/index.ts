import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { runDeletion } from './worker.mjs';

const origin = 'https://machimamo-map.vercel.app';
Deno.serve(async (req: Request) => {
  const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin' };
  const reply = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.headers.get('origin') && req.headers.get('origin') !== origin) return reply({ error: 'origin_denied' }, 403);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);
  const authorization = req.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return reply({ error: 'authentication_required' }, 401);
  try {
    const bodyText = await req.text();
    if (bodyText.length > 4096) return reply({ error: 'invalid_request' }, 400);
    const body = JSON.parse(bodyText);
    if (!Number.isSafeInteger(body.requestId) || body.requestId <= 0 || typeof body.password !== 'string' || body.password.length > 512) return reply({ error: 'invalid_request' }, 400);
    const url = Deno.env.get('SUPABASE_URL')!;
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth, error: authError } = await caller.auth.getUser(authorization.slice(7));
    if (authError || !auth.user) return reply({ error: 'authentication_required' }, 401);
    const { data: job, error: beginError } = await caller.rpc('admin_begin_account_deletion', { p_password: body.password, p_request_id: body.requestId });
    if (beginError || !job) {
      const known = ['admin_account_requires_manual_handover', 'legacy_photo_ownership_review_required', 'deletion_request_not_active'];
      return reply({ error: known.find(code => beginError?.message?.includes(code)) || 'admin_validation_failed' }, 403);
    }
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    return reply(await runDeletion(service, job));
  } catch (_) {
    // No passwords, user identifiers, JWTs, or Storage paths in logs/responses.
    return reply({ error: 'deletion_incomplete_resume_required' }, 500);
  }
});
