import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId } = await req.json()

    if (!userId) {
      throw new Error('Missing userId')
    }

    // Hämta JWT token från Authorization header för att verifiera användaren
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Skapa Supabase client med Service Role Key för att bypassa RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Skapa Supabase client med user token för att verifiera användaren
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verifiera att användaren är autentiserad
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Verifiera att userId matchar den autentiserade användaren
    if (user.id !== userId) {
      throw new Error('User ID mismatch')
    }

    // Hämta subscription med admin client
    const { data: subscription } = await supabaseAdmin
      .from('microsoft_subscriptions')
      .select('subscription_id')
      .eq('user_id', userId)
      .single()

    if (subscription) {
      // Hämta access token med admin client
      const { data: tokenData } = await supabaseAdmin
        .from('microsoft_tokens')
        .select('access_token')
        .eq('user_id', userId)
        .single()

      if (tokenData) {
        // Ta bort subscription från Microsoft Graph
        await fetch(
          `https://graph.microsoft.com/v1.0/subscriptions/${subscription.subscription_id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
            },
          }
        )
      }

      // Ta bort från databas med admin client
      await supabaseAdmin
        .from('microsoft_subscriptions')
        .delete()
        .eq('user_id', userId)
    }

    // Ta bort token med admin client
    await supabaseAdmin
      .from('microsoft_tokens')
      .delete()
      .eq('user_id', userId)

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
