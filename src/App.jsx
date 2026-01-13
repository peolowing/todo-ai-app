import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './lib/supabase'
import { useTasks } from './hooks/useTasks'
import { useNotes } from './hooks/useNotes'
import Auth from './components/Auth'
import AITaskCreator from './components/AITaskCreator'
import TaskForm from './components/TaskForm'
import TaskCard from './components/TaskCard'
import Notes from './components/Notes'
import Settings from './components/Settings'
import { Toaster } from 'react-hot-toast'
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
  Layers
} from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('notes') // tasks, notes - Default to notes
  const [filter, setFilter] = useState('active') // all, active, completed - Default to active
  const [selectedList, setSelectedList] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all') // Kategorifilter för uppgifter
  const [showAIModal, setShowAIModal] = useState(false)
  const [showTaskFormModal, setShowTaskFormModal] = useState(false)
  const [openMobileMenu, setOpenMobileMenu] = useState(null) // 'overview', 'filter', 'lists', 'categories', or null
  const [triggerNoteCreate, setTriggerNoteCreate] = useState(0) // Trigger för att skapa ny anteckning
  const mobileMenuRef = useRef(null)

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
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMobileMenu])

  async function handleSignOut() {
    await supabase.auth.signOut()
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
  const categories = ['all', ...new Set(tasks.map(t => t.category || 'Allmänt'))]

  const filteredTasks = tasks.filter(task => {
    if (selectedList && task.list_name !== selectedList) return false
    if (selectedCategory !== 'all' && (task.category || 'Allmänt') !== selectedCategory) return false
    if (filter === 'active') return !task.completed
    if (filter === 'completed') return task.completed
    return true
  })

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Tab Navigation */}
        <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2 border border-gray-100 inline-flex gap-2">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'notes'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              Anteckningar
            </button>
          </div>

          {/* Create Task Buttons - Only show on tasks tab */}
          {activeTab === 'tasks' && (
            <div className="flex gap-2">
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

          {/* Create Note Button - Only show on notes tab */}
          {activeTab === 'notes' && (
            <div className="flex gap-2">
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

        {activeTab === 'notes' ? (
          <Notes
            notes={notes}
            onCreateNote={createNote}
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
            onCreateTask={createTask}
            triggerCreate={triggerNoteCreate}
          />
        ) : (
          <>
            {/* Mobile Menu Bar */}
            <div className="lg:hidden mb-4" ref={mobileMenuRef}>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2 border border-gray-100 flex gap-2 overflow-x-auto">
                {/* Översikt Menu */}
                <div className="relative">
                  <button
                    onClick={() => setOpenMobileMenu(openMobileMenu === 'overview' ? null : 'overview')}
                    className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all text-sm font-medium whitespace-nowrap"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Översikt
                    <ChevronDown className={`w-3 h-3 transition-transform ${openMobileMenu === 'overview' ? 'rotate-180' : ''}`} />
                  </button>
                  {openMobileMenu === 'overview' && (
                    <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 min-w-[200px]">
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
                  )}
                </div>

                {/* Filter Menu */}
                <div className="relative">
                  <button
                    onClick={() => setOpenMobileMenu(openMobileMenu === 'filter' ? null : 'filter')}
                    className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all text-sm font-medium whitespace-nowrap"
                  >
                    <Filter className="w-4 h-4" />
                    Filter
                    <ChevronDown className={`w-3 h-3 transition-transform ${openMobileMenu === 'filter' ? 'rotate-180' : ''}`} />
                  </button>
                  {openMobileMenu === 'filter' && (
                    <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[160px]">
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
                  )}
                </div>

                {/* Lists Menu */}
                {lists.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setOpenMobileMenu(openMobileMenu === 'lists' ? null : 'lists')}
                      className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all text-sm font-medium whitespace-nowrap"
                    >
                      <ListTodo className="w-4 h-4" />
                      Listor
                      <ChevronDown className={`w-3 h-3 transition-transform ${openMobileMenu === 'lists' ? 'rotate-180' : ''}`} />
                    </button>
                    {openMobileMenu === 'lists' && (
                      <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[160px]">
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
                    )}
                  </div>
                )}

                {/* Categories Menu */}
                <div className="relative">
                  <button
                    onClick={() => setOpenMobileMenu(openMobileMenu === 'categories' ? null : 'categories')}
                    className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all text-sm font-medium whitespace-nowrap"
                  >
                    <Layers className="w-4 h-4" />
                    Kategorier
                    <ChevronDown className={`w-3 h-3 transition-transform ${openMobileMenu === 'categories' ? 'rotate-180' : ''}`} />
                  </button>
                  {openMobileMenu === 'categories' && (
                    <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[160px]">
                      {categories.map(category => (
                        <button
                          key={category}
                          onClick={() => {
                            setSelectedCategory(category)
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
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Sidebar - Hidden on mobile */}
            <aside className="hidden lg:block lg:col-span-1 space-y-4">
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

            {/* Category Filter */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-3">Kategorier</h2>
              <div className="space-y-1">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                      selectedCategory === category
                        ? 'bg-purple-50 text-purple-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {category === 'all' ? 'Alla kategorier' : category}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-600" />
                {filter === 'all' && 'Alla uppgifter'}
                {filter === 'active' && 'Aktiva uppgifter'}
                {filter === 'completed' && 'Klara uppgifter'}
                {selectedList && ` - ${selectedList}`}
              </h2>

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
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {filteredTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggle={toggleTaskComplete}
                        onDelete={deleteTask}
                        onToggleSubtask={toggleSubtask}
                        onUpdate={updateTask}
                      />
                    ))}
                  </AnimatePresence>
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
      />
    </div>
  )
}
