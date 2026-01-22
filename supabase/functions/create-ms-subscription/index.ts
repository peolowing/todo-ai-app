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

    // Notification URL måste vara publikt tillgänglig
    // För production: använd din Supabase Edge Function URL
    // För development: använd ngrok eller liknande
    const notificationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ms-webhook`

    // Skapa subscription via Microsoft Graph
    // Max giltighetstid för mail subscriptions är 4230 minuter (ca 3 dagar)
    const expirationDateTime = new Date(Date.now() + (4230 * 60 * 1000)).toISOString()

    const subscriptionBody = {
      changeType: 'created',
      notificationUrl,
      resource: "me/mailFolders('Inbox')/messages",
      expirationDateTime,
      clientState: crypto.randomUUID(),
    }

    console.log('Creating subscription with:', JSON.stringify(subscriptionBody, null, 2))

    const subscriptionResponse = await fetch(
      'https://graph.microsoft.com/v1.0/subscriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionBody),
      }
    )

    if (!subscriptionResponse.ok) {
      const error = await subscriptionResponse.text()
      console.error('Microsoft Graph subscription error:', error)
      console.error('Subscription body was:', JSON.stringify(subscriptionBody, null, 2))
      throw new Error(`Failed to create subscription: ${error}`)
    }

    const subscription = await subscriptionResponse.json()

    // Spara subscription i Supabase med admin client (bypassa RLS)
    const { error: dbError } = await supabaseAdmin
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
