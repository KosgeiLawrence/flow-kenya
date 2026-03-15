import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import nodemailer from 'nodemailer'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'

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

  if (!host || !user || !pass) {
    throw new Error('SMTP credentials not configured')
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, source } = await req.json()
    const couponCode = 'PILOT2026'

    // Only enforce admin check for non-partner invites
    if (source !== 'cleanup_partner') {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle()

      if (!roleData) {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const SITE_URL = 'https://duaraflow.co.ke'
    const signupUrl = couponCode
      ? `${SITE_URL}/signup?coupon=${encodeURIComponent(couponCode)}`
      : `${SITE_URL}/signup`

    const templateProps = {
      siteName: 'Duara Flow',
      siteUrl: SITE_URL,
      confirmationUrl: signupUrl,
      couponCode: couponCode || undefined,
    }

    const html = await renderAsync(React.createElement(InviteEmail, templateProps))
    const text = await renderAsync(React.createElement(InviteEmail, templateProps), {
      plainText: true,
    })

    const transporter = createTransporter()
    const info = await transporter.sendMail({
      from: 'Duara Flow <info@duaraflow.co.ke>',
      to: email,
      subject: couponCode
        ? "You've been invited to Duara Flow 🎁"
        : "You've been invited to Duara Flow",
      html,
      text,
    })

    console.log('Invite sent', { messageId: info.messageId, to: email, hasCoupon: !!couponCode })

    return new Response(
      JSON.stringify({ success: true, message_id: info.messageId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Send invite error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
