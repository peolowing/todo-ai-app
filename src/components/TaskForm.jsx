import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TaskForm({ onTaskCreated }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    list_name: '',
    category: 'Allmänt',
    subtasks: []
  })
  const [subtaskInput, setSubtaskInput] = useState('')

  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  function addSubtask() {
    if (!subtaskInput.trim()) return

    setFormData(prev => ({
      ...prev,
      subtasks: [...prev.subtasks, subtaskInput.trim()]
    }))
    setSubtaskInput('')
  }

  function removeSubtask(index) {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter((_, i) => i !== index)
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Titel måste anges')
      return
    }

    setLoading(true)
    try {
      await onTaskCreated({
        title: formData.title,
        description: formData.description || '',
        priority: formData.priority,
        due_date: formData.due_date || null,
        list_name: formData.list_name || null,
        category: formData.category || 'Allmänt',
        subtasks: formData.subtasks
      })

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        list_name: '',
        category: 'Allmänt',
        subtasks: []
      })
      setIsOpen(false)
      toast.success('Uppgift skapad!')
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error(`Fel: ${error.message || 'Kunde inte skapa uppgift'}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setIsOpen(true)}
        className="w-full task-card hover:shadow-lg transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-center gap-2 text-gray-500 group-hover:text-blue-600">
          <Plus className="w-5 h-5" />
          <span className="font-medium">Skapa uppgift manuellt</span>
        </div>
      </motion.button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="task-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Ny uppgift</h3>
            <p className="text-sm text-gray-500">Fyll i formuläret nedan</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Titel *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="T.ex. Köpa mjölk"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={loading}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anteckningar
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Lägg till detaljer..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prioritet
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="low">Låg</option>
              <option value="medium">Medium</option>
              <option value="high">Hög</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deadline
            </label>
            <input
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* List Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lista
            </label>
            <input
              type="text"
              name="list_name"
              value={formData.list_name}
              onChange={handleChange}
              placeholder="T.ex. Projekt X, Sprint 1"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="T.ex. Arbete, Privat, Shopping"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
        </div>

        {/* Subtasks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Deluppgifter
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={subtaskInput}
              onChange={(e) => setSubtaskInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
              placeholder="Lägg till deluppgift..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="button"
              onClick={addSubtask}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={loading}
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {formData.subtasks.length > 0 && (
            <div className="space-y-2">
              {formData.subtasks.map((subtask, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm text-gray-700">{subtask}</span>
                  <button
                    type="button"
                    onClick={() => removeSubtask(index)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    disabled={loading}
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !formData.title.trim()}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Skapar...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Skapa uppgift
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Avbryt
          </button>
        </div>
      </form>
    </motion.div>
  )
}
