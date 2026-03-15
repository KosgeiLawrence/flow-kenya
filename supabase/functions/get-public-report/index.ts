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
    const { reportId, name, email } = await req.json()

    if (!reportId || typeof reportId !== 'string') {
      return new Response(JSON.stringify({ error: 'Report ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Valid email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // Log the download request
    console.log('Report download request:', { reportId, name: name.trim(), email: email.trim() })

    // Fetch the cleanup exercise
    const { data: cleanup, error: fetchError } = await supabase
      .from('cleanup_exercises')
      .select('*')
      .eq('id', reportId)
      .single()

    if (fetchError || !cleanup) {
      return new Response(JSON.stringify({ error: 'Report not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch partner organizations
    const { data: partners } = await supabase
      .from('cleanup_partners')
      .select('organization_id, organizations(name, type)')
      .eq('cleanup_id', reportId)

    const partner_organizations = (partners || []).map((p: any) => ({
      name: p.organizations?.name || 'Unknown',
      type: p.organizations?.type || '',
    }))

    return new Response(JSON.stringify({ cleanup: { ...cleanup, partner_organizations } }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Get public report error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
