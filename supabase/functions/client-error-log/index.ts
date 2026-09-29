import { withSupabase } from 'npm:@supabase/server@^1'

const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const ALLOWED_ORIGINS = new Set([
  'https://machimamo-map.vercel.app',
  'https://michimamo-map.vercel.app',
  'https://machimamo-map-miti4.vercel.app',
])

const ALLOWED_KINDS = new Set([
  'global_error',
  'unhandled_rejection',
  'rpc_failure',
  'line_auth_failure',
])

const SAFE_TOKEN = /^[a-z0-9][a-z0-9._:-]{0,63}$/i

function headers(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin)
    ? origin
    : 'https://machimamo-map.vercel.app'

  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, apikey',
    'Vary': 'Origin',
  }
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function safePath(value: unknown) {
  if (typeof value !== 'string') return '/'
  const path = value.split('?')[0].split('#')[0]
  if (!path.startsWith('/') || path.length > 160) return '/'
  return path.replace(/[^A-Za-z0-9/_\-.]/g, '_')
}

function safeToken(value: unknown, fallback: string) {
  if (typeof value !== 'string' || !SAFE_TOKEN.test(value)) {
    return fallback
  }
  return value
}

export default {
  fetch: withSupabase(
    { auth: 'none' },

    async (req, ctx) => {
      const origin = req.headers.get('origin')
      const cors = headers(origin)

      if (req.method === 'OPTIONS') {
        if (!origin || !ALLOWED_ORIGINS.has(origin)) {
          return new Response('Forbidden', { status: 403, headers: cors })
        }
        return new Response(null, { status: 204, headers: cors })
      }

      if (
        req.method !== 'POST' ||
        !origin ||
        !ALLOWED_ORIGINS.has(origin)
      ) {
        return new Response('Forbidden', { status: 403, headers: cors })
      }

      const contentLength = Number(
        req.headers.get('content-length') || '0'
      )
      if (contentLength > 2048) {
        return new Response('Payload too large', {
          status: 413,
          headers: cors,
        })
      }

      const forwardedFor = req.headers.get('x-forwarded-for')
      const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown'

      if (!SUPABASE_SERVICE_ROLE_KEY) {
        console.error('client_error_log_missing_service_key')
        return new Response('Unavailable', { status: 503, headers: cors })
      }

      const subjectHash = await sha256Hex(
        'client-error-rate:' +
        SUPABASE_SERVICE_ROLE_KEY +
        ':' +
        ip
      )

      const { data: rateRows, error: rateError } =
        await ctx.supabaseAdmin.rpc(
          'consume_edge_rate_limit',
          {
            p_scope: 'client-error-log',
            p_subject_hash: subjectHash,
            p_limit: 20,
            p_window_seconds: 60,
          },
        )

      if (rateError || !Array.isArray(rateRows) || !rateRows[0]) {
        console.error('client_error_log_rate_limit_unavailable')
        return new Response('Unavailable', { status: 503, headers: cors })
      }

      if (rateRows[0].allowed !== true) {
        return new Response('Too Many Requests', {
          status: 429,
          headers: {
            ...cors,
            'Retry-After': String(
              Math.max(
                1,
                Number(rateRows[0].retry_after_seconds || 60),
              ),
            ),
          },
        })
      }

      let payload: Record<string, unknown>
      try {
        payload = await req.json()
      } catch {
        return new Response('Bad Request', { status: 400, headers: cors })
      }

      const kind = safeToken(payload.kind, '')
      if (!ALLOWED_KINDS.has(kind)) {
        return new Response('Bad Request', { status: 400, headers: cors })
      }

      const code = safeToken(payload.code, 'unknown')
      const detail = safeToken(payload.detail, 'none')
      const phase = safeToken(payload.phase, 'none')
      const source = safeToken(payload.source, 'unknown')
      const line = Number.isInteger(payload.line) &&
        Number(payload.line) >= 0 &&
        Number(payload.line) <= 10_000_000
        ? Number(payload.line)
        : 0
      const path = safePath(payload.path)

      console.error(
        JSON.stringify({
          event: 'machimamo_client_error',
          kind,
          code,
          detail,
          phase,
          source,
          line,
          path,
        }),
      )

      return new Response(null, { status: 204, headers: cors })
    },
  ),
}
