import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { token, full_name, password } = await req.json()
    if (!token || !full_name || !password) {
      return new Response(JSON.stringify({ error: 'Token, full_name, and password are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    // Find and validate invitation
    const { data: invitation, error: invErr } = await admin
      .from('team_invitations')
      .select('*')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .single()

    if (invErr || !invitation) {
      return new Response(JSON.stringify({ error: 'Invalid or expired invitation' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await admin.from('team_invitations').update({ status: 'expired' }).eq('id', invitation.id)
      return new Response(JSON.stringify({ error: 'This invitation has expired' }), { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Create user via admin API
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: invitation.role,
        is_independent: !invitation.organization_id,
        team_invite: true,
      },
    })

    if (createErr) {
      console.error('Create user error:', createErr)
      return new Response(JSON.stringify({ error: createErr.message || 'Failed to create account' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userId = newUser.user.id

    // Link to organization if applicable
    if (invitation.organization_id) {
      await admin.from('profiles').update({
        organization_id: invitation.organization_id,
        approval_status: 'approved',
      }).eq('user_id', userId)
    } else {
      await admin.from('profiles').update({
        approval_status: 'approved',
      }).eq('user_id', userId)
    }

    // Create team member record
    await admin.from('team_members').insert({
      user_id: userId,
      invited_by: invitation.invited_by,
      organization_id: invitation.organization_id,
      role: invitation.role,
      feature_permissions: invitation.feature_permissions,
    })

    // Mark invitation as accepted
    await admin.from('team_invitations').update({ status: 'accepted' }).eq('id', invitation.id)

    console.log('Team member created', { userId, role: invitation.role, invitedBy: invitation.invited_by })

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Accept team invite error:', message)
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
