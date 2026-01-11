import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Download, Upload, FileJson, AlertCircle, CheckCircle2, Mail, Copy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function ImportExport({
  tasks,
  notes,
  onImportTasks,
  onImportNotes,
  userId
}) {
  const [showModal, setShowModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)

  // Generate email address for this user
  // TODO: Replace with your actual Mailgun domain
  const emailAddress = userId ? `notes-${userId}@sandbox6bece006530d468ea097910a734162d3.mailgun.org` : ''

  function copyEmailToClipboard() {
    if (emailAddress) {
      navigator.clipboard.writeText(emailAddress)
      toast.success('Email-adress kopierad!')
    }
  }

  // Exportera alla data till JSON
  function handleExport() {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      tasks: tasks.map(task => ({
        title: task.title,
        description: task.description,
        completed: task.completed,
        priority: task.priority,
        due_date: task.due_date,
        list_name: task.list_name,
        subtasks: task.subtasks,
        created_at: task.created_at,
        updated_at: task.updated_at
      })),
      notes: notes.map(note => ({
        title: note.title,
        content: note.content,
        category: note.category,
        created_at: note.created_at,
        updated_at: note.updated_at
      }))
    }

    // Skapa blob och ladda ner
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `todo-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success(`Exporterade ${tasks.length} uppgifter och ${notes.length} anteckningar`)
  }

  // Hantera filuppladdning
  async function handleImport(event) {
    const file = event.target.files?.[0]
    if (!file) return

    // Kontrollera att det är en JSON-fil
    if (!file.name.endsWith('.json')) {
      toast.error('Vänligen välj en JSON-fil')
      return
    }

    setImporting(true)

    try {
      const text = await file.text()
      const importData = JSON.parse(text)

      // Validera data
      if (!importData.version || !importData.tasks || !importData.notes) {
        throw new Error('Ogiltig backup-fil. Filen saknar nödvändiga fält.')
      }

      // Visa bekräftelse
      const tasksCount = importData.tasks.length
      const notesCount = importData.notes.length
      const exportDate = importData.exportDate
        ? format(new Date(importData.exportDate), 'yyyy-MM-dd HH:mm')
        : 'okänt datum'

      if (!confirm(
        `Vill du importera denna backup?\n\n` +
        `Skapad: ${exportDate}\n` +
        `Uppgifter: ${tasksCount}\n` +
        `Anteckningar: ${notesCount}\n\n` +
        `Detta kommer att lägga till dessa till dina befintliga data.`
      )) {
        setImporting(false)
        return
      }

      // Importera uppgifter
      let importedTasks = 0
      for (const task of importData.tasks) {
        try {
          await onImportTasks({
            title: task.title,
            description: task.description || '',
            completed: task.completed || false,
            priority: task.priority || 'medium',
            due_date: task.due_date || null,
            list_name: task.list_name || null,
            subtasks: task.subtasks || []
          })
          importedTasks++
        } catch (error) {
          console.error('Error importing task:', task.title, error)
        }
      }

      // Importera anteckningar
      let importedNotes = 0
      for (const note of importData.notes) {
        try {
          await onImportNotes({
            title: note.title,
            content: note.content || '',
            category: note.category || 'Allmänt'
          })
          importedNotes++
        } catch (error) {
          console.error('Error importing note:', note.title, error)
        }
      }

      toast.success(
        `Import klar! ${importedTasks} uppgifter och ${importedNotes} anteckningar importerade.`,
        { duration: 5000 }
      )

      setShowModal(false)
    } catch (error) {
      console.error('Import error:', error)
      toast.error(`Fel vid import: ${error.message}`)
    } finally {
      setImporting(false)
      // Rensa file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3 py-2 lg:px-4 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
        title="Import & Export"
      >
        <FileJson className="w-4 h-4" />
        <span className="hidden sm:inline">Backup</span>
      </button>

      {/* Modal - Rendered via Portal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" style={{ zIndex: 99999 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full my-4 sm:my-8 flex flex-col relative"
          >
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Import & Export</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Säkerhetskopiera eller återställ dina data
                </p>
              </div>

              <div className="p-4 space-y-3">
                {/* Export sektion */}
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-3">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <Download className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm">Exportera data</h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Ladda ner en JSON-fil med alla dina uppgifter och anteckningar
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-2 mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">Uppgifter:</span>
                      <span className="font-semibold text-gray-900">{tasks.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Anteckningar:</span>
                      <span className="font-semibold text-gray-900">{notes.length}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleExport}
                    className="w-full px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exportera till fil
                  </button>
                </div>

                {/* Import sektion */}
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-3">
                    <div className="p-1.5 bg-green-100 rounded-lg">
                      <Upload className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm">Importera data</h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Ladda upp en tidigare exporterad JSON-fil
                      </p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        Import <strong>lägger till</strong> data från filen. Inget tas bort.
                      </p>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="w-full px-3 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {importing ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Upload className="w-4 h-4" />
                        </motion.div>
                        Importerar...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Välj fil att importera
                      </>
                    )}
                  </button>
                </div>

                {/* Email till anteckningar */}
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-3">
                    <div className="p-1.5 bg-purple-100 rounded-lg">
                      <Mail className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm">Email till anteckningar</h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Skicka email som blir anteckningar automatiskt
                      </p>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 mb-2">
                    <p className="text-xs text-purple-800 mb-2">
                      Din unika email-adress:
                    </p>
                    <div className="flex items-center gap-1">
                      <code className="flex-1 text-xs bg-white px-2 py-1 rounded border border-purple-200 text-purple-900 overflow-x-auto">
                        {emailAddress || 'Konfigurera Mailgun först'}
                      </code>
                      {emailAddress && (
                        <button
                          onClick={copyEmailToClipboard}
                          className="p-1 hover:bg-purple-100 rounded transition-colors"
                          title="Kopiera email-adress"
                        >
                          <Copy className="w-3.5 h-3.5 text-purple-600" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        Kräver Mailgun-konfiguration. Se <strong>EMAIL_SETUP.md</strong> för instruktioner.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800">
                      <strong>Tips:</strong> Exportera regelbundet för säkerhetskopiering. Filerna sparas som JSON.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
                >
                  Stäng
                </button>
              </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  )
}
