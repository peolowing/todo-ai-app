import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from './lib/supabase'
import { useTasks } from './hooks/useTasks'
import { useNotes } from './hooks/useNotes'
import Auth from './components/Auth'
import AITaskCreator from './components/AITaskCreator'
import TaskForm from './components/TaskForm'
import TaskCard from './components/TaskCard'
import Notes from './components/Notes'
import Dashboard from './components/Dashboard'
import Settings from './components/Settings'
import { Toaster, toast } from 'react-hot-toast'
import { graphConfig } from './lib/msAuthConfig'
import { useMsal } from '@azure/msal-react'
import { loginRequest } from './lib/msAuthConfig'
import {
  LogOut,
  Calendar,
  ListTodo,
  Filter,
  CheckCircle2,
  Circle,
  Loader2,
  FileText,
  CheckSquare,
  Sparkles,
  Plus,
  ChevronDown,
  BarChart3,
  Layers,
  ChevronUp,
  ChevronsUpDown,
  Mail,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard') // dashboard, tasks, notes - Default to dashboard
  const [filter, setFilter] = useState('active') // all, active, completed - Default to active
  const [selectedList, setSelectedList] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all') // Kategorifilter för uppgifter
  const [selectedTaskTags, setSelectedTaskTags] = useState([]) // Taggfilter för uppgifter
  const [showAIModal, setShowAIModal] = useState(false)
  const [showTaskFormModal, setShowTaskFormModal] = useState(false)
  const [openMobileMenu, setOpenMobileMenu] = useState(null) // 'overview', 'filter', 'lists', 'categories', or null
  const [triggerNoteCreate, setTriggerNoteCreate] = useState(0) // Trigger för att skapa ny anteckning
  const [selectedNoteToOpen, setSelectedNoteToOpen] = useState(null) // Anteckning att öppna från dashboard
  const [selectedTaskToOpen, setSelectedTaskToOpen] = useState(null) // Uppgift att öppna från dashboard
  const [categoryOrder, setCategoryOrder] = useState(() => {
    const saved = localStorage.getItem('categoryOrder')
    return saved ? JSON.parse(saved) : []
  })
  const [isSyncingMail, setIsSyncingMail] = useState(false)
  const mobileMenuRef = useRef(null)
  const { instance, accounts } = useMsal()

  const {
    tasks,
    loading: tasksLoading,
    createTask,
    updateTask,
    toggleTaskComplete,
    deleteTask,
    toggleSubtask
  } = useTasks(user?.id)

  const {
    notes,
    loading: notesLoading,
    createNote,
    updateNote,
    deleteNote
  } = useNotes(user?.id)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setOpenMobileMenu(null)
      }
    }

    if (openMobileMenu) {
      // Use setTimeout to ensure the click handler fires first
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside)
      }, 0)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openMobileMenu])

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  function moveCategoryUp(category) {
    if (category === 'all') return // Kan inte flytta 'all'

    const currentCategories = categories.filter(c => c !== 'all')
    const currentIndex = currentCategories.indexOf(category)

    if (currentIndex <= 0) return // Redan högst upp

    const newOrder = [...currentCategories]
    const temp = newOrder[currentIndex]
    newOrder[currentIndex] = newOrder[currentIndex - 1]
    newOrder[currentIndex - 1] = temp

    setCategoryOrder(newOrder)
    localStorage.setItem('categoryOrder', JSON.stringify(newOrder))
  }

  function moveCategoryDown(category) {
    if (category === 'all') return // Kan inte flytta 'all'

    const currentCategories = categories.filter(c => c !== 'all')
    const currentIndex = currentCategories.indexOf(category)

    if (currentIndex >= currentCategories.length - 1) return // Redan längst ner

    const newOrder = [...currentCategories]
    const temp = newOrder[currentIndex]
    newOrder[currentIndex] = newOrder[currentIndex + 1]
    newOrder[currentIndex + 1] = temp

    setCategoryOrder(newOrder)
    localStorage.setItem('categoryOrder', JSON.stringify(newOrder))
  }

  async function handleTasksCreated(aiTasks) {
    for (const task of aiTasks) {
      await createTask({
        title: task.title,
        description: task.description || '',
        priority: task.priority || 'medium',
        due_date: task.dueDate || null,
        list_name: task.list || null,
        subtasks: task.subtasks || []
      })
    }
  }

  async function syncOutlookMail() {
    if (!user || !accounts || accounts.length === 0) {
      toast.error('Microsoft Outlook inte anslutet')
      return
    }

    setIsSyncingMail(true)
    try {
      const account = accounts[0]
      const silentRequest = {
        ...loginRequest,
        account
      }

      const response = await instance.acquireTokenSilent(silentRequest)

      // Hämta flaggade mail
      const mailResponse = await fetch(
        `${graphConfig.graphMailEndpoint}?$filter=flag/flagStatus eq 'flagged'&$select=id,subject,bodyPreview,from,webLink,receivedDateTime&$top=20`,
        {
          headers: {
            Authorization: `Bearer ${response.accessToken}`
          }
        }
      )

      if (!mailResponse.ok) throw new Error('Kunde inte hämta mail')

      const mailData = await mailResponse.json()
      const emails = mailData.value || []

      // Skapa tasks från mail
      let createdCount = 0
      for (const email of emails) {
        // Kontrollera om mail redan är synkat
        const { data: existingSync } = await supabase
          .from('synced_emails')
          .select('id')
          .eq('user_id', user.id)
          .eq('email_id', email.id)
          .single()

        if (!existingSync) {
          // Skapa task
          const { data: task, error: taskError } = await supabase
            .from('tasks')
            .insert({
              user_id: user.id,
              title: `📧 ${email.subject}`,
              description: email.bodyPreview,
              priority: 'medium',
              category: 'Emails',
              completed: false
            })
            .select()
            .single()

          if (!taskError && task) {
            // Logga synk
            await supabase
              .from('synced_emails')
              .insert({
                user_id: user.id,
                task_id: task.id,
                email_id: email.id,
                email_subject: email.subject,
                email_from: email.from?.emailAddress?.address
              })

            createdCount++
          }
        }
      }

      if (createdCount > 0) {
        toast.success(`${createdCount} nya mail synkade!`)
      } else {
        toast.success('Inga nya flaggade mail')
      }
    } catch (error) {
      console.error('Sync error:', error)
      if (error.errorCode === 'login_required' || error.errorCode === 'interaction_required') {
        toast.error('Logga in på Microsoft Outlook igen via Inställningar')
      } else {
        toast.error('Synkningsfel: ' + error.message)
      }
    } finally {
      setIsSyncingMail(false)
    }
  }

  async function handleTaskCreated(taskData) {
    await createTask(taskData)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <Auth />
        <Toaster position="top-right" />
      </>
    )
  }

  const lists = [...new Set(tasks.map(t => t.list_name).filter(Boolean))]
  const rawCategories = ['all', ...new Set(tasks.map(t => t.category || 'Allmänt'))]

  // Sortera kategorier baserat på sparad ordning
  const categories = rawCategories.sort((a, b) => {
    if (a === 'all') return -1 // 'all' ska alltid vara först
    if (b === 'all') return 1

    const indexA = categoryOrder.indexOf(a)
    const indexB = categoryOrder.indexOf(b)

    // Om båda finns i ordningen, sortera enligt ordning
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB
    }
    // Om bara A finns i ordningen, sätt den före B
    if (indexA !== -1) return -1
    // Om bara B finns i ordningen, sätt den före A
    if (indexB !== -1) return 1
    // Annars alfabetisk ordning
    return a.localeCompare(b)
  })

  // Hämta taggar för en specifik kategori
  function getTaskTagsForCategory(category) {
    const categoryTasks = category === 'all'
      ? tasks
      : tasks.filter(t => (t.category || 'Allmänt') === category)

    return [...new Set(categoryTasks.flatMap(task => task.tags || []))].sort()
  }

  // Toggla taggfilter
  function toggleTaskTagFilter(tag) {
    setSelectedTaskTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag)
      } else {
        return [...prev, tag]
      }
    })
  }

  const filteredTasks = tasks.filter(task => {
    if (selectedList && task.list_name !== selectedList) return false
    if (selectedCategory !== 'all' && (task.category || 'Allmänt') !== selectedCategory) return false

    // Tag-filtrering: alla valda taggar måste finnas
    if (selectedTaskTags.length > 0) {
      const taskTags = task.tags || []
      if (!selectedTaskTags.every(tag => taskTags.includes(tag))) return false
    }

    if (filter === 'active') return !task.completed
    if (filter === 'completed') return task.completed
    return true
  })

  // Hämta topp 3 kategorier i samma ordning som sidofältet (exklusive 'all')
  const topCategories = categories
    .filter(cat => cat !== 'all')
    .slice(0, 3)

  // Gruppera uppgifter efter kategori om "Alla kategorier" är vald
  const groupedTasks = selectedCategory === 'all' && filter === 'active'
    ? topCategories.map(cat => ({
        category: cat,
        tasks: filteredTasks.filter(t => (t.category || 'Allmänt') === cat)
      })).filter(group => group.tasks.length > 0)
    : null

  const todayTasks = filteredTasks.filter(task => {
    if (!task.due_date) return false
    const today = new Date()
    const dueDate = new Date(task.due_date)
    return format(today, 'yyyy-MM-dd') === format(dueDate, 'yyyy-MM-dd')
  })

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    active: tasks.filter(t => !t.completed).length,
    today: todayTasks.length
  }

  return (
    <div className="min-h-screen">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-gray-900">
                  AI ToDo
                </h1>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Settings
                tasks={tasks}
                notes={notes}
                onImportTasks={createTask}
                onImportNotes={createNote}
                userId={user?.id}
                user={user}
              />

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logga ut
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4">
        {/* Tab Navigation */}
        <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2 border border-gray-100 inline-flex gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-xs sm:text-sm ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-xs sm:text-sm ${
                activeTab === 'tasks'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              Uppgifter
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-xs sm:text-sm ${
                activeTab === 'notes'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              Anteckningar
            </button>
          </div>

          {/* Create Task Buttons - Only show on tasks tab and desktop */}
          {activeTab === 'tasks' && (
            <div className="hidden lg:flex gap-2">
              <button
                onClick={syncOutlookMail}
                disabled={isSyncingMail || !accounts || accounts.length === 0}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="Synka flaggade mail från Outlook"
              >
                {isSyncingMail ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Synka mail</span>
              </button>
              <button
                onClick={() => setShowAIModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all text-sm font-medium"
                title="AI Uppgiftsskapare"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">AI Uppgifter</span>
              </button>
              <button
                onClick={() => setShowTaskFormModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all text-sm font-medium"
                title="Ny uppgift"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Ny uppgift</span>
              </button>
            </div>
          )}

          {/* Create Note Button - Only show on notes tab and desktop */}
          {activeTab === 'notes' && (
            <div className="hidden lg:flex gap-2">
              <button
                onClick={() => setTriggerNoteCreate(prev => prev + 1)}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all text-sm font-medium"
                title="Ny anteckning"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Ny anteckning</span>
              </button>
            </div>
          )}
        </div>

        {activeTab === 'dashboard' ? (
          <Dashboard
            tasks={tasks}
            notes={notes}
            onTaskClick={(task) => {
              setSelectedTaskToOpen(task)
              setActiveTab('tasks')
            }}
            onNoteClick={(note) => {
              setSelectedNoteToOpen(note)
              setActiveTab('notes')
            }}
            onCategoryClick={(category) => {
              setSelectedCategory(category)
              setActiveTab('tasks')
            }}
            onViewAllTasks={() => setActiveTab('tasks')}
            onViewAllNotes={() => setActiveTab('notes')}
          />
        ) : activeTab === 'notes' ? (
          <Notes
            notes={notes}
            onCreateNote={createNote}
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
            onCreateTask={createTask}
            triggerCreate={triggerNoteCreate}
            noteToOpen={selectedNoteToOpen}
            onNoteOpened={() => setSelectedNoteToOpen(null)}
            allTasks={tasks}
            onTaskClick={(task) => {
              setSelectedTaskToOpen(task)
              setActiveTab('tasks')
            }}
          />
        ) : (
          <>
            {/* Mobile Menu Bar */}
            <div className="lg:hidden mb-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2 border border-gray-100 flex gap-2 overflow-x-auto" ref={mobileMenuRef}>
                {/* Synka Mail Button */}
                <button
                  onClick={syncOutlookMail}
                  disabled={isSyncingMail || !accounts || accounts.length === 0}
                  className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all text-sm font-medium whitespace-nowrap disabled:opacity-50"
                >
                  {isSyncingMail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  Mail
                </button>

                {/* AI Uppgifter Button */}
                <button
                  onClick={() => setShowAIModal(true)}
                  className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all text-sm font-medium whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4" />
                  AI
                </button>

                {/* Ny uppgift Button */}
                <button
                  onClick={() => setShowTaskFormModal(true)}
                  className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all text-sm font-medium whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Ny
                </button>

                {/* Filter Menu */}
                <button
                  onClick={() => setOpenMobileMenu(openMobileMenu === 'filter' ? null : 'filter')}
                  className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all text-sm font-medium whitespace-nowrap"
                >
                  <Filter className="w-4 h-4" />
                  Filter
                  <ChevronDown className={`w-3 h-3 transition-transform ${openMobileMenu === 'filter' ? 'rotate-180' : ''}`} />
                </button>

                {/* Lists Menu */}
                {lists.length > 0 && (
                  <button
                    onClick={() => setOpenMobileMenu(openMobileMenu === 'lists' ? null : 'lists')}
                    className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all text-sm font-medium whitespace-nowrap"
                  >
                    <ListTodo className="w-4 h-4" />
                    Listor
                    <ChevronDown className={`w-3 h-3 transition-transform ${openMobileMenu === 'lists' ? 'rotate-180' : ''}`} />
                  </button>
                )}

                {/* Categories Menu */}
                <button
                  onClick={() => setOpenMobileMenu(openMobileMenu === 'categories' ? null : 'categories')}
                  className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all text-sm font-medium whitespace-nowrap"
                >
                  <Layers className="w-4 h-4" />
                  Kategorier
                  <ChevronDown className={`w-3 h-3 transition-transform ${openMobileMenu === 'categories' ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Mobile Dropdown Menus - Rendered as portals */}
            {openMobileMenu === 'filter' && createPortal(
              <div
                className="fixed inset-0 bg-black/20 z-[9998] lg:hidden"
                onClick={() => setOpenMobileMenu(null)}
              >
                <div
                  className="absolute top-32 left-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 py-1 max-w-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setFilter('all')
                      setOpenMobileMenu(null)
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-all ${
                      filter === 'all'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ListTodo className="w-4 h-4" />
                    Alla uppgifter
                  </button>
                  <button
                    onClick={() => {
                      setFilter('active')
                      setOpenMobileMenu(null)
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-all ${
                      filter === 'active'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Circle className="w-4 h-4" />
                    Aktiva
                  </button>
                  <button
                    onClick={() => {
                      setFilter('completed')
                      setOpenMobileMenu(null)
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-all ${
                      filter === 'completed'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Klara
                  </button>
                </div>
              </div>,
              document.body
            )}

            {openMobileMenu === 'lists' && createPortal(
              <div
                className="fixed inset-0 bg-black/20 z-[9998] lg:hidden"
                onClick={() => setOpenMobileMenu(null)}
              >
                <div
                  className="absolute top-32 left-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 py-1 max-w-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setSelectedList(null)
                      setOpenMobileMenu(null)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-all ${
                      !selectedList
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Alla listor
                  </button>
                  {lists.map(list => (
                    <button
                      key={list}
                      onClick={() => {
                        setSelectedList(list)
                        setOpenMobileMenu(null)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm transition-all ${
                        selectedList === list
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {list}
                    </button>
                  ))}
                </div>
              </div>,
              document.body
            )}

            {openMobileMenu === 'categories' && createPortal(
              <div
                className="fixed inset-0 bg-black/20 z-[9998] lg:hidden"
                onClick={() => setOpenMobileMenu(null)}
              >
                <div
                  className="absolute top-32 left-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 py-1 max-w-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => {
                        setSelectedCategory(category)
                        setSelectedTaskTags([])
                        setOpenMobileMenu(null)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm transition-all ${
                        selectedCategory === category
                          ? 'bg-purple-50 text-purple-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {category === 'all' ? 'Alla kategorier' : category}
                    </button>
                  ))}
                </div>
              </div>,
              document.body
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Sidebar - Hidden on mobile */}
            <aside className="hidden lg:block lg:col-span-1 space-y-4">
            {/* Category Filter */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                Kategorier
                <ChevronsUpDown className="w-4 h-4 text-gray-400" />
              </h2>
              <div className="space-y-1">
                {categories.map((category, index) => {
                  const isAll = category === 'all'
                  const isFirst = !isAll && index === 1 // First non-'all' category
                  const isLast = !isAll && index === categories.length - 1

                  // Räkna antal aktiva (icke-slutförda) uppgifter i denna kategori
                  const activeTasks = tasks.filter(t => !t.completed)
                  const count = isAll
                    ? activeTasks.length
                    : activeTasks.filter(t => (t.category || 'Allmänt') === category).length

                  const isActive = selectedCategory === category
                  const categoryTags = getTaskTagsForCategory(category)

                  return (
                    <div key={category} className="flex flex-col">
                      <div
                        className={`flex items-center gap-1 rounded-lg transition-all ${
                          isActive
                            ? 'bg-purple-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <button
                          onClick={() => {
                            setSelectedCategory(category)
                            setSelectedTaskTags([]) // Rensa taggfilter när kategori byts
                          }}
                          className={`flex-1 text-left px-3 py-2 transition-all flex items-center gap-2 ${
                            isActive
                              ? 'text-purple-700 font-medium'
                              : 'text-gray-600'
                          }`}
                        >
                          <span className="flex-1 truncate">
                            {category === 'all' ? 'Alla kategorier' : category}
                          </span>
                          <span className={`text-xs flex-shrink-0 ${
                            isActive
                              ? 'text-purple-600'
                              : 'text-gray-400'
                          }`}>
                            {count}
                          </span>
                        </button>
                        <div className="flex flex-col w-6">
                          {!isAll && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveCategoryUp(category)
                                }}
                                disabled={isFirst}
                                className={`p-0.5 rounded transition-colors ${
                                  isFirst
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-400 hover:text-purple-600 hover:bg-purple-100'
                                }`}
                                title="Flytta upp"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveCategoryDown(category)
                                }}
                                disabled={isLast}
                                className={`p-0.5 rounded transition-colors ${
                                  isLast
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-400 hover:text-purple-600 hover:bg-purple-100'
                                }`}
                                title="Flytta ner"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Taggar under kategorin - endast om kategorin är aktiv */}
                      {isActive && categoryTags.length > 0 && (
                        <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100">
                          <div className="flex flex-wrap gap-1">
                            {categoryTags.map(tag => {
                              const isTagSelected = selectedTaskTags.includes(tag)
                              return (
                                <button
                                  key={tag}
                                  onClick={() => toggleTaskTagFilter(tag)}
                                  className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                                    isTagSelected
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  {tag}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </h2>
              <div className="space-y-1">
                <button
                  onClick={() => setFilter('all')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    filter === 'all'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ListTodo className="w-4 h-4" />
                  Alla uppgifter
                </button>
                <button
                  onClick={() => setFilter('active')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    filter === 'active'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Circle className="w-4 h-4" />
                  Aktiva
                </button>
                <button
                  onClick={() => setFilter('completed')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    filter === 'completed'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Klara
                </button>
              </div>
            </div>

            {/* Lists */}
            {lists.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                <h2 className="font-semibold text-gray-900 mb-3">Listor</h2>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedList(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                      !selectedList
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Alla listor
                  </button>
                  {lists.map(list => (
                    <button
                      key={list}
                      onClick={() => setSelectedList(list)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                        selectedList === list
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {list}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-3">Översikt</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Totalt</span>
                  <span className="font-semibold text-gray-900">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Aktiva</span>
                  <span className="font-semibold text-blue-600">{stats.active}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Klara</span>
                  <span className="font-semibold text-green-600">{stats.completed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Idag</span>
                  <span className="font-semibold text-purple-600">{stats.today}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            <div>
              {tasksLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-12">
                  <Circle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {filter === 'completed'
                      ? 'Inga klara uppgifter än'
                      : 'Inga uppgifter hittades'}
                  </p>
                </div>
              ) : groupedTasks ? (
                <div className="space-y-6">
                  {groupedTasks.map(group => (
                    <div key={group.category}>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        {group.category}
                        <span className="text-xs text-gray-400 font-normal">({group.tasks.length})</span>
                      </h3>
                      <div className="space-y-3">
                        {group.tasks.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onToggle={toggleTaskComplete}
                            onDelete={deleteTask}
                            onToggleSubtask={toggleSubtask}
                            onUpdate={updateTask}
                            categories={categories}
                            taskToOpen={selectedTaskToOpen}
                            onTaskOpened={() => setSelectedTaskToOpen(null)}
                            allNotes={notes}
                            onNoteClick={(note) => {
                              setSelectedNoteToOpen(note)
                              setActiveTab('notes')
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                    {filteredTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggle={toggleTaskComplete}
                        onDelete={deleteTask}
                        onToggleSubtask={toggleSubtask}
                        onUpdate={updateTask}
                        categories={categories}
                        taskToOpen={selectedTaskToOpen}
                        onTaskOpened={() => setSelectedTaskToOpen(null)}
                        allNotes={notes}
                        onNoteClick={(note) => {
                          setSelectedNoteToOpen(note)
                          setActiveTab('notes')
                        }}
                      />
                    ))}
                </div>
              )}
            </div>
          </main>
        </div>
          </>
        )}
      </div>

      {/* Modals */}
      <AITaskCreator
        onTasksCreated={handleTasksCreated}
        showModal={showAIModal}
        onClose={() => setShowAIModal(false)}
      />
      <TaskForm
        onTaskCreated={handleTaskCreated}
        showModal={showTaskFormModal}
        onClose={() => setShowTaskFormModal(false)}
        categories={categories}
      />
    </div>
  )
}
