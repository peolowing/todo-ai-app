import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, Save, X, FileText, Search, Sparkles, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { parseNotesFromText } from '../lib/openai'

export default function Notes({ notes, onCreateNote, onUpdateNote, onDeleteNote, onCreateTask }) {
  const [selectedNote, setSelectedNote] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editData, setEditData] = useState({ title: '', content: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function handleCreateNew() {
    setIsCreating(true)
    setSelectedNote(null)
    setEditData({ title: '', content: '' })
  }

  function handleSelectNote(note) {
    setSelectedNote(note)
    setIsCreating(false)
    setEditData({ title: note.title, content: note.content || '' })
  }

  async function handleSave() {
    if (!editData.title.trim()) {
      toast.error('Titel måste anges')
      return
    }

    try {
      if (isCreating) {
        await onCreateNote(editData)
        toast.success('Anteckning skapad!')
      } else if (selectedNote) {
        await onUpdateNote(selectedNote.id, editData)
        toast.success('Anteckning uppdaterad!')
      }
      setIsCreating(false)
      setSelectedNote(null)
      setEditData({ title: '', content: '' })
    } catch (error) {
      toast.error('Kunde inte spara anteckning')
    }
  }

  async function handleDelete(noteId) {
    if (!confirm('Är du säker på att du vill ta bort denna anteckning?')) return

    try {
      await onDeleteNote(noteId)
      if (selectedNote?.id === noteId) {
        setSelectedNote(null)
        setEditData({ title: '', content: '' })
      }
      toast.success('Anteckning borttagen!')
    } catch (error) {
      toast.error('Kunde inte ta bort anteckning')
    }
  }

  function handleCancel() {
    setIsCreating(false)
    if (selectedNote) {
      setEditData({ title: selectedNote.title, content: selectedNote.content || '' })
    } else {
      setSelectedNote(null)
      setEditData({ title: '', content: '' })
    }
  }

  async function handleAIGenerate() {
    if (!editData.content.trim()) {
      toast.error('Skriv något i textfältet först')
      return
    }

    setAiLoading(true)
    try {
      const result = await parseNotesFromText(editData.content)
      const { notes: aiNotes, tasks: aiTasks } = result

      let notesCount = 0
      let tasksCount = 0

      // Skapa alla anteckningar
      if (aiNotes && aiNotes.length > 0) {
        for (const note of aiNotes) {
          await onCreateNote({
            title: note.title,
            content: note.content || ''
          })
        }
        notesCount = aiNotes.length
      }

      // Skapa alla uppgifter
      if (aiTasks && aiTasks.length > 0) {
        for (const task of aiTasks) {
          await onCreateTask({
            title: task.title,
            description: task.description || '',
            priority: task.priority || 'medium',
            due_date: task.dueDate || null,
            list_name: task.list || null,
            subtasks: task.subtasks || []
          })
        }
        tasksCount = aiTasks.length
      }

      if (notesCount === 0 && tasksCount === 0) {
        toast.error('Kunde inte strukturera texten')
        return
      }

      // Rensa formuläret
      setEditData({ title: '', content: '' })
      setIsCreating(false)
      setSelectedNote(null)

      // Visa sammanfattning
      const messages = []
      if (notesCount > 0) messages.push(`${notesCount} anteckning${notesCount > 1 ? 'ar' : ''}`)
      if (tasksCount > 0) messages.push(`${tasksCount} uppgift${tasksCount > 1 ? 'er' : ''}`)

      toast.success(`✨ Skapade ${messages.join(' och ')} med AI!`, { duration: 4000 })
    } catch (error) {
      console.error('Error generating notes:', error)
      toast.error(`Fel: ${error.message || 'Kunde inte generera anteckningar'}`)
    } finally {
      setAiLoading(false)
    }
  }

  const isEditing = isCreating || (selectedNote && (
    editData.title !== selectedNote.title ||
    editData.content !== (selectedNote.content || '')
  ))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      {/* Sidebar - Lista med anteckningar */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        <div className="task-card">
          <button
            onClick={handleCreateNew}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ny anteckning
          </button>
        </div>

        <div className="task-card flex-1 overflow-hidden flex flex-col">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sök anteckningar..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            <AnimatePresence>
              {filteredNotes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">
                    {searchQuery ? 'Inga anteckningar hittades' : 'Inga anteckningar än'}
                  </p>
                </div>
              ) : (
                filteredNotes.map(note => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => handleSelectNote(note)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedNote?.id === note.id
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-gray-200 hover:border-blue-200'
                    }`}
                  >
                    <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(note.updated_at), 'd MMM yyyy, HH:mm', { locale: sv })}
                    </p>
                    {note.content && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {note.content}
                      </p>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Huvudinnehåll - Redigeringsområde */}
      <div className="lg:col-span-2">
        <div className="task-card h-full flex flex-col">
          {!isCreating && !selectedNote ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4" />
                <p>Välj en anteckning eller skapa en ny</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Titel..."
                  className="flex-1 text-2xl font-bold border-none outline-none focus:ring-0 px-0"
                />
                <div className="flex gap-2">
                  {isCreating && editData.content.trim() && (
                    <button
                      onClick={handleAIGenerate}
                      disabled={aiLoading}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                      title="Generera med AI"
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Genererar...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generera med AI
                        </>
                      )}
                    </button>
                  )}
                  {isEditing && (
                    <>
                      <button
                        onClick={handleSave}
                        className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                        title="Spara"
                      >
                        <Save className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="p-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg transition-colors"
                        title="Avbryt"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  {selectedNote && !isEditing && (
                    <button
                      onClick={() => handleDelete(selectedNote.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Ta bort"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {selectedNote && !isCreating && (
                <p className="text-xs text-gray-500 mb-4">
                  Senast uppdaterad: {format(new Date(selectedNote.updated_at), 'd MMMM yyyy, HH:mm', { locale: sv })}
                </p>
              )}

              <textarea
                value={editData.content}
                onChange={(e) => setEditData(prev => ({ ...prev, content: e.target.value }))}
                placeholder={isCreating ? "Skriv eller klistra in din text här...\n\nTips: AI kan:\n• Strukturera långa texter i separata anteckningar\n• Identifiera och extrahera uppgifter automatiskt\n• Känna igen deadlines och prioriteringar\n\nKlicka på 'Generera med AI' när du är klar!" : "Skriv dina anteckningar här..."}
                className="flex-1 w-full border border-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-sans"
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
