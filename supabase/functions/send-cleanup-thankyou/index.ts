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

function ThankYouEmail({ participantName, cleanupTitle, cleanupDate, locationName, totalWasteKg, reportUrl }: {
  participantName: string
  cleanupTitle: string
  cleanupDate: string
  locationName: string
  totalWasteKg: number
  reportUrl: string
}) {
  return React.createElement('html', null,
    React.createElement('body', {
      style: {
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        backgroundColor: '#f8f9fa',
        margin: 0,
        padding: 0,
      }
    },
      React.createElement('div', {
        style: {
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          overflow: 'hidden',
          marginTop: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }
      },
        // Header
        React.createElement('div', {
          style: {
            backgroundColor: '#1B5E20',
            padding: '32px 24px',
            textAlign: 'center' as const,
          }
        },
          React.createElement('h1', {
            style: { color: '#ffffff', fontSize: '24px', margin: '0 0 8px 0', fontWeight: '700' }
          }, '🌿 Thank You for Showing Up!'),
          React.createElement('p', {
            style: { color: '#C8E6C9', fontSize: '14px', margin: 0 }
          }, 'Your contribution makes a real difference')
        ),

        // Body
        React.createElement('div', { style: { padding: '32px 24px' } },
          React.createElement('p', {
            style: { fontSize: '16px', color: '#333', lineHeight: '1.6', margin: '0 0 16px 0' }
          }, `Dear ${participantName},`),

          React.createElement('p', {
            style: { fontSize: '15px', color: '#555', lineHeight: '1.6', margin: '0 0 24px 0' }
          }, `Thank you for participating in "${cleanupTitle}". Your dedication to keeping our environment clean is truly inspiring!`),

          // Stats card
          React.createElement('div', {
            style: {
              backgroundColor: '#E8F5E9',
              borderRadius: '8px',
              padding: '20px',
              margin: '0 0 24px 0',
              border: '1px solid #C8E6C9',
            }
          },
            React.createElement('h3', {
              style: { color: '#1B5E20', fontSize: '14px', margin: '0 0 12px 0', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
            }, 'Cleanup Summary'),
            React.createElement('table', { style: { width: '100%', fontSize: '14px', color: '#333' } },
              React.createElement('tbody', null,
                React.createElement('tr', null,
                  React.createElement('td', { style: { padding: '4px 0', color: '#666' } }, 'Event:'),
                  React.createElement('td', { style: { padding: '4px 0', fontWeight: '600', textAlign: 'right' as const } }, cleanupTitle),
                ),
                React.createElement('tr', null,
                  React.createElement('td', { style: { padding: '4px 0', color: '#666' } }, 'Date:'),
                  React.createElement('td', { style: { padding: '4px 0', fontWeight: '600', textAlign: 'right' as const } }, cleanupDate),
                ),
                React.createElement('tr', null,
                  React.createElement('td', { style: { padding: '4px 0', color: '#666' } }, 'Location:'),
                  React.createElement('td', { style: { padding: '4px 0', fontWeight: '600', textAlign: 'right' as const } }, locationName),
                ),
                React.createElement('tr', null,
                  React.createElement('td', { style: { padding: '4px 0', color: '#666' } }, 'Total Waste Collected:'),
                  React.createElement('td', { style: { padding: '4px 0', fontWeight: '700', textAlign: 'right' as const, color: '#1B5E20', fontSize: '16px' } }, `${totalWasteKg.toLocaleString()} kg`),
                ),
              )
            )
          ),

          React.createElement('p', {
            style: { fontSize: '15px', color: '#555', lineHeight: '1.6', margin: '0 0 24px 0' }
          }, 'You can download the full cleanup report below — it includes detailed waste breakdown, photos, and environmental observations.'),

          // CTA Button
          React.createElement('div', { style: { textAlign: 'center' as const, margin: '0 0 24px 0' } },
            React.createElement('a', {
              href: reportUrl,
              style: {
                display: 'inline-block',
                backgroundColor: '#1B5E20',
                color: '#ffffff',
                padding: '14px 32px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '16px',
                fontWeight: '600',
              }
            }, '📄 Download Cleanup Report')
          ),

          React.createElement('p', {
            style: { fontSize: '13px', color: '#999', lineHeight: '1.5', margin: '0 0 8px 0', textAlign: 'center' as const }
          }, 'Together, we are building a cleaner, greener future.'),
        ),

        // Footer
        React.createElement('div', {
          style: {
            backgroundColor: '#f5f5f5',
            padding: '20px 24px',
            textAlign: 'center' as const,
            borderTop: '1px solid #e0e0e0',
          }
        },
          React.createElement('p', {
            style: { fontSize: '12px', color: '#999', margin: '0 0 4px 0' }
          }, '© Twende Green Ecocycle · Circular Economy Traceability Platform'),
          React.createElement('a', {
            href: 'https://duaraflow.co.ke',
            style: { fontSize: '12px', color: '#1B5E20', textDecoration: 'none' }
          }, 'duaraflow.co.ke'),
        ),
      )
    )
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify caller is authenticated
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { cleanupId } = await req.json()

    if (!cleanupId) {
      return new Response(JSON.stringify({ error: 'Cleanup ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role to fetch data
    const serviceSupabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // Fetch cleanup details
    const { data: cleanup, error: cleanupError } = await serviceSupabase
      .from('cleanup_exercises')
      .select('*')
      .eq('id', cleanupId)
      .single()

    if (cleanupError || !cleanup) {
      return new Response(JSON.stringify({ error: 'Cleanup not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify user owns this cleanup or is admin
    if (cleanup.user_id !== user.id) {
      const { data: roleData } = await serviceSupabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle()
      
      if (!roleData) {
        return new Response(JSON.stringify({ error: 'Not authorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Fetch participants with email
    const { data: participants, error: participantsError } = await serviceSupabase
      .from('cleanup_participants')
      .select('*')
      .eq('cleanup_id', cleanupId)
      .not('email', 'is', null)

    if (participantsError) throw participantsError

    const emailParticipants = (participants || []).filter((p: any) => p.email && p.email.trim())

    if (emailParticipants.length === 0) {
      return new Response(JSON.stringify({ error: 'No participants with email addresses found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const transporter = createTransporter()
    const reportUrl = `https://duaraflow.co.ke/report/${cleanupId}`
    let sent = 0
    let failed = 0

    for (const participant of emailParticipants) {
      try {
        const emailHtml = await renderAsync(
          React.createElement(ThankYouEmail, {
            participantName: participant.full_name,
            cleanupTitle: cleanup.title,
            cleanupDate: new Date(cleanup.cleanup_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            locationName: cleanup.location_name,
            totalWasteKg: Number(cleanup.total_waste_kg),
            reportUrl,
          })
        )

        await transporter.sendMail({
          from: '"Twende Green Ecocycle" <info@duaraflow.co.ke>',
          to: participant.email,
          subject: `Thank You for Participating in "${cleanup.title}" 🌿`,
          html: emailHtml,
        })
        sent++
      } catch (err) {
        console.error(`Failed to send to ${participant.email}:`, err)
        failed++
      }
    }

    return new Response(JSON.stringify({ success: true, sent, failed, total: emailParticipants.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Send cleanup thank you error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
