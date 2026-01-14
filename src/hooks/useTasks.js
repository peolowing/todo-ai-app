import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useTasks(userId) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    fetchTasks()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchTasks()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  async function fetchTasks() {
    try {
      setLoading(true)

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (tasksError) throw tasksError

      // Fetch subtasks and linked notes for each task
      const tasksWithSubtasks = await Promise.all(
        (tasksData || []).map(async (task) => {
          const { data: subtasksData } = await supabase
            .from('subtasks')
            .select('*')
            .eq('task_id', task.id)

          // Fetch linked notes for this task
          const { data: linkedNotesData } = await supabase
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
            .eq('task_id', task.id)
            .eq('user_id', userId)

          return {
            ...task,
            subtasks: subtasksData || [],
            linkedNotes: linkedNotesData?.map(link => link.notes) || []
          }
        })
      )

      setTasks(tasksWithSubtasks)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  async function createTask(taskData) {
    try {
      // Extract subtasks and remove from taskData
      const { subtasks, ...taskFields } = taskData

      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...taskFields, user_id: userId }])
        .select()
        .single()

      if (error) throw error

      // Add subtasks if any
      if (subtasks && subtasks.length > 0) {
        const subtasksData = subtasks.map(title => ({
          task_id: data.id,
          title
        }))

        await supabase.from('subtasks').insert(subtasksData)
      }

      await fetchTasks()
      return data
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function updateTask(taskId, updates) {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)

      if (error) throw error
      await fetchTasks()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function deleteTask(taskId) {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
      await fetchTasks()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function toggleTaskComplete(taskId, completed) {
    await updateTask(taskId, { completed })
  }

  async function toggleSubtask(subtaskId, completed) {
    try {
      const { error } = await supabase
        .from('subtasks')
        .update({ completed })
        .eq('id', subtaskId)

      if (error) throw error
      await fetchTasks()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    toggleSubtask,
    refetch: fetchTasks
  }
}
