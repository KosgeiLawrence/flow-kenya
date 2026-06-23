import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer'

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

function RegistrationConfirmEmail({ participantName, cleanupTitle, cleanupDate, startTime, endTime, locationName, locationType, leadOrganizer, partners }: {
  participantName: string
  cleanupTitle: string
  cleanupDate: string
  startTime: string
  endTime: string
  locationName: string
  locationType: string
  leadOrganizer: string
  partners: string[]
}) {
  const el = React.createElement
  return el('html', null,
    el('body', { style: { fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", backgroundColor: '#f8f9fa', margin: 0, padding: 0 } },
      el('div', { style: { maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', marginTop: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } },
        // Header
        el('div', { style: { backgroundColor: '#1B5E20', padding: '32px 24px', textAlign: 'center' as const } },
          el('h1', { style: { color: '#ffffff', fontSize: '24px', margin: '0 0 8px 0', fontWeight: '700' } }, '🌿 Registration Confirmed!'),
          el('p', { style: { color: '#C8E6C9', fontSize: '14px', margin: 0 } }, 'Thank you for signing up for our cleanup exercise')
        ),
        // Body
        el('div', { style: { padding: '32px 24px' } },
          el('p', { style: { fontSize: '16px', color: '#333', lineHeight: '1.6', margin: '0 0 16px 0' } },
            `Dear ${participantName},`),
          el('p', { style: { fontSize: '15px', color: '#555', lineHeight: '1.6', margin: '0 0 24px 0' } },
            `Thank you for registering for "${cleanupTitle}". We're excited to have you join us! Here are the details:`),

          // Details card
          el('div', { style: { backgroundColor: '#E8F5E9', borderRadius: '8px', padding: '20px', margin: '0 0 24px 0', border: '1px solid #C8E6C9' } },
            el('h3', { style: { color: '#1B5E20', fontSize: '14px', margin: '0 0 12px 0', textTransform: 'uppercase' as const, letterSpacing: '0.5px' } }, 'Event Details'),
            el('table', { style: { width: '100%', fontSize: '14px', color: '#333' } },
              el('tbody', null,
                el('tr', null,
                  el('td', { style: { padding: '6px 0', color: '#666', verticalAlign: 'top', width: '120px' } }, '📋 Event:'),
                  el('td', { style: { padding: '6px 0', fontWeight: '600' } }, cleanupTitle),
                ),
                el('tr', null,
                  el('td', { style: { padding: '6px 0', color: '#666', verticalAlign: 'top' } }, '📅 Date:'),
                  el('td', { style: { padding: '6px 0', fontWeight: '600' } }, cleanupDate),
                ),
                el('tr', null,
                  el('td', { style: { padding: '6px 0', color: '#666', verticalAlign: 'top' } }, '⏰ Time:'),
                  el('td', { style: { padding: '6px 0', fontWeight: '600' } }, `${startTime} – ${endTime}`),
                ),
                el('tr', null,
                  el('td', { style: { padding: '6px 0', color: '#666', verticalAlign: 'top' } }, '📍 Venue:'),
                  el('td', { style: { padding: '6px 0', fontWeight: '600' } }, locationName),
                ),
                el('tr', null,
                  el('td', { style: { padding: '6px 0', color: '#666', verticalAlign: 'top' } }, '🏷️ Type:'),
                  el('td', { style: { padding: '6px 0', fontWeight: '600' } }, locationType),
                ),
                el('tr', null,
                  el('td', { style: { padding: '6px 0', color: '#666', verticalAlign: 'top' } }, '👤 Organizer:'),
                  el('td', { style: { padding: '6px 0', fontWeight: '600' } }, leadOrganizer),
                ),
              )
            ),
          ),

          // Partners section
          ...(partners.length > 0 ? [
            el('div', { key: 'partners', style: { backgroundColor: '#FFF8E1', borderRadius: '8px', padding: '20px', margin: '0 0 24px 0', border: '1px solid #FFE082' } },
              el('h3', { style: { color: '#F57F17', fontSize: '14px', margin: '0 0 12px 0', textTransform: 'uppercase' as const, letterSpacing: '0.5px' } }, '🤝 Partner Organizations'),
              el('ul', { style: { margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#333' } },
                ...partners.map((name, i) =>
                  el('li', { key: i, style: { padding: '4px 0', fontWeight: '500' } }, name)
                )
              )
            )
          ] : []),

          el('div', { style: { backgroundColor: '#E3F2FD', borderRadius: '8px', padding: '16px', margin: '0 0 24px 0', border: '1px solid #BBDEFB' } },
            el('p', { style: { fontSize: '14px', color: '#1565C0', margin: 0, lineHeight: '1.5' } },
              '💡 Please arrive 15 minutes early. Wear comfortable clothes and closed shoes. Gloves and bags will be provided at the venue.')
          ),

          el('p', { style: { fontSize: '15px', color: '#555', lineHeight: '1.6', margin: '0 0 8px 0' } },
            'We look forward to seeing you there! Together, we can make a real difference for our environment.'),
        ),

        // Footer
        el('div', { style: { backgroundColor: '#f5f5f5', padding: '20px 24px', textAlign: 'center' as const, borderTop: '1px solid #e0e0e0' } },
          el('p', { style: { fontSize: '12px', color: '#999', margin: '0 0 4px 0' } }, '© Twende Green Ecocycle · Circular Economy Traceability Platform'),
          el('a', { href: 'https://duaraflow.co.ke', style: { fontSize: '12px', color: '#1B5E20', textDecoration: 'none' } }, 'duaraflow.co.ke'),
        ),
      )
    )
  )
}

const LOCATION_TYPE_LABELS: Record<string, string> = {
  beach: 'Beach', river: 'River', community: 'Community',
  public_space: 'Public Space', forest: 'Forest', roadside: 'Roadside',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { cleanupId, fullName, email, phoneNumber, organizationName, roleTitle, notes } = await req.json()

    if (!cleanupId || typeof cleanupId !== 'string') {
      return new Response(JSON.stringify({ error: 'Cleanup ID is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Full name is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // Fetch full cleanup details
    const { data: cleanup, error: fetchError } = await supabase
      .from('cleanup_exercises')
      .select('*')
      .eq('id', cleanupId)
      .single()

    if (fetchError || !cleanup) {
      return new Response(JSON.stringify({ error: 'Cleanup exercise not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Insert participant
    const { data: participant, error: insertError } = await supabase
      .from('cleanup_participants')
      .insert({
        cleanup_id: cleanupId,
        full_name: fullName.trim(),
        email: email?.trim() || null,
        phone_number: phoneNumber?.trim() || null,
        organization_name: organizationName?.trim() || null,
        role_title: roleTitle?.trim() || null,
        notes: notes?.trim() || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to register participant' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send confirmation email if email provided
    const trimmedEmail = email?.trim()
    let emailSent = false

    if (trimmedEmail && trimmedEmail.includes('@')) {
      try {
        // Fetch partner organizations
        const { data: partnerRows } = await supabase
          .from('cleanup_partners')
          .select('organization_id')
          .eq('cleanup_id', cleanupId)

        let partnerNames: string[] = []
        if (partnerRows && partnerRows.length > 0) {
          const orgIds = partnerRows.map((p: any) => p.organization_id)
          const { data: orgs } = await supabase
            .from('organizations')
            .select('name')
            .in('id', orgIds)
          partnerNames = (orgs || []).map((o: any) => o.name)
        }

        const cleanupDate = new Date(cleanup.cleanup_date).toLocaleDateString('en-GB', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        })

        const emailHtml = await renderAsync(
          React.createElement(RegistrationConfirmEmail, {
            participantName: fullName.trim(),
            cleanupTitle: cleanup.title,
            cleanupDate,
            startTime: cleanup.start_time,
            endTime: cleanup.end_time,
            locationName: cleanup.location_name,
            locationType: LOCATION_TYPE_LABELS[cleanup.location_type] || cleanup.location_type,
            leadOrganizer: cleanup.lead_organizer,
            partners: partnerNames,
          })
        )

        const transporter = createTransporter()
        await transporter.sendMail({
          from: '"Twende Green Ecocycle" <info@duaraflow.co.ke>',
          to: trimmedEmail,
          subject: `Registration Confirmed: ${cleanup.title} 🌿`,
          html: emailHtml,
        })
        emailSent = true
        console.log(`Registration confirmation email sent to ${trimmedEmail}`)
      } catch (emailErr) {
        console.error('Failed to send registration email:', emailErr)
        // Don't fail the registration if email fails
      }
    }

    return new Response(JSON.stringify({ success: true, participant, cleanupTitle: cleanup.title, emailSent }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Register participant error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
