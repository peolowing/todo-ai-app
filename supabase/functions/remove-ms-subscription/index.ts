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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Hämta subscription
    const { data: subscription } = await supabaseClient
      .from('microsoft_subscriptions')
      .select('subscription_id')
      .eq('user_id', userId)
      .single()

    if (subscription) {
      // Hämta access token
      const { data: tokenData } = await supabaseClient
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

      // Ta bort från databas
      await supabaseClient
        .from('microsoft_subscriptions')
        .delete()
        .eq('user_id', userId)
    }

    // Ta bort token
    await supabaseClient
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
