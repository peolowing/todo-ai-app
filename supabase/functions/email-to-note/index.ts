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
    // Parse incoming email from Mailgun
    const formData = await req.formData()

    // Mailgun sends email data in these fields
    const sender = formData.get('sender') as string
    const subject = formData.get('subject') as string
    const bodyPlain = formData.get('body-plain') as string
    const bodyHtml = formData.get('body-html') as string
    const recipient = formData.get('recipient') as string

    console.log('Received email from:', sender)
    console.log('Subject:', subject)
    console.log('Recipient:', recipient)

    // Extract user ID from recipient email
    // Format: userid@yourdomain.com or notes-userid@yourdomain.com
    const userIdMatch = recipient?.match(/notes-([a-f0-9-]+)@/) || recipient?.match(/([a-f0-9-]+)@/)
    const userId = userIdMatch?.[1]

    if (!userId) {
      throw new Error('Could not extract user ID from recipient email')
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Use plain text body, fallback to HTML if plain text not available
    const content = bodyPlain || bodyHtml || ''

    // Create note
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: userId,
        title: subject || 'Email utan ämne',
        content: content.trim(),
        category: 'Email',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating note:', error)
      throw error
    }

    console.log('Successfully created note:', data.id)

    return new Response(
      JSON.stringify({
        success: true,
        noteId: data.id,
        message: 'Email converted to note successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error processing email:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
