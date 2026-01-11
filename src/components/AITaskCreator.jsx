import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2 } from 'lucide-react'
import { parseTasksFromText } from '../lib/openai'
import toast from 'react-hot-toast'

export default function AITaskCreator({ onTasksCreated }) {
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
    } catch (error) {
      console.error('Error creating tasks:', error)
      toast.error(`Fel: ${error.message || 'Något gick fel vid skapandet av uppgifter'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="task-card"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">AI Uppgiftsskapare</h3>
          <p className="text-sm text-gray-500">Skriv fritt, AI strukturerar</p>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Exempel: Imorgon behöver jag köpa mjölk och bröd. Nästa vecka ska jag:&#10;- Boka tandläkartid (viktigt!)&#10;- Mejla Johan om projektet&#10;- Förbereda presentation för mötet på fredag"
        className="w-full h-40 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-sans text-gray-700 placeholder:text-gray-400"
        disabled={loading}
      />

      <div className="flex justify-end mt-4">
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

      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Tips:</strong> AI:n kan känna igen deadlines ("imorgon", "nästa vecka"), 
          prioriteter ("viktigt", "brådskande") och deluppgifter (punktlistor).
        </p>
      </div>
    </motion.div>
  )
}
