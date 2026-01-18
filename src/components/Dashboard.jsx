import { CheckSquare, FileText, Calendar, AlertCircle, TrendingUp, BarChart3, ArrowRight } from 'lucide-react'
import { format, isToday, isTomorrow, isThisWeek, parseISO, addDays, startOfDay, isSameDay } from 'date-fns'
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

  // Skapa 14-dagars kalenderdata
  const today = startOfDay(new Date())
  const calendarDays = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, i)
    const dayTasks = tasks.filter(task => {
      if (!task.due_date) return false
      const dueDate = parseISO(task.due_date)
      return isSameDay(dueDate, date)
    })
    return { date, tasks: dayTasks }
  })

  // Hämta dagens uppgifter (för statistikwidget)
  const todayTasks = calendarDays[0].tasks

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
    .filter(([, stats]) => stats.active > 0)
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
        <div
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200"
        >
          <div className="flex items-center justify-between mb-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <span className="text-2xl font-bold text-blue-900">{stats.totalTasks}</span>
          </div>
          <p className="text-xs font-medium text-blue-700">Totalt uppgifter</p>
          <p className="text-xs text-blue-600 mt-1">{stats.activeTasks} aktiva</p>
        </div>

        {/* Slutförda */}
        <div
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200"
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-2xl font-bold text-green-900">{stats.completionRate}%</span>
          </div>
          <p className="text-xs font-medium text-green-700">Slutförda</p>
          <p className="text-xs text-green-600 mt-1">{stats.completedTasks} av {stats.totalTasks}</p>
        </div>

        {/* Anteckningar */}
        <div
          className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200"
        >
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <span className="text-2xl font-bold text-purple-900">{stats.totalNotes}</span>
          </div>
          <p className="text-xs font-medium text-purple-700">Anteckningar</p>
          <p className="text-xs text-purple-600 mt-1">Totalt sparade</p>
        </div>

        {/* Idag's uppgifter */}
        <div
          className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200"
        >
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            <span className="text-2xl font-bold text-orange-900">{todayTasks.length}</span>
          </div>
          <p className="text-xs font-medium text-orange-700">Idag</p>
          <p className="text-xs text-orange-600 mt-1">Uppgifter med deadline</p>
        </div>
      </div>

      {/* 14-dagars kalender - Full bredd */}
      <div
        className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-100"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Kommande 14 dagar
          </h2>
          <button
            onClick={onViewAllTasks}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Visa alla
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {/* Veckodagar header */}
          {['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.slice(0, 3)}</span>
            </div>
          ))}

          {/* Tomma rutor innan första dagen */}
          {Array.from({ length: (calendarDays[0].date.getDay() + 6) % 7 }, (_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] sm:min-h-[100px]" />
          ))}

          {/* Kalenderdagar */}
          {calendarDays.map(({ date, tasks: dayTasks }) => {
            const isCurrentDay = isToday(date)
            const hasTasks = dayTasks.length > 0

            return (
              <div
                key={date.toISOString()}
                className={`min-h-[80px] sm:min-h-[100px] rounded-lg p-1.5 sm:p-2 transition-all ${
                  isCurrentDay
                    ? 'bg-blue-600 text-white'
                    : hasTasks
                    ? 'bg-gray-50 border border-gray-200'
                    : 'bg-gray-50/50'
                }`}
              >
                <div className={`text-sm font-semibold mb-1 ${isCurrentDay ? 'text-white' : 'text-gray-700'}`}>
                  {format(date, 'd')}
                </div>
                {hasTasks && (
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 3).map((task) => (
                      <button
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className={`w-full text-left text-xs px-1 py-0.5 rounded truncate transition-colors ${
                          task.completed
                            ? isCurrentDay
                              ? 'bg-green-400/30 text-green-100 line-through'
                              : 'bg-green-100 text-green-700 line-through'
                            : task.priority === 'high'
                            ? isCurrentDay
                              ? 'bg-red-400/30 text-red-100'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                            : task.priority === 'medium'
                            ? isCurrentDay
                              ? 'bg-yellow-400/30 text-yellow-100'
                              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : isCurrentDay
                            ? 'bg-blue-400/30 text-blue-100'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </button>
                    ))}
                    {dayTasks.length > 3 && (
                      <p className={`text-xs px-1 ${isCurrentDay ? 'text-blue-200' : 'text-gray-400'}`}>
                        +{dayTasks.length - 3} till
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Förklaring */}
        <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-gray-500">Hög</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-xs text-gray-500">Medel</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-500">Låg</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs text-gray-500">Klar</span>
          </div>
        </div>
      </div>

      {/* Innehåll - 3 kolumner på desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Senaste anteckningar */}
        <div
          className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
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
        </div>

        {/* Kategorier */}
        <div
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
                    <span className="text-sm font-semibold text-indigo-600">
                      {stats.active}
                    </span>
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
        </div>

        {/* Kommande deadlines */}
        <div
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
        </div>
      </div>
    </div>
  )
}
