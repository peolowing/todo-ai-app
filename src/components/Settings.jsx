import { useState, useRef, useEffect } from 'react'
import { Settings as SettingsIcon, ChevronDown } from 'lucide-react'
import ImportExport from './ImportExport'
import MicrosoftIntegration from './MicrosoftIntegration'

export default function Settings({ tasks, notes, onImportTasks, onImportNotes, userId, user }) {
  const [showMenu, setShowMenu] = useState(false)
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [showMicrosoftModal, setShowMicrosoftModal] = useState(false)
  const menuRef = useRef(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-2 lg:px-4 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          title="Inställningar"
        >
          <SettingsIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Inställningar</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <button
              onClick={() => {
                setShowMicrosoftModal(true)
                setShowMenu(false)
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              Microsoft Outlook
            </button>
            <button
              onClick={() => {
                setShowBackupModal(true)
                setShowMenu(false)
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              Backup & Import
            </button>
            {/* More settings options will go here in the future */}
          </div>
        )}
      </div>

      {/* Microsoft Integration Modal */}
      {showMicrosoftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <MicrosoftIntegration user={user} />
              <button
                onClick={() => setShowMicrosoftModal(false)}
                className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Modal - Controlled from here */}
      <ImportExport
        tasks={tasks}
        notes={notes}
        onImportTasks={onImportTasks}
        onImportNotes={onImportNotes}
        userId={userId}
        showModal={showBackupModal}
        onClose={() => setShowBackupModal(false)}
      />
    </>
  )
}
