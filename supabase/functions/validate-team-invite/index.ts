import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { token } = await req.json()
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    // Find invitation
    const { data: invitation, error: invErr } = await admin
      .from('team_invitations')
      .select('*')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .single()

    if (invErr || !invitation) {
      return new Response(JSON.stringify({ error: 'Invalid or expired invitation' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      await admin.from('team_invitations').update({ status: 'expired' }).eq('id', invitation.id)
      return new Response(JSON.stringify({ error: 'This invitation has expired' }), { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get inviter profile
    const { data: inviter } = await admin
      .from('profiles')
      .select('full_name, avatar_url, email')
      .eq('user_id', invitation.invited_by)
      .single()

    // Get organization
    let organization = null
    if (invitation.organization_id) {
      const { data: org } = await admin
        .from('organizations')
        .select('name, logo_url')
        .eq('id', invitation.organization_id)
        .single()
      organization = org
    }

    return new Response(JSON.stringify({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        feature_permissions: invitation.feature_permissions,
      },
      inviter,
      organization,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
