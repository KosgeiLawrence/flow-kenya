import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { cleanupId, fullName, email, phoneNumber, organizationName, roleTitle, notes } = await req.json()

    if (!cleanupId || typeof cleanupId !== 'string') {
      return new Response(JSON.stringify({ error: 'Cleanup ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Full name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // Verify the cleanup exists
    const { data: cleanup, error: fetchError } = await supabase
      .from('cleanup_exercises')
      .select('id, title')
      .eq('id', cleanupId)
      .single()

    if (fetchError || !cleanup) {
      return new Response(JSON.stringify({ error: 'Cleanup exercise not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, participant, cleanupTitle: cleanup.title }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Register participant error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
