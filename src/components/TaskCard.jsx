import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, Trash2, Calendar, Flag, ChevronDown, ChevronUp, Edit2, Save, X } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function TaskCard({ task, onToggle, onDelete, onToggleSubtask, onUpdate, categories = [], taskToOpen, onTaskOpened }) {
  const [expanded, setExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [editData, setEditData] = useState({
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    due_date: task.due_date ? task.due_date.split('T')[0] : '',
    list_name: task.list_name || '',
    category: task.category || 'Allmänt'
  })

  const priorityColors = {
    high: 'text-red-600 bg-red-50 border-red-200',
    medium: 'text-amber-600 bg-amber-50 border-amber-200',
    low: 'text-green-600 bg-green-50 border-green-200'
  }

  const priorityLabels = {
    high: 'Hög',
    medium: 'Medel',
    low: 'Låg'
  }

  // Listen for task to open from dashboard
  useEffect(() => {
    if (taskToOpen && taskToOpen.id === task.id) {
      setExpanded(true)
      setShowDetails(true)
      if (onTaskOpened) {
        onTaskOpened()
      }
    }
  }, [taskToOpen, task.id, onTaskOpened])

  function handleEdit() {
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
    setShowCustomCategory(false)
    setEditData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      list_name: task.list_name || '',
      category: task.category || 'Allmänt'
    })
  }

  async function handleSave() {
    if (!editData.title.trim()) {
      toast.error('Titel kan inte vara tom')
      return
    }

    try {
      await onUpdate(task.id, {
        title: editData.title,
        description: editData.description,
        priority: editData.priority,
        due_date: editData.due_date || null,
        list_name: editData.list_name || null,
        category: editData.category || 'Allmänt'
      })
      setIsEditing(false)
      toast.success('Uppgift uppdaterad!')
    } catch (error) {
      toast.error('Kunde inte uppdatera uppgiften')
    }
  }

  function handleChange(field, value) {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  if (showDetails && !isEditing) {
    return (
      <motion.div
        layout
        className="task-card"
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <button
                onClick={() => onToggle(task.id, !task.completed)}
                className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                  task.completed
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-500'
                    : 'border-gray-300 hover:border-blue-500'
                }`}
              >
                {task.completed && <Check className="w-4 h-4 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <h3 className={`text-xl font-bold text-gray-900 ${task.completed ? 'line-through text-gray-500' : ''}`}>
                  {task.title}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setShowDetails(false); setIsEditing(true); }}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                title="Redigera"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Ta bort"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowDetails(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                title="Stäng detaljer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {task.description && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Anteckningar</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {task.priority && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Prioritet</h4>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-md font-medium border ${priorityColors[task.priority]}`}>
                  <Flag className="w-4 h-4" />
                  {priorityLabels[task.priority]}
                </span>
              </div>
            )}

            {task.due_date && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Deadline</h4>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-md font-medium">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(task.due_date), 'd MMMM yyyy', { locale: sv })}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            {task.list_name && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Lista</h4>
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-md font-medium text-sm">
                  {task.list_name}
                </span>
              </div>
            )}

            {task.category && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Kategori</h4>
                <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-md font-medium text-sm">
                  {task.category}
                </span>
              </div>
            )}
          </div>

          {task.subtasks && task.subtasks.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Deluppgifter ({task.subtasks.filter(st => st.completed).length}/{task.subtasks.length})
              </h4>
              <div className="space-y-2">
                {task.subtasks.map(subtask => (
                  <div key={subtask.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <button
                      onClick={() => onToggleSubtask(subtask.id, !subtask.completed)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        subtask.completed
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {subtask.completed && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <span className={`text-sm flex-1 ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  if (isEditing) {
    return (
      <motion.div
        layout
        className="task-card bg-blue-50 border-blue-200"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-blue-700">
              <Edit2 className="w-4 h-4" />
              <span className="text-sm font-medium">Redigera uppgift</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                title="Spara"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancel}
                className="p-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg transition-colors"
                title="Avbryt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Titel *</label>
            <input
              type="text"
              value={editData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Anteckningar</label>
            <textarea
              value={editData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prioritet</label>
              <select
                value={editData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Låg</option>
                <option value="medium">Medel</option>
                <option value="high">Hög</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Deadline</label>
              <input
                type="date"
                value={editData.due_date}
                onChange={(e) => handleChange('due_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Lista</label>
              <input
                type="text"
                value={editData.list_name}
                onChange={(e) => handleChange('list_name', e.target.value)}
                placeholder="T.ex. Projekt X"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Kategori</label>
              {!showCustomCategory ? (
                <select
                  value={editData.category}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setShowCustomCategory(true)
                      handleChange('category', '')
                    } else {
                      handleChange('category', e.target.value)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.filter(cat => cat !== 'all').map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  <option value="__custom__">+ Ny kategori</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    placeholder="Skriv ny kategori"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowCustomCategory(false)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg transition-colors"
                    title="Tillbaka till dropdown"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`task-card ${task.completed ? 'opacity-60' : ''} cursor-pointer`}
      onClick={() => setShowDetails(true)}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle(task.id, !task.completed)
          }}
          className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
            task.completed
              ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-500'
              : 'border-gray-300 hover:border-blue-500'
          }`}
        >
          {task.completed && <Check className="w-4 h-4 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3
                className={`font-semibold text-gray-900 ${
                  task.completed ? 'line-through text-gray-500' : ''
                }`}
              >
                {task.title}
              </h3>
              
              {task.description && (
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                {task.list_name && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-medium">
                    {task.list_name}
                  </span>
                )}

                {task.due_date && (
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-md font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(task.due_date), 'd MMM', { locale: sv })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit()
                }}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                title="Redigera"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(task.id)
                }}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Ta bort"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {task.subtasks && task.subtasks.length > 0 && (
            <div className="mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded(!expanded)
                }}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {task.subtasks.filter(st => st.completed).length} av {task.subtasks.length} deluppgifter klara
              </button>

              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200"
                >
                  {task.subtasks.map(subtask => (
                    <div key={subtask.id} className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleSubtask(subtask.id, !subtask.completed)
                        }}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                          subtask.completed
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {subtask.completed && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <span
                        className={`text-sm ${
                          subtask.completed ? 'line-through text-gray-500' : 'text-gray-700'
                        }`}
                      >
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
