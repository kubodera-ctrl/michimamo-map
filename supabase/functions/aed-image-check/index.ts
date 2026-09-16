import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { analyzeImage, model } from './analyze.mjs';

// Product decision: keep paid processing off regardless of environment settings.
const PAID_IMAGE_AI_PAUSED = true;
const origin = 'https://machimamo-map.vercel.app';
Deno.serve(async (req: Request) => {
    const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin' };
    const reply = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (req.headers.get('origin') && req.headers.get('origin') !== origin) return reply({ error: 'origin_denied' }, 403);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);
    const authorization = req.headers.get('Authorization') || '';
    if (!authorization.startsWith('Bearer ')) return reply({ error: 'authentication_required' }, 401);
    let service: ReturnType<typeof createClient> | undefined, token: string | undefined, submissionId: string | undefined;
    try {
        const raw = await req.text();
        if (raw.length > 2048) return reply({ error: 'invalid_request' }, 400);
        const body = JSON.parse(raw);
        if (!['status', 'analyze'].includes(body.action) || typeof body.password !== 'string' || body.password.length > 512) return reply({ error: 'invalid_request' }, 400);
        const url = Deno.env.get('SUPABASE_URL')!;
        const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
        const { data: auth, error: authError } = await caller.auth.getUser(authorization.slice(7));
        if (authError || !auth.user) return reply({ error: 'authentication_required' }, 401);
        // Existing RPC validates both server admin role and the administrator password.
        const { data: rows, error: adminError } = await caller.rpc('admin_get_aed_submissions', { p_password: body.password });
        if (adminError || !Array.isArray(rows)) return reply({ error: 'admin_validation_failed' }, 403);
        if (PAID_IMAGE_AI_PAUSED) return body.action === 'status'
            ? reply({ paused: true, enabled: false, model })
            : reply({ error: 'ai_paused' }, 503);
        const enabled = Deno.env.get('AED_AI_ENABLED') === 'true';
        const key = Deno.env.get('OPENAI_API_KEY');
        if (body.action === 'status') return reply({ enabled, configured: Boolean(key), model });
        if (!enabled || !key) return reply({ error: 'ai_not_configured' }, 503);
        const row = rows.find(row => row.id === body.submissionId);
        if (!row) return reply({ error: 'submission_not_pending' }, 404);
        submissionId = row.id;
        service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: reservation, error: reservationError } = await service.rpc('reserve_aed_image_check', { p_submission_id: row.id, p_admin_id: auth.user.id });
        if (reservationError) return reply({ error: reservationError.message.includes('ai_daily_limit') ? 'ai_daily_limit' : 'ai_retry_later' }, 429);
        if (reservation.cached) return reply({ result: reservation.result, cached: true });
        token = reservation.request_id;
        const { data: image, error: imageError } = await service.storage.from('aed-submission-images').download(row.photo_object_path);
        if (imageError || !image || image.size > 6 * 1024 * 1024) throw new Error('image_unavailable');
        const result = await analyzeImage(new Uint8Array(await image.arrayBuffer()), key);
        const { data: saved, error: saveError } = await service.from('aed_image_checks').update({ status: 'completed', result, error_code: null, model, updated_at: new Date().toISOString() }).eq('submission_id', submissionId).eq('request_id', token).select('submission_id');
        if (saveError || !saved?.length) throw new Error('ai_save_failed');
        return reply({ result, cached: false });
    } catch (error) {
        const known = ['invalid_image', 'image_unavailable', 'ai_rate_limited', 'ai_provider_failed', 'ai_incomplete', 'ai_unavailable', 'ai_invalid_result', 'ai_save_failed'];
        const code = known.includes(error?.message) ? error.message : 'ai_failed';
        if (service && token && submissionId) await service.from('aed_image_checks').update({ status: 'failed', error_code: code, updated_at: new Date().toISOString() }).eq('submission_id', submissionId).eq('request_id', token);
        // Never log credentials, source photos, provider messages or request bodies.
        return reply({ error: code }, 500);
    }
});
