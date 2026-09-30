import { withSupabase } from 'npm:@supabase/server@^1'

// ==========================================
// 環境変数
// ==========================================

const LINE_CHANNEL_ID = Deno.env.get('LINE_CHANNEL_ID')!
const LINE_CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET')!

const FRONTEND_URL =
  Deno.env.get('FRONTEND_URL') ||
  'https://michimamo-map.vercel.app'

const EDGE_CALLBACK_URL =
  Deno.env.get('EDGE_CALLBACK_URL') ||
  'https://ckftozjhdszlwqnylmxv.supabase.co/functions/v1/line-auth/callback'


// ==========================================
// CORS
// ==========================================

const corsHeaders = {
  'Access-Control-Allow-Origin': FRONTEND_URL,
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}


// ==========================================
// 補助的 In-Memory Rate Limiter
//
// 注意:
// Edge Functionの再起動・複数インスタンスでは共有されないため
// 本格的なRate Limitの代用品ではない。
// ==========================================

const rateLimitMap = new Map<string, number[]>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()

  const records = (rateLimitMap.get(ip) || [])
    .filter((t) => now - t < 60_000)

  if (records.length >= 10) {
    return false
  }

  records.push(now)
  rateLimitMap.set(ip, records)

  return true
}


async function checkPersistentRateLimit(
  supabaseAdmin: any,
  ip: string
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  // Store only a keyed hash in Postgres. Never persist the raw client IP.
  const subjectHash = await sha256Hex(
    'line-auth-rate-limit:' + LINE_CHANNEL_SECRET + ':' + ip
  )

  const { data, error } = await supabaseAdmin.rpc(
    'consume_edge_rate_limit',
    {
      p_scope: 'line-auth',
      p_subject_hash: subjectHash,
      p_limit: 10,
      p_window_seconds: 60,
    }
  )

  if (error || !Array.isArray(data) || !data[0]) {
    throw new Error('Persistent rate limit unavailable')
  }

  return {
    allowed: data[0].allowed === true,
    retryAfterSeconds: Math.max(
      1,
      Number(data[0].retry_after_seconds || 60)
    ),
  }
}


// ==========================================
// 暗号ユーティリティ
// ==========================================

function base64UrlEncodeBuf(buffer: ArrayBuffer | Uint8Array): string {
  let binary = ''

  const bytes = buffer instanceof Uint8Array
    ? buffer
    : new Uint8Array(buffer)

  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}


async function sha256Hex(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text)

  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    encoded
  )

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}


async function sha256Base64Url(
  text: string
): Promise<string> {
  const encoded = new TextEncoder().encode(text)

  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    encoded
  )

  return base64UrlEncodeBuf(hashBuffer)
}


function generateRandomString(
  length = 32
): string {
  const array = new Uint8Array(length)

  crypto.getRandomValues(array)

  return base64UrlEncodeBuf(array)
}


// ==========================================
// 入力値検証
// ==========================================

function isValidBase64Url(
  value: unknown,
  minLen: number,
  maxLen: number
): value is string {

  if (typeof value !== 'string') {
    return false
  }

  if (
    value.length < minLen ||
    value.length > maxLen
  ) {
    return false
  }

  return /^[A-Za-z0-9_-]+$/.test(value)
}


// ==========================================
// メイン
// verify_jwt = false
// auth:'none'
// ==========================================

