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
    console.log('Received request from Mailgun')

    const formData = await req.formData()

    const sender = formData.get('sender')
    const subject = formData.get('subject')
    const bodyPlain = formData.get('body-plain')
    const bodyHtml = formData.get('body-html')
    const recipient = formData.get('recipient')

    console.log('Email received')
    console.log('From:', sender)
    console.log('Subject:', subject)
    console.log('To:', recipient)

    if (!recipient) {
      throw new Error('No recipient found in email')
    }

    const userIdMatch = recipient.match(/notes-([a-f0-9-]+)@/)
    const userId = userIdMatch?.[1]

    if (!userId) {
      console.error('Could not extract user ID from recipient:', recipient)
      throw new Error('Invalid recipient email format. Expected: notes-{userId}@domain.com')
    }

    console.log('Extracted user ID:', userId)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const content = bodyPlain || bodyHtml || ''

    if (!content.trim()) {
      console.warn('Email has no content')
    }

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
      console.error('Database error:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    console.log('Successfully created note with ID:', data.id)

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
        error: error.message || 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
