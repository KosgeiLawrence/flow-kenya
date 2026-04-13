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

    let userId: string
    let isExistingUser = false

    // Try to create user via admin API
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
      // If user already exists, find them and link to team instead
      if (createErr.message?.includes('already been registered') || (createErr as any).code === 'email_exists') {
        console.log('User already exists, linking to team:', invitation.email)

        // Look up the existing user
        const { data: { users }, error: listErr } = await admin.auth.admin.listUsers()
        if (listErr) {
          console.error('List users error:', listErr)
          return new Response(JSON.stringify({ error: 'Failed to find existing user' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const existingUser = users?.find((u: any) => u.email === invitation.email)
        if (!existingUser) {
          return new Response(JSON.stringify({ error: 'Could not find user account. Please contact support.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        userId = existingUser.id
        isExistingUser = true

        // Update their password if they're accepting the invite
        await admin.auth.admin.updateUser(userId, { password })
      } else {
        console.error('Create user error:', createErr)
        return new Response(JSON.stringify({ error: createErr.message || 'Failed to create account' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    } else {
      userId = newUser.user.id
    }

    // Update profile: link to organization and approve
    if (invitation.organization_id) {
      await admin.from('profiles').update({
        organization_id: invitation.organization_id,
        approval_status: 'approved',
        ...(isExistingUser ? { full_name } : {}),
      }).eq('user_id', userId)
    } else {
      await admin.from('profiles').update({
        approval_status: 'approved',
        ...(isExistingUser ? { full_name } : {}),
      }).eq('user_id', userId)
    }

    // Check if already a team member to avoid duplicates
    const { data: existingMember } = await admin
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .eq('invited_by', invitation.invited_by)
      .maybeSingle()

    if (!existingMember) {
      // Create team member record
      await admin.from('team_members').insert({
        user_id: userId,
        invited_by: invitation.invited_by,
        organization_id: invitation.organization_id,
        role: invitation.role,
        feature_permissions: invitation.feature_permissions,
      })
    }

    // Mark invitation as accepted
    await admin.from('team_invitations').update({ status: 'accepted' }).eq('id', invitation.id)

    console.log('Team member created', { userId, role: invitation.role, invitedBy: invitation.invited_by, isExistingUser })

    return new Response(JSON.stringify({ success: true, user_id: userId, existing_user: isExistingUser }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Accept team invite error:', message)
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