export default {

  fetch: withSupabase(
    { auth: 'none' },

    async (req, ctx) => {

      const supabaseAdmin = ctx.supabaseAdmin

      const url = new URL(req.url)

      const forwardedFor =
        req.headers.get('x-forwarded-for')

      const ip =
        forwardedFor?.split(',')[0]?.trim() ||
        'unknown'

      const origin =
        req.headers.get('origin')


      // ======================================
      // CORS Preflight
      // ======================================

      if (req.method === 'OPTIONS') {

        if (
          origin &&
          origin !== FRONTEND_URL
        ) {
          return new Response(
            'Forbidden',
            {
              status: 403,
              headers: corsHeaders,
            }
          )
        }

        return new Response(
          'ok',
          {
            headers: corsHeaders,
          }
        )
      }


      // ======================================
      // 補助Rate Limit
      // ======================================

      if (!checkRateLimit(ip)) {

        return new Response(
          JSON.stringify({
            error: 'Too Many Requests',
          }),
          {
            status: 429,
            headers: corsHeaders,
          }
        )
      }


      try {

        // ====================================
        // Shared persistent Rate Limit
        // ====================================

        const persistentRateLimit =
          await checkPersistentRateLimit(
            supabaseAdmin,
            ip
          )

        if (!persistentRateLimit.allowed) {

          return new Response(
            JSON.stringify({
              error: 'Too Many Requests',
            }),
            {
              status: 429,
              headers: {
                ...corsHeaders,
                'Retry-After':
                  String(
                    persistentRateLimit
                      .retryAfterSeconds
                  ),
              },
            }
          )
        }


        // ====================================
        // [1] /start
        // ====================================

        if (
          url.pathname.endsWith('/start') &&
          req.method === 'POST'
        ) {

          if (origin !== FRONTEND_URL) {

            return new Response(
              JSON.stringify({
                error: 'Forbidden',
              }),
              {
                status: 403,
                headers: corsHeaders,
              }
            )
          }


          const body = await req.json()

          const exchange_challenge =
            body?.exchange_challenge


          // SHA-256 → Base64URL は43文字
          if (
            !isValidBase64Url(
              exchange_challenge,
              43,
              43
            )
          ) {

            return new Response(
              JSON.stringify({
                error:
                  'Invalid exchange_challenge',
              }),
              {
                status: 400,
                headers: corsHeaders,
              }
            )
          }


          // OAuth state
          const state =
            generateRandomString(32)

          const state_hash =
            await sha256Hex(state)


          // OIDC nonce
          const nonce =
            generateRandomString(32)


          // LINE PKCE
          // 32 byte → Base64URL = 43 chars
          const line_code_verifier =
            generateRandomString(32)

          const line_code_challenge =
            await sha256Base64Url(
              line_code_verifier
            )


          // DBへ5分間保存
          const {
            error: dbErr,
          } = await supabaseAdmin
            .from('auth_challenges')
            .insert({
              state_hash,
              nonce,
              line_code_verifier,
              exchange_challenge,

              expires_at:
                new Date(
                  Date.now() +
                  5 * 60 * 1000
                ).toISOString(),
            })


          if (dbErr) {
            throw new Error(
              'Failed to create auth challenge'
            )
          }


          const params =
            new URLSearchParams({
              response_type: 'code',

              client_id:
                LINE_CHANNEL_ID,

              redirect_uri:
                EDGE_CALLBACK_URL,

              state,

              scope:
                'profile openid',

              nonce,

              code_challenge:
                line_code_challenge,

              code_challenge_method:
                'S256',
            })


          const lineAuthUrl =
            `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`


          return new Response(
            JSON.stringify({
              url: lineAuthUrl,
            }),
            {
              headers: corsHeaders,
            }
          )
        }



        // ====================================
        // [2] /callback
        // ====================================

        if (
          url.pathname.endsWith('/callback') &&
          req.method === 'GET'
        ) {

          const code =
            url.searchParams.get('code')

          const state =
            url.searchParams.get('state')

          const lineError =
            url.searchParams.get('error')


          if (
            lineError ||
            !code ||
            !state
          ) {

            return Response.redirect(
              `${FRONTEND_URL}/?error=line_auth_failed`,
              302
            )
          }


          // stateは32 bytesのBase64URL
          // 通常43文字
          if (
            !isValidBase64Url(
              state,
              43,
              43
            )
          ) {

            return Response.redirect(
              `${FRONTEND_URL}/?error=invalid_state`,
              302
            )
          }


          // LINE codeの異常な巨大入力防止
          if (
            typeof code !== 'string' ||
            code.length < 10 ||
            code.length > 2048
          ) {

            return Response.redirect(
              `${FRONTEND_URL}/?error=invalid_code`,
              302
            )
          }


          const state_hash =
            await sha256Hex(state)


          // ----------------------------------
          // stateを原子的に消費
          // ----------------------------------

          const {
            data: challengeData,
            error: rpcErr,
          } = await supabaseAdmin.rpc(
            'consume_auth_challenge',
            {
              p_state_hash:
                state_hash,
            }
          )


          if (rpcErr) {

            return Response.redirect(
              `${FRONTEND_URL}/?error=invalid_or_expired_state`,
              302
            )
          }


          const challenge =
            challengeData?.[0]


          if (!challenge) {

            return Response.redirect(
              `${FRONTEND_URL}/?error=invalid_or_expired_state`,
              302
            )
          }


          // ----------------------------------
          // LINE Token API
          // ----------------------------------

          const tokenRes =
            await fetch(
              'https://api.line.me/oauth2/v2.1/token',
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/x-www-form-urlencoded',
                },

                body:
                  new URLSearchParams({
                    grant_type:
                      'authorization_code',

                    code,

                    redirect_uri:
                      EDGE_CALLBACK_URL,

                    client_id:
                      LINE_CHANNEL_ID,

                    client_secret:
                      LINE_CHANNEL_SECRET,

                    code_verifier:
                      challenge
                        .r_line_code_verifier,
                  }),
              }
            )


          if (!tokenRes.ok) {

            throw new Error(
              'LINE Token API Error'
            )
          }


          const tokenJson =
            await tokenRes.json()


          if (
            typeof tokenJson.id_token !==
            'string'
          ) {

            throw new Error(
              'LINE ID token missing'
            )
          }


          // ----------------------------------
          // LINE Verify ID Token API
          // ----------------------------------

          const verifyRes =
            await fetch(
              'https://api.line.me/oauth2/v2.1/verify',
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/x-www-form-urlencoded',
                },

                body:
                  new URLSearchParams({
                    id_token:
                      tokenJson.id_token,

                    client_id:
                      LINE_CHANNEL_ID,

                    nonce:
                      challenge.r_nonce,
                  }),
              }
            )


          if (!verifyRes.ok) {

            throw new Error(
              'LINE Verify API Error'
            )
          }


          const verifyJson =
            await verifyRes.json()


          if (
            typeof verifyJson.sub !==
            'string' ||
            !verifyJson.sub
          ) {

            throw new Error(
              'LINE identity missing'
            )
          }


          const line_sub =
            verifyJson.sub


          // ----------------------------------
          // 既存LINE identity検索
          // ----------------------------------

          const {
            data: identity,
            error: identityErr,
          } = await supabaseAdmin
            .from(
              'auth_identities_michimamo'
            )
            .select('auth_id')
            .eq(
              'provider',
              'line'
            )
            .eq(
              'provider_user_id',
              line_sub
            )
            .maybeSingle()


          if (identityErr) {
            throw new Error(
              'Identity lookup failed'
            )
          }


          let auth_id = ''

          let newlyCreatedUserId:
            string | null = null


          // ----------------------------------
          // 既存ユーザー
          // ----------------------------------

          if (identity) {

            auth_id =
              identity.auth_id

          } else {

            // --------------------------------
            // 初回LINEユーザー
            // --------------------------------

            const dummyEmail =
              `user_${crypto.randomUUID()}@dummy.michimamo.local`


            const {
              data: newUser,
              error: createErr,
            } =
              await supabaseAdmin
                .auth
                .admin
                .createUser({
                  email:
                    dummyEmail,

                  email_confirm:
                    true,
                })


            if (
              createErr ||
              !newUser?.user?.id
            ) {

              throw new Error(
                'Supabase user creation failed'
              )
            }


            auth_id =
              newUser.user.id

            newlyCreatedUserId =
              auth_id


            const {
              error: insertErr,
            } =
              await supabaseAdmin
                .from(
                  'auth_identities_michimamo'
                )
                .insert({
                  auth_id,

                  provider:
                    'line',

                  provider_user_id:
                    line_sub,
                })


            if (insertErr) {

              await supabaseAdmin
                .auth
                .admin
                .deleteUser(
                  newlyCreatedUserId
                )

              throw new Error(
                'Identity creation failed'
              )
            }
          }


          // ----------------------------------
          // Session Exchange Code
          // ----------------------------------

          const login_code =
            generateRandomString(32)

          const code_hash =
            await sha256Hex(
              login_code
            )


          const {
            error: exchangeInsertErr,
          } =
            await supabaseAdmin
              .from(
                'auth_exchange_codes'
              )
              .insert({
                code_hash,

                auth_id,

                exchange_challenge:
                  challenge
                    .r_exchange_challenge,

                expires_at:
                  new Date(
                    Date.now() +
                    60 * 1000
                  ).toISOString(),
              })


          if (exchangeInsertErr) {

            // 新規ユーザーの場合だけ
            // Compensation Rollback
            if (
              newlyCreatedUserId
            ) {

              await supabaseAdmin
                .auth
                .admin
                .deleteUser(
                  newlyCreatedUserId
                )
            }


            throw new Error(
              'Exchange code creation failed'
            )
          }


          // Tokenではなく
          // 短命login_codeのみFrontendへ渡す
          return Response.redirect(
            `${FRONTEND_URL}/?login_code=${encodeURIComponent(login_code)}`,
            302
          )
        }



        // ====================================
        // [3] /exchange
        // ====================================

        if (
          url.pathname.endsWith('/exchange') &&
          req.method === 'POST'
        ) {

          if (
            origin !== FRONTEND_URL
          ) {

            return new Response(
              JSON.stringify({
                error: 'Forbidden',
              }),
              {
                status: 403,
                headers: corsHeaders,
              }
            )
          }


          const body =
            await req.json()


          const login_code =
            body?.login_code

          const exchange_verifier =
            body?.exchange_verifier


          // login_code = 32 bytes → 43 chars
          if (
            !isValidBase64Url(
              login_code,
              43,
              43
            )
          ) {

            return new Response(
              JSON.stringify({
                error:
                  'Invalid login code',
              }),
              {
                status: 400,
                headers: corsHeaders,
              }
            )
          }


          // RFC7636 PKCE verifier
          if (
            !isValidBase64Url(
              exchange_verifier,
              43,
              128
            )
          ) {

            return new Response(
              JSON.stringify({
                error:
                  'Invalid exchange verifier',
              }),
              {
                status: 400,
                headers: corsHeaders,
              }
            )
          }


          const code_hash =
            await sha256Hex(
              login_code
            )


          const exchange_challenge =
            await sha256Base64Url(
              exchange_verifier
            )


          // ----------------------------------
          // login_code + PKCEを
          // DB内で原子的に消費
          // ----------------------------------

          const {
            data: exchangeData,
            error: exchangeRpcErr,
          } =
            await supabaseAdmin.rpc(
              'consume_auth_exchange_code',
              {
                p_code_hash:
                  code_hash,

                p_exchange_challenge:
                  exchange_challenge,
              }
            )


          if (exchangeRpcErr) {

            return new Response(
              JSON.stringify({
                error:
                  'Invalid or expired exchange code',
              }),
              {
                status: 401,
                headers: corsHeaders,
              }
            )
          }


          const exchangeRow =
            exchangeData?.[0]


          if (!exchangeRow) {

            return new Response(
              JSON.stringify({
                error:
                  'Invalid or expired exchange code',
              }),
              {
                status: 401,
                headers: corsHeaders,
              }
            )
          }


          const auth_id =
            exchangeRow.r_auth_id


          // ----------------------------------
          // Supabaseユーザー取得
          // ----------------------------------

          const {
            data: userData,
            error: getUserErr,
          } =
            await supabaseAdmin
              .auth
              .admin
              .getUserById(
                auth_id
              )


          if (
            getUserErr ||
            !userData?.user?.email
          ) {

            throw new Error(
              'Auth user lookup failed'
            )
          }


          // ----------------------------------
          // Magic Link Token生成
          // ----------------------------------

          const {
            data: linkData,
            error: linkErr,
          } =
            await supabaseAdmin
              .auth
              .admin
              .generateLink({
                type:
                  'magiclink',

                email:
                  userData
                    .user
                    .email,
              })


          if (
            linkErr ||
            !linkData
              ?.properties
              ?.hashed_token
          ) {

            throw new Error(
              'Session link generation failed'
            )
          }


          // ----------------------------------
          // PoCで実証済みの方式
          // emailは入れない
          // ----------------------------------

          const {
            data: sessionData,
            error: verifyErr,
          } =
            await supabaseAdmin
              .auth
              .verifyOtp({
                token_hash:
                  linkData
                    .properties
                    .hashed_token,

                type:
                  'email',
              })


          if (
            verifyErr ||
            !sessionData?.session
          ) {

            throw new Error(
              'Session creation failed'
            )
          }


          // Token類はログへ出さない
          // HTTPS JSON BodyでFrontendへ返す
          return new Response(
            JSON.stringify({
              session:
                sessionData.session,
            }),
            {
              status: 200,
              headers: corsHeaders,
            }
          )
        }



        // ====================================
        // 未知のRoute
        // ====================================

        return new Response(
          JSON.stringify({
            error: 'Not Found',
          }),
          {
            status: 404,
            headers: corsHeaders,
          }
        )


      } catch (_error) {

        // Central Supabase Edge logs: emit only a fixed safe code.
        // Never include tokens, OAuth codes, state, user IDs, or raw IPs.
        console.error('line_auth_internal_error')

        // Secret / token / code等を
        // エラーメッセージへ出さない
        return new Response(
          JSON.stringify({
            error:
              'Internal Server Error',
          }),
          {
            status: 500,
            headers: corsHeaders,
          }
        )
      }
    }
  )
}