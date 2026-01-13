import { motion } from 'framer-motion'
import { CheckSquare, FileText, Calendar, AlertCircle, TrendingUp, Clock, BarChart3, ArrowRight } from 'lucide-react'
import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'

export default function Dashboard({
  tasks,
  notes,
  onTaskClick,
  onNoteClick,
  onCategoryClick,
  onViewAllTasks,
  onViewAllNotes
}) {
  // Beräkna statistik
  const stats = {
    totalTasks: tasks.length,
    activeTasks: tasks.filter(t => !t.completed).length,
    completedTasks: tasks.filter(t => t.completed).length,
    totalNotes: notes.length,
    completionRate: tasks.length > 0
      ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)
      : 0
  }

  // Hämta dagens uppgifter
  const todayTasks = tasks.filter(task => {
    if (!task.due_date) return false
    const dueDate = parseISO(task.due_date)
    return isToday(dueDate)
  }).slice(0, 8)

  // Hämta kommande deadlines (inom en vecka)
  const upcomingDeadlines = tasks
    .filter(task => {
      if (!task.due_date || task.completed) return false
      const dueDate = parseISO(task.due_date)
      return isThisWeek(dueDate, { weekStartsOn: 1 })
    })
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5)

  // Hämta senaste anteckningar
  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 5)

  // Hämta kategorier med antal uppgifter
  const categoryStats = tasks.reduce((acc, task) => {
    const category = task.category || 'Allmänt'
    if (!acc[category]) {
      acc[category] = { total: 0, active: 0 }
    }
    acc[category].total++
    if (!task.completed) {
      acc[category].active++
    }
    return acc
  }, {})

  const topCategories = Object.entries(categoryStats)
    .sort((a, b) => b[1].active - a[1].active)
    .slice(0, 5)

  // Helper för prioritetsfärg
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Helper för deadline-text
  const getDeadlineText = (dueDate) => {
    const date = parseISO(dueDate)
    if (isToday(date)) return 'Idag'
    if (isTomorrow(date)) return 'Imorgon'
    return format(date, 'd MMM', { locale: sv })
  }

  // Helper för att extrahera text från HTML-innehåll
  const stripHtml = (html) => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  return (
    <div className="space-y-4">
      {/* Statistik widgets - Överst */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Totalt uppgifter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200"
        >
          <div className="flex items-center justify-between mb-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <span className="text-2xl font-bold text-blue-900">{stats.totalTasks}</span>
          </div>
          <p className="text-sm font-medium text-blue-700">Totalt uppgifter</p>
          <p className="text-xs text-blue-600 mt-1">{stats.activeTasks} aktiva</p>
        </motion.div>

        {/* Slutförda */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200"
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-2xl font-bold text-green-900">{stats.completionRate}%</span>
          </div>
          <p className="text-sm font-medium text-green-700">Slutförda</p>
          <p className="text-xs text-green-600 mt-1">{stats.completedTasks} av {stats.totalTasks}</p>
        </motion.div>

        {/* Anteckningar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200"
        >
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <span className="text-2xl font-bold text-purple-900">{stats.totalNotes}</span>
          </div>
          <p className="text-sm font-medium text-purple-700">Anteckningar</p>
          <p className="text-xs text-purple-600 mt-1">Totalt sparade</p>
        </motion.div>

        {/* Idag's uppgifter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200"
        >
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            <span className="text-2xl font-bold text-orange-900">{todayTasks.length}</span>
          </div>
          <p className="text-sm font-medium text-orange-700">Idag</p>
          <p className="text-xs text-orange-600 mt-1">Uppgifter med deadline</p>
        </motion.div>
      </div>

      {/* Huvudinnehåll - 2 kolumner på desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Idag's uppgifter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Idag's Uppgifter
            </h2>
            <button
              onClick={onViewAllTasks}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Visa alla
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {todayTasks.length > 0 ? (
            <div className="space-y-2">
              {todayTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 ${
                      task.completed
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300 group-hover:border-blue-500'
                    }`}>
                      {task.completed && (
                        <CheckSquare className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        task.completed ? 'line-through text-gray-400' : 'text-gray-900'
                      }`}>
                        {task.title}
                      </p>
                      {task.category && (
                        <span className="inline-block mt-1 text-xs text-gray-500">
                          {task.category}
                        </span>
                      )}
                    </div>
                    {task.priority && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority === 'high' ? 'Hög' : task.priority === 'medium' ? 'Medel' : 'Låg'}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Inga uppgifter med deadline idag</p>
            </div>
          )}
        </motion.div>

        {/* Senaste anteckningar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Senaste Anteckningar
            </h2>
            <button
              onClick={onViewAllNotes}
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              Visa alla
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {recentNotes.length > 0 ? (
            <div className="space-y-2">
              {recentNotes.map(note => {
                const textContent = stripHtml(note.content || '')
                const preview = textContent.slice(0, 80) + (textContent.length > 80 ? '...' : '')

                return (
                  <button
                    key={note.id}
                    onClick={() => onNoteClick(note)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                  >
                    <p className="text-sm font-medium text-gray-900 mb-1 truncate">
                      {note.title}
                    </p>
                    {preview && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                        {preview}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {note.category && (
                        <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                          {note.category}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {format(new Date(note.updated_at), 'd MMM HH:mm', { locale: sv })}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Inga anteckningar ännu</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Nedersta raden - 2 kolumner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Kategorier */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-100"
        >
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Kategorier
          </h2>

          {topCategories.length > 0 ? (
            <div className="space-y-3">
              {topCategories.map(([category, stats]) => (
                <button
                  key={category}
                  onClick={() => onCategoryClick(category)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{category}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        {stats.active} aktiva
                      </span>
                      <span className="text-sm font-semibold text-indigo-600">
                        {stats.total}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${stats.total > 0 ? ((stats.total - stats.active) / stats.total * 100) : 0}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Inga kategorier ännu</p>
            </div>
          )}
        </motion.div>

        {/* Kommande deadlines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-100"
        >
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Kommande Deadlines
          </h2>

          {upcomingDeadlines.length > 0 ? (
            <div className="space-y-2">
              {upcomingDeadlines.map(task => (
                <button
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900 flex-1">
                      {task.title}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                      isToday(parseISO(task.due_date))
                        ? 'bg-red-100 text-red-700'
                        : isTomorrow(parseISO(task.due_date))
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {getDeadlineText(task.due_date)}
                    </span>
                  </div>
                  {task.category && (
                    <span className="inline-block mt-1 text-xs text-gray-500">
                      {task.category}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Inga kommande deadlines</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
