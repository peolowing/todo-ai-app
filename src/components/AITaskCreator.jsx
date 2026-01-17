import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, Loader2, X } from 'lucide-react'
import { parseTasksFromText } from '../lib/openai'
import toast from 'react-hot-toast'

export default function AITaskCreator({ onTasksCreated, showModal, onClose }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAICreate() {
    if (!text.trim()) {
      toast.error('Skriv något i textrutan först')
      return
    }

    setLoading(true)
    try {
      const tasks = await parseTasksFromText(text)

      if (tasks.length === 0) {
        toast.error('Kunde inte hitta några uppgifter i texten')
        return
      }

      await onTasksCreated(tasks)
      setText('')
      toast.success(`${tasks.length} uppgift${tasks.length > 1 ? 'er' : ''} skapade!`)
      onClose()
    } catch (error) {
      console.error('Error creating tasks:', error)
      toast.error(`Fel: ${error.message || 'Något gick fel vid skapandet av uppgifter'}`)
    } finally {
      setLoading(false)
    }
  }

  if (!showModal) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" style={{ zIndex: 99999 }}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-4 sm:my-8"
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Uppgiftsskapare</h3>
              <p className="text-sm text-gray-500">Skriv fritt, AI strukturerar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Exempel: Imorgon behöver jag köpa mjölk och bröd. Nästa vecka ska jag:&#10;- Boka tandläkartid (viktigt!)&#10;- Mejla Johan om projektet&#10;- Förbereda presentation för mötet på fredag"
            className="w-full h-48 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-sans text-gray-700 placeholder:text-gray-400"
            disabled={loading}
          />

          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tips:</strong> AI:n kan känna igen deadlines ("imorgon", "nästa vecka"),
              prioriteter ("viktigt", "brådskande") och deluppgifter (punktlistor).
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            Avbryt
          </button>
          <button
            onClick={handleAICreate}
            disabled={loading || !text.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Skapar uppgifter...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Skapa uppgifter med AI
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
