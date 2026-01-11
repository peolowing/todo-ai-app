import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useNotes(userId) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    fetchNotes()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('notes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchNotes()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  async function fetchNotes() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching notes:', err)
    } finally {
      setLoading(false)
    }
  }

  async function createNote(noteData) {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([{ ...noteData, user_id: userId }])
        .select()
        .single()

      if (error) throw error
      await fetchNotes()
      return data
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function updateNote(noteId, updates) {
    try {
      const { error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', noteId)

      if (error) throw error
      await fetchNotes()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function deleteNote(noteId) {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)

      if (error) throw error
      await fetchNotes()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes
  }
}
