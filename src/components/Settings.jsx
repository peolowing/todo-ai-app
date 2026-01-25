import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Settings as SettingsIcon, ChevronDown } from 'lucide-react'
import ImportExport from './ImportExport'
import MicrosoftIntegrationWrapper from './MicrosoftIntegrationWrapper'
import ReceiptScanner from './ReceiptScanner'

export default function Settings({ tasks, notes, onImportTasks, onImportNotes, userId, user }) {
  const [showMenu, setShowMenu] = useState(false)
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [showMicrosoftModal, setShowMicrosoftModal] = useState(false)
  const [showReceiptsModal, setShowReceiptsModal] = useState(false)
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
                setShowReceiptsModal(true)
                setShowMenu(false)
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              Kvittoscanning
            </button>
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
          </div>
        )}
      </div>

      {/* Microsoft Integration Modal */}
      {showMicrosoftModal && createPortal(
        <div
          className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 overflow-y-auto"
          style={{ zIndex: 999999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMicrosoftModal(false)
            }
          }}
        >
          <div className="min-h-screen px-4 py-8 flex items-center justify-center">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 sm:p-6">
                <MicrosoftIntegrationWrapper user={user} />
                <button
                  onClick={() => setShowMicrosoftModal(false)}
                  className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Stäng
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Receipt Scanner Modal */}
      {showReceiptsModal && createPortal(
        <div
          className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 overflow-y-auto"
          style={{ zIndex: 999999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowReceiptsModal(false)
            }
          }}
        >
          <div className="min-h-screen px-4 py-8 flex items-center justify-center">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 sm:p-6">
                <ReceiptScanner user={user} />
                <button
                  onClick={() => setShowReceiptsModal(false)}
                  className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Stäng
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
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
