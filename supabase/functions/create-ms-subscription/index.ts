import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { accessToken, userId } = await req.json()

    if (!accessToken || !userId) {
      throw new Error('Missing accessToken or userId')
    }

    // Skapa Supabase client (URL och Key är automatiskt tillgängliga i Edge Functions)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Notification URL måste vara publikt tillgänglig
    // För production: använd din Supabase Edge Function URL
    // För development: använd ngrok eller liknande
    const notificationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ms-webhook`

    // Skapa subscription via Microsoft Graph
    const subscriptionResponse = await fetch(
      'https://graph.microsoft.com/v1.0/subscriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changeType: 'created',
          notificationUrl,
          resource: "me/mailFolders('Inbox')/messages",
          expirationDateTime: new Date(Date.now() + 3600000).toISOString(), // 1 timme
          clientState: crypto.randomUUID(),
        }),
      }
    )

    if (!subscriptionResponse.ok) {
      const error = await subscriptionResponse.text()
      console.error('Microsoft Graph error:', error)
      throw new Error(`Failed to create subscription: ${error}`)
    }

    const subscription = await subscriptionResponse.json()

    // Spara subscription i Supabase
    const { error: dbError } = await supabaseClient
      .from('microsoft_subscriptions')
      .upsert({
        user_id: userId,
        subscription_id: subscription.id,
        resource: subscription.resource,
        change_type: subscription.changeType,
        notification_url: subscription.notificationUrl,
        expiration_date_time: subscription.expirationDateTime,
        client_state: subscription.clientState,
        updated_at: new Date().toISOString(),
      })

    if (dbError) {
      console.error('Database error:', dbError)
      throw dbError
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscription: subscription,
      }),
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
