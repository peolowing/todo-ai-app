import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, Save, X, FileText, Search, Sparkles, Loader2, CheckSquare, StickyNote, Image as ImageIcon, ArrowLeft, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { structureNotesOnly, extractTasksOnly, extractTextFromImage, processCustomPrompt } from '../lib/openai'

export default function Notes({ notes, onCreateNote, onUpdateNote, onDeleteNote, onCreateTask }) {
  const [selectedNote, setSelectedNote] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editData, setEditData] = useState({ title: '', content: '', category: 'Allmänt' })
  const [searchQuery, setSearchQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showTaskPreview, setShowTaskPreview] = useState(false)
  const [previewTasks, setPreviewTasks] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('Alla') // 'Alla' = visa alla kategorier
  const [showMobileEditor, setShowMobileEditor] = useState(false) // För mobilvy
  const [showMobileCategoryView, setShowMobileCategoryView] = useState(false) // För att visa kategoriöversikt i mobil
  const [showAIDropdown, setShowAIDropdown] = useState(false) // För AI-dropdown
  const [showCustomPrompt, setShowCustomPrompt] = useState(false) // För egen prompt modal
  const [customPrompt, setCustomPrompt] = useState('') // Egen prompt text
  const fileInputRef = useRef(null)
  const aiDropdownRef = useRef(null)

  // Stäng AI-dropdown när man klickar utanför
  useEffect(() => {
    function handleClickOutside(event) {
      if (aiDropdownRef.current && !aiDropdownRef.current.contains(event.target)) {
        setShowAIDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtrera först baserat på sökning
  let filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filtrera sedan baserat på vald kategori
  if (selectedCategory !== 'Alla') {
    filteredNotes = filteredNotes.filter(note =>
      (note.category || 'Allmänt') === selectedCategory
    )
  }

  // Hämta alla kategorier från alla anteckningar (inte bara filtrerade)
  const allCategories = ['Alla', ...new Set(notes.map(note => note.category || 'Allmänt'))].sort((a, b) => {
    if (a === 'Alla') return -1
    if (b === 'Alla') return 1
    return a.localeCompare(b)
  })

  // Gruppera filtrerade anteckningar per kategori (för att visa i listan)
  const notesByCategory = filteredNotes.reduce((acc, note) => {
    const category = note.category || 'Allmänt'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(note)
    return acc
  }, {})

  // Sortera kategorier alfabetiskt
  const categories = Object.keys(notesByCategory).sort()

  // Färger för kategorier (roterande färgschema)
  const categoryColors = [
    'bg-pink-500',
    'bg-purple-500',
    'bg-blue-500',
    'bg-cyan-500',
    'bg-orange-500',
    'bg-gray-500',
    'bg-green-500',
    'bg-red-500',
    'bg-yellow-500',
    'bg-indigo-500'
  ]

  const getCategoryColor = (category) => {
    if (category === 'Alla') return 'bg-gray-700'
    const index = allCategories.indexOf(category) - 1 // -1 för att hoppa över "Alla"
    return categoryColors[index % categoryColors.length]
  }

  function handleCreateNew() {
    setIsCreating(true)
    setSelectedNote(null)
    setEditData({ title: '', content: '', category: selectedCategory || 'Allmänt' })
    setShowMobileEditor(true) // Visa editor i mobilvy
  }

  function handleSelectNote(note) {
    setSelectedNote(note)
    setIsCreating(false)
    setEditData({
      title: note.title,
      content: note.content || '',
      category: note.category || 'Allmänt'
    })
    setShowMobileEditor(true) // Visa editor i mobilvy
  }

  function handleBackToList() {
    setShowMobileEditor(false)
    setSelectedNote(null)
    setIsCreating(false)
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
      setShowMobileEditor(false) // Stäng mobilvy
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
        setShowMobileEditor(false) // Stäng mobilvy
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
      setShowMobileEditor(false) // Stäng mobilvy om vi avbryter
    }
  }

  // Strukturera anteckningar
  async function handleStructureNotes() {
    if (!editData.content.trim()) {
      toast.error('Skriv något i textfältet först')
      return
    }

    setAiLoading(true)
    try {
      const aiNotes = await structureNotesOnly(editData.content)

      if (!aiNotes || aiNotes.length === 0) {
        toast.error('Kunde inte strukturera texten')
        setAiLoading(false)
        return
      }

      // Skapa alla anteckningar
      for (const note of aiNotes) {
        await onCreateNote({
          title: note.title,
          content: note.content || ''
        })
      }

      // Rensa formuläret
      setEditData({ title: '', content: '' })
      setIsCreating(false)
      setSelectedNote(null)
      setShowMobileEditor(false)

      toast.success(`✨ Skapade ${aiNotes.length} anteckning${aiNotes.length > 1 ? 'ar' : ''} med AI!`, { duration: 4000 })
    } catch (error) {
      console.error('Error structuring notes:', error)
      toast.error(`Fel: ${error.message || 'Kunde inte strukturera anteckningar'}`)
    } finally {
      setAiLoading(false)
    }
  }

  // Extrahera uppgifter och visa preview
  async function handleExtractTasks() {
    if (!editData.content.trim()) {
      toast.error('Skriv något i textfältet först')
      return
    }

    setAiLoading(true)
    try {
      const aiTasks = await extractTasksOnly(editData.content)

      if (!aiTasks || aiTasks.length === 0) {
        toast.error('Hittade inga uppgifter i texten')
        setAiLoading(false)
        return
      }

      // Visa preview modal
      setPreviewTasks(aiTasks)
      setShowTaskPreview(true)
    } catch (error) {
      console.error('Error extracting tasks:', error)
      toast.error(`Fel: ${error.message || 'Kunde inte extrahera uppgifter'}`)
    } finally {
      setAiLoading(false)
    }
  }

  // Godkänn och skapa uppgifter från preview
  async function handleApproveTasksTask() {
    try {
      for (const task of previewTasks) {
        await onCreateTask({
          title: task.title,
          description: task.description || '',
          priority: task.priority || 'medium',
          due_date: task.dueDate || null,
          list_name: task.list || null,
          subtasks: task.subtasks || []
        })
      }

      toast.success(`✨ Skapade ${previewTasks.length} uppgift${previewTasks.length > 1 ? 'er' : ''}!`, { duration: 4000 })

      // Stäng modal och rensa
      setShowTaskPreview(false)
      setPreviewTasks([])
      setEditData({ title: '', content: '' })
      setIsCreating(false)
      setSelectedNote(null)
      setShowMobileEditor(false)
    } catch (error) {
      console.error('Error creating tasks:', error)
      toast.error('Kunde inte skapa uppgifter')
    }
  }

  // Avslå uppgifter
  function handleRejectTasks() {
    setShowTaskPreview(false)
    setPreviewTasks([])
  }

  // Hantera egen prompt
  async function handleCustomPrompt() {
    if (!customPrompt.trim()) {
      toast.error('Skriv en instruktion först')
      return
    }

    setAiLoading(true)
    setShowCustomPrompt(false)

    try {
      const result = await processCustomPrompt(editData.content, customPrompt)

      // Uppdatera innehållet med AI:s svar
      setEditData(prev => ({
        ...prev,
        content: result
      }))

      setCustomPrompt('') // Rensa prompt
      toast.success('AI har bearbetat din anteckning!')
    } catch (error) {
      console.error('Error processing custom prompt:', error)
      toast.error(`Fel: ${error.message || 'Kunde inte bearbeta anteckning'}`)
    } finally {
      setAiLoading(false)
    }
  }

  // Hantera bilduppladdning
  async function handleImageUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    // Kontrollera att det är en bild
    if (!file.type.startsWith('image/')) {
      toast.error('Vänligen välj en bildfil')
      return
    }

    setAiLoading(true)
    try {
      // Extrahera text från bilden
      const extractedText = await extractTextFromImage(file)

      if (!extractedText || extractedText.trim() === '') {
        toast.error('Kunde inte hitta någon text i bilden')
        setAiLoading(false)
        return
      }

      // Lägg till extraherad text i textfältet
      setEditData(prev => ({
        ...prev,
        content: prev.content ? `${prev.content}\n\n${extractedText}` : extractedText
      }))

      toast.success('Text extraherad från bild!')
    } catch (error) {
      console.error('Error processing image:', error)
      toast.error(`Fel: ${error.message || 'Kunde inte läsa bilden'}`)
    } finally {
      setAiLoading(false)
      // Rensa file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Hantera keyboard shortcuts i textarea
  function handleTextareaKeyDown(event) {
    // Ctrl/Cmd + D -> Infoga dagens datum
    if ((event.metaKey || event.ctrlKey) && event.key === 'd') {
      event.preventDefault()
      const today = format(new Date(), 'yyyy-MM-dd (EEEE)', { locale: sv })
      const textarea = event.target
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = editData.content

      const newText = text.substring(0, start) + today + text.substring(end)
      setEditData(prev => ({ ...prev, content: newText }))

      // Placera cursor efter det infogade datumet
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + today.length
      }, 0)
    }
  }

  const isEditing = isCreating || (selectedNote && (
    editData.title !== selectedNote.title ||
    editData.content !== (selectedNote.content || '') ||
    editData.category !== (selectedNote.category || 'Allmänt')
  ))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[460px_1fr] gap-2 lg:gap-6 h-[calc(100vh-12rem)]">
      {/* Sidebar - Lista med anteckningar - Dölj i mobilvy när editor visas */}
      <div className={`flex flex-col gap-2 lg:gap-4 ${showMobileEditor ? 'hidden lg:flex' : 'flex'}`}>
        <div className="task-card flex-1 overflow-hidden flex flex-row gap-0">
          {/* Vertikala kategori-flikar till vänster - Visa alltid i desktop, i mobil bara när showMobileCategoryView är true */}
          <div className={`w-36 border-r border-gray-200 py-2 flex-col gap-1 overflow-y-auto scrollbar-hide ${showMobileCategoryView ? 'flex' : 'hidden lg:flex'}`}>
            {allCategories.map(category => {
              const count = category === 'Alla'
                ? notes.length
                : notes.filter(n => (n.category || 'Allmänt') === category).length

              const isActive = selectedCategory === category

              return (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category)
                    setShowMobileCategoryView(false) // Stäng kategoriöversikt i mobil
                  }}
                  className={`relative flex items-center gap-2 px-3 py-2 transition-all group ${
                    isActive
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Färgad indikator till vänster */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${getCategoryColor(category)} ${
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                  } transition-opacity`}></div>

                  {/* Färgad prick */}
                  <div className={`w-3 h-3 flex-shrink-0 ${getCategoryColor(category)} rounded-full ${
                    isActive ? 'ring-2 ring-blue-300' : ''
                  }`}></div>

                  {/* Kategorinamn */}
                  <span className={`text-sm flex-1 text-left truncate ${
                    isActive ? 'font-semibold text-gray-900' : 'text-gray-700'
                  }`}>
                    {category}
                  </span>

                  {/* Antal */}
                  <span className={`text-xs flex-shrink-0 ${
                    isActive ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Anteckningslista */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-200">
              {/* Tillbaka-knapp för mobil - visa bara när kategorier är dolda */}
              {!showMobileCategoryView && (
                <div className="flex items-center gap-2 mb-3 lg:hidden">
                  <button
                    onClick={() => setShowMobileCategoryView(true)}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Kategorier</span>
                  </button>
                </div>
              )}

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

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <AnimatePresence mode="wait">
              {filteredNotes.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8 text-gray-500"
                >
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">
                    {searchQuery
                      ? 'Inga anteckningar hittades'
                      : selectedCategory !== 'Alla'
                      ? `Inga anteckningar i ${selectedCategory}`
                      : 'Inga anteckningar än'}
                  </p>
                </motion.div>
              ) : (
                filteredNotes.map(note => (
                  <motion.div
                    key={note.id}
                    layout
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
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Huvudinnehåll - Redigeringsområde - Visa i helskärm på mobil */}
      <div className={`relative ${showMobileEditor ? 'flex lg:block w-full' : 'hidden lg:block'}`}>
        {/* Knappar i övre högra hörnet - Dölj på mobil för att inte överlappa innehåll */}
        <div className="hidden lg:flex absolute top-4 right-4 z-10 gap-2">
          {/* Spara och Avbryt-knappar (när editing) */}
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

          {/* Ta bort-knapp (när inte editing) */}
          {selectedNote && !isEditing && (
            <button
              onClick={() => handleDelete(selectedNote.id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Ta bort"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}

          {/* Ny anteckning-knapp */}
          <button
            onClick={handleCreateNew}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5 border border-gray-300"
            title="Skapa ny anteckning"
          >
            <Plus className="w-4 h-4" />
            Ny
          </button>

          {/* AI Dropdown */}
          {editData.content.trim() && (
            <div className="relative" ref={aiDropdownRef}>
              <button
                onClick={() => setShowAIDropdown(!showAIDropdown)}
                disabled={aiLoading}
                className="px-3 py-1.5 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                title="AI-funktioner"
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                AI
                <ChevronDown className="w-3 h-3" />
              </button>

              {/* Dropdown meny */}
              <AnimatePresence>
                {showAIDropdown && !aiLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        handleStructureNotes()
                        setShowAIDropdown(false)
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-100"
                    >
                      <StickyNote className="w-4 h-4 text-blue-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Strukturera</div>
                        <div className="text-xs text-gray-500">Dela upp i anteckningar</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        handleExtractTasks()
                        setShowAIDropdown(false)
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-100"
                    >
                      <CheckSquare className="w-4 h-4 text-purple-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Skapa uppgifter</div>
                        <div className="text-xs text-gray-500">Extrahera till-do items</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowCustomPrompt(true)
                        setShowAIDropdown(false)
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-100"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Egen prompt</div>
                        <div className="text-xs text-gray-500">Skriv egna AI-instruktioner</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        fileInputRef.current?.click()
                        setShowAIDropdown(false)
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <ImageIcon className="w-4 h-4 text-green-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Läs bild</div>
                        <div className="text-xs text-gray-500">Extrahera text från bild</div>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Dold file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          )}
        </div>

        <div className="task-card h-full flex flex-col w-full">
          {!isCreating && !selectedNote ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4" />
                <p>Välj en anteckning eller skapa en ny</p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2 lg:space-y-3 mb-2 lg:mb-4">
                {/* Tillbakaknapp och rubrik för mobil */}
                <div className="flex items-center gap-2">
                  {/* Tillbakaknapp - endast mobil */}
                  {showMobileEditor && (
                    <button
                      onClick={handleBackToList}
                      className="lg:hidden p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Tillbaka till lista"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}

                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Titel..."
                    className="flex-1 text-lg lg:text-2xl font-bold border-none outline-none focus:ring-0 px-0"
                  />

                  {/* Action-knappar för mobil - endast synliga på mobil */}
                  <div className="lg:hidden flex gap-1">
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
                    {editData.content.trim() && (
                      <div className="relative" ref={aiDropdownRef}>
                        <button
                          onClick={() => setShowAIDropdown(!showAIDropdown)}
                          disabled={aiLoading}
                          className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 rounded-lg transition-colors disabled:opacity-50"
                          title="AI-funktioner"
                        >
                          {aiLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Sparkles className="w-5 h-5" />
                          )}
                        </button>

                        {/* Dropdown meny för mobil */}
                        <AnimatePresence>
                          {showAIDropdown && !aiLoading && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50"
                            >
                              <button
                                onClick={() => {
                                  handleStructureNotes()
                                  setShowAIDropdown(false)
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-100"
                              >
                                <StickyNote className="w-4 h-4 text-blue-500" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">Strukturera</div>
                                  <div className="text-xs text-gray-500">Dela upp i anteckningar</div>
                                </div>
                              </button>

                              <button
                                onClick={() => {
                                  handleExtractTasks()
                                  setShowAIDropdown(false)
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-100"
                              >
                                <CheckSquare className="w-4 h-4 text-purple-500" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">Skapa uppgifter</div>
                                  <div className="text-xs text-gray-500">Extrahera till-do items</div>
                                </div>
                              </button>

                              <button
                                onClick={() => {
                                  setShowCustomPrompt(true)
                                  setShowAIDropdown(false)
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-100"
                              >
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">Egen prompt</div>
                                  <div className="text-xs text-gray-500">Skriv egna AI-instruktioner</div>
                                </div>
                              </button>

                              <button
                                onClick={() => {
                                  fileInputRef.current?.click()
                                  setShowAIDropdown(false)
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                              >
                                <ImageIcon className="w-4 h-4 text-green-500" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">Läs bild</div>
                                  <div className="text-xs text-gray-500">Extrahera text från bild</div>
                                </div>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-600">Kategori:</label>
                  <input
                    type="text"
                    value={editData.category}
                    onChange={(e) => setEditData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Allmänt"
                    list="categories-list"
                    className="flex-1 text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <datalist id="categories-list">
                    {categories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
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
                onKeyDown={handleTextareaKeyDown}
                placeholder={isCreating ? "Skriv eller klistra in din text här...\n\nTips:\n• Tryck Ctrl/Cmd + D för att infoga dagens datum\n• AI kan strukturera texter och extrahera uppgifter\n• Ladda upp bilder för att extrahera text" : "Skriv dina anteckningar här...\n\nTryck Ctrl/Cmd + D för att infoga datum"}
                className="flex-1 w-full border border-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-sans"
              />
            </>
          )}
        </div>
      </div>

      {/* Task Preview Modal */}
      <AnimatePresence>
        {showTaskPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Förhandsgranska uppgifter</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      AI har hittat {previewTasks.length} uppgift{previewTasks.length > 1 ? 'er' : ''} i din text
                    </p>
                  </div>
                  <button
                    onClick={handleRejectTasks}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {previewTasks.map((task, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">{task.title}</h3>
                        {task.description && (
                          <p className="text-gray-600 text-sm mt-1">{task.description}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        task.priority === 'high' ? 'bg-red-100 text-red-700' :
                        task.priority === 'low' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {task.priority === 'high' ? 'Hög' : task.priority === 'low' ? 'Låg' : 'Medium'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <span className="font-medium">Deadline:</span>
                          <span>{format(new Date(task.dueDate), 'd MMM yyyy', { locale: sv })}</span>
                        </div>
                      )}
                      {task.list && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <span className="font-medium">Lista:</span>
                          <span>{task.list}</span>
                        </div>
                      )}
                    </div>

                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="mt-3 pl-4 border-l-2 border-gray-300">
                        <p className="text-xs font-medium text-gray-700 mb-2">Deluppgifter:</p>
                        <ul className="space-y-1">
                          {task.subtasks.map((subtask, subIndex) => (
                            <li key={subIndex} className="text-sm text-gray-600 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                              {subtask}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3 justify-end">
                <button
                  onClick={handleRejectTasks}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleApproveTasksTask}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  Skapa {previewTasks.length} uppgift{previewTasks.length > 1 ? 'er' : ''}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Prompt Modal */}
      <AnimatePresence>
        {showCustomPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Egen AI-prompt</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Skriv instruktioner för hur AI ska bearbeta din anteckning
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCustomPrompt(false)
                      setCustomPrompt('')
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="T.ex: 'Översätt till engelska', 'Sammanfatta i 3 punkter', 'Gör om till en lista', 'Rätta grammatiken'"
                  className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  AI kommer att använda dina instruktioner för att bearbeta anteckningens innehåll.
                </p>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowCustomPrompt(false)
                    setCustomPrompt('')
                  }}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleCustomPrompt}
                  disabled={!customPrompt.trim() || aiLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Bearbetar...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Kör AI
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
