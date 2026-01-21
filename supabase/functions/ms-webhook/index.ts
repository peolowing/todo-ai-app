import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Microsoft Graph skickar en validation request först
    const url = new URL(req.url)
    const validationToken = url.searchParams.get('validationToken')

    if (validationToken) {
      // Returnera validation token för att verifiera endpoint
      return new Response(validationToken, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // Hantera webhook notifications
    const body = await req.json()
    const notifications = body.value || []

    console.log('Received notifications:', notifications.length)

    // Skapa Supabase client med service role (för att accessa alla users)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    for (const notification of notifications) {
      try {
        // Hitta subscription för att få user_id
        const { data: subscription } = await supabaseAdmin
          .from('microsoft_subscriptions')
          .select('user_id')
          .eq('subscription_id', notification.subscriptionId)
          .single()

        if (!subscription) {
          console.log('No subscription found for:', notification.subscriptionId)
          continue
        }

        const userId = subscription.user_id

        // Hämta access token för denna user
        const { data: tokenData } = await supabaseAdmin
          .from('microsoft_tokens')
          .select('access_token')
          .eq('user_id', userId)
          .single()

        if (!tokenData) {
          console.log('No token found for user:', userId)
          continue
        }

        // Hämta mailet från Microsoft Graph
        const messageId = notification.resourceData?.id

        if (!messageId) {
          console.log('No message ID in notification')
          continue
        }

        const mailResponse = await fetch(
          `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
          {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
            },
          }
        )

        if (!mailResponse.ok) {
          console.error('Failed to fetch email:', await mailResponse.text())
          continue
        }

        const email = await mailResponse.json()

        // Kontrollera om mailet är flaggat
        if (email.flag?.flagStatus !== 'flagged') {
          console.log('Email not flagged, skipping:', email.subject)
          continue
        }

        // Kontrollera om mail redan är synkat
        const { data: existingSync } = await supabaseAdmin
          .from('synced_emails')
          .select('id')
          .eq('user_id', userId)
          .eq('email_id', email.id)
          .single()

        if (existingSync) {
          console.log('Email already synced:', email.subject)
          continue
        }

        // Skapa task
        const { data: task, error: taskError } = await supabaseAdmin
          .from('tasks')
          .insert({
            user_id: userId,
            title: `📧 ${email.subject}`,
            description: email.bodyPreview || '',
            priority: 'medium',
            category: 'Email',
            completed: false,
          })
          .select()
          .single()

        if (taskError) {
          console.error('Failed to create task:', taskError)
          continue
        }

        // Logga synk
        await supabaseAdmin
          .from('synced_emails')
          .insert({
            user_id: userId,
            task_id: task.id,
            email_id: email.id,
            email_subject: email.subject,
            email_from: email.from?.emailAddress?.address,
          })

        console.log('Created task from email:', email.subject)
      } catch (notifError) {
        console.error('Error processing notification:', notifError)
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: notifications.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 202, // Accepted
      }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
