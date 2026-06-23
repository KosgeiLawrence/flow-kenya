import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6.9.10'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function createTransporter() {
  const host = Deno.env.get('SMTP_HOST')
  const port = parseInt(Deno.env.get('SMTP_PORT') || '465')
  const user = Deno.env.get('SMTP_USER')
  const pass = Deno.env.get('SMTP_PASS')
  if (!host || !user || !pass) throw new Error('SMTP credentials not configured')
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
}

// Inline email template
function TeamInviteEmail({ inviterName, orgName, role, joinUrl, siteName }: {
  inviterName: string; orgName: string; role: string; joinUrl: string; siteName: string;
}) {
  const roleLabel = role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  return React.createElement('html', null,
    React.createElement('body', { style: { fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f4f4', margin: 0, padding: '40px 0' } },
      React.createElement('div', { style: { maxWidth: '520px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', padding: '40px 32px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' } },
        React.createElement('div', { style: { textAlign: 'center' as const, marginBottom: '24px' } },
          React.createElement('img', { src: 'https://duaraflow.co.ke/images/duara-flow-logo.svg', alt: siteName, style: { height: '40px' } }),
        ),
        React.createElement('h1', { style: { fontSize: '22px', color: '#1a1a1a', textAlign: 'center' as const, margin: '0 0 8px' } }, 'You\'re Invited to Join a Team'),
        React.createElement('p', { style: { fontSize: '15px', color: '#555', textAlign: 'center' as const, lineHeight: '1.6', margin: '0 0 24px' } },
          React.createElement('strong', null, inviterName),
          orgName ? ` from ${orgName}` : '',
          ` has invited you to join as a `,
          React.createElement('strong', null, roleLabel),
          ` on ${siteName}.`
        ),
        React.createElement('div', { style: { textAlign: 'center' as const, margin: '24px 0' } },
          React.createElement('a', {
            href: joinUrl,
            style: { display: 'inline-block', backgroundColor: '#16a34a', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '15px' }
          }, 'Accept Invitation & Set Password')
        ),
        React.createElement('p', { style: { fontSize: '13px', color: '#888', textAlign: 'center' as const, margin: '24px 0 0' } }, 'This invitation expires in 7 days.'),
        React.createElement('hr', { style: { border: 'none', borderTop: '1px solid #eee', margin: '24px 0' } }),
        React.createElement('p', { style: { fontSize: '12px', color: '#aaa', textAlign: 'center' as const } }, `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`),
      )
    )
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify caller using getClaims for reliable JWT validation
    const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } })
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('Auth claims error:', claimsError?.message || 'No claims')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const user = { id: claimsData.claims.sub as string, email: claimsData.claims.email as string }

    const { email, feature_permissions, resend_token } = await req.json()

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // --- RESEND MODE: re-send email for an existing pending invitation ---
    if (resend_token) {
      const { data: existing, error: fetchErr } = await adminClient
        .from('team_invitations')
        .select('*')
        .eq('invite_token', resend_token)
        .eq('invited_by', user.id)
        .eq('status', 'pending')
        .single()

      if (fetchErr || !existing) {
        return new Response(JSON.stringify({ error: 'Invitation not found or already accepted' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Get inviter profile & org
      const { data: profileData } = await adminClient.from('profiles').select('full_name, organization_id').eq('user_id', user.id).single()
      let orgName = ''
      if (profileData?.organization_id) {
        const { data: orgData } = await adminClient.from('organizations').select('name').eq('id', profileData.organization_id).single()
        orgName = orgData?.name || ''
      }

      const SITE_URL = 'https://duaraflow.co.ke'
      const joinUrl = `${SITE_URL}/join-team?token=${existing.invite_token}`

      const html = await renderAsync(
        React.createElement(TeamInviteEmail, {
          inviterName: profileData?.full_name || user.email || 'A team member',
          orgName,
          role: existing.role,
          joinUrl,
          siteName: 'Twende Green Ecocycle',
        })
      )

      const transporter = createTransporter()
      const info = await transporter.sendMail({
        from: 'Twende Green Ecocycle <info@duaraflow.co.ke>',
        to: existing.email,
        subject: `Reminder: You've been invited to join a team on Twende Green Ecocycle`,
        html,
      })

      console.log('Team invite resent', { messageId: info.messageId, to: existing.email })
      return new Response(
        JSON.stringify({ success: true, message_id: info.messageId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- NEW INVITE MODE ---
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get inviter's role and profile
    const [{ data: roleData }, { data: profileData }] = await Promise.all([
      adminClient.from('user_roles').select('role').eq('user_id', user.id).single(),
      adminClient.from('profiles').select('full_name, organization_id').eq('user_id', user.id).single(),
    ])

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'No role found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get org name if available
    let orgName = ''
    if (profileData?.organization_id) {
      const { data: orgData } = await adminClient.from('organizations').select('name').eq('id', profileData.organization_id).single()
      orgName = orgData?.name || ''
    }

    // Create invitation record
    const { data: invitation, error: inviteError } = await adminClient
      .from('team_invitations')
      .insert({
        invited_by: user.id,
        email: email.trim().toLowerCase(),
        role: roleData.role,
        organization_id: profileData?.organization_id || null,
        feature_permissions: feature_permissions || [],
      })
      .select('invite_token')
      .single()

    if (inviteError) {
      console.error('Invite insert error:', inviteError)
      return new Response(JSON.stringify({ error: 'Failed to create invitation' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const SITE_URL = 'https://duaraflow.co.ke'
    const joinUrl = `${SITE_URL}/join-team?token=${invitation.invite_token}`

    const html = await renderAsync(
      React.createElement(TeamInviteEmail, {
        inviterName: profileData?.full_name || user.email || 'A team member',
        orgName,
        role: roleData.role,
        joinUrl,
        siteName: 'Twende Green Ecocycle',
      })
    )

    const transporter = createTransporter()
    const info = await transporter.sendMail({
      from: 'Twende Green Ecocycle <info@duaraflow.co.ke>',
      to: email,
      subject: `You've been invited to join a team on Twende Green Ecocycle`,
      html,
    })

    console.log('Team invite sent', { messageId: info.messageId, to: email })

    return new Response(
      JSON.stringify({ success: true, message_id: info.messageId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Send team invite error:', message)
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
