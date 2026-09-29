import { withSupabase } from 'npm:@supabase/server@^1'

export default {
  fetch: withSupabase({ auth: 'secret' }, async (_req, ctx) => {
    const supabaseAdmin = ctx.supabaseAdmin

    const testEmail = `poc_${Date.now()}@dummy.michimamo.local`
    let createdUserId = null
    let isSuccess = false
    let errorMessage = ''

    try {
      const { data: user, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: testEmail,
          email_confirm: true
        })

      if (createErr) throw createErr
      createdUserId = user.user.id

      const { data: linkData, error: linkErr } =
        await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: testEmail
        })

      if (linkErr) throw linkErr

      const hashedToken = linkData.properties.hashed_token

      const { data: sessionData, error: verifyErr } =
        await supabaseAdmin.auth.verifyOtp({
          token_hash: hashedToken,
          type: 'email'
        })

      if (verifyErr) throw verifyErr

      const session = sessionData.session

      if (session?.user?.id === createdUserId) {
        isSuccess = true
      } else {
        throw new Error('Session is missing or user ID mismatch.')
      }

    } catch (err) {
      errorMessage =
        err instanceof Error ? err.message : String(err)

    } finally {
      if (createdUserId) {
        await supabaseAdmin.auth.admin.deleteUser(createdUserId)
      }
    }

    if (isSuccess) {
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  })
}