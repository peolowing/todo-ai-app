import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useTaskNoteLinks() {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(false)

  // Fetch all links for current user
  const fetchLinks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('task_note_links')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error
      setLinks(data || [])
    } catch (error) {
      console.error('Error fetching links:', error)
      toast.error('Kunde inte hämta länkar')
    }
  }

  // Fetch linked notes for a specific task
  const fetchLinksForTask = async (taskId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('task_note_links')
        .select(`
          note_id,
          notes (
            id,
            title,
            content,
            category,
            created_at,
            updated_at
          )
        `)
        .eq('task_id', taskId)
        .eq('user_id', user.id)

      if (error) throw error
      return data?.map(link => link.notes) || []
    } catch (error) {
      console.error('Error fetching links for task:', error)
      return []
    }
  }

  // Fetch linked tasks for a specific note
  const fetchLinksForNote = async (noteId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('task_note_links')
        .select(`
          task_id,
          tasks (
            id,
            title,
            description,
            completed,
            priority,
            due_date,
            category,
            list_name,
            created_at,
            updated_at
          )
        `)
        .eq('note_id', noteId)
        .eq('user_id', user.id)

      if (error) throw error
      return data?.map(link => link.tasks) || []
    } catch (error) {
      console.error('Error fetching links for note:', error)
      return []
    }
  }

  // Create a link between task and note
  const createLink = async (taskId, noteId) => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { data, error } = await supabase
        .from('task_note_links')
        .insert({
          task_id: taskId,
          note_id: noteId,
          user_id: user.id
        })
        .select()
        .single()

      if (error) {
        // Check if it's a duplicate link error
        if (error.code === '23505') {
          toast.error('Länken finns redan')
          return null
        }
        throw error
      }

      await fetchLinks()
      toast.success('Länk skapad')
      return data
    } catch (error) {
      console.error('Error creating link:', error)
      toast.error('Kunde inte skapa länk')
      return null
    } finally {
      setLoading(false)
    }
  }

  // Delete a link between task and note
  const deleteLink = async (taskId, noteId) => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { error } = await supabase
        .from('task_note_links')
        .delete()
        .eq('task_id', taskId)
        .eq('note_id', noteId)
        .eq('user_id', user.id)

      if (error) throw error

      await fetchLinks()
      toast.success('Länk borttagen')
      return true
    } catch (error) {
      console.error('Error deleting link:', error)
      toast.error('Kunde inte ta bort länk')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Set up real-time subscription
  useEffect(() => {
    fetchLinks()

    const subscription = supabase
      .channel('task_note_links_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_note_links'
        },
        () => {
          fetchLinks()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    links,
    loading,
    fetchLinksForTask,
    fetchLinksForNote,
    createLink,
    deleteLink,
    refreshLinks: fetchLinks
  }
}
