import { useState, useMemo } from 'react'
import { X, Search, Link as LinkIcon, Unlink } from 'lucide-react'

export default function LinkModal({
  isOpen,
  onClose,
  items,
  linkedIds,
  onLink,
  onUnlink,
  type
}) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!items) return []

    const search = searchTerm.toLowerCase()
    return items.filter(item => {
      const title = item.title?.toLowerCase() || ''
      const description = item.description?.toLowerCase() || ''
      const content = item.content?.toLowerCase() || ''

      return title.includes(search) ||
             description.includes(search) ||
             content.includes(search)
    })
  }, [items, searchTerm])

  const isLinked = (itemId) => linkedIds?.includes(itemId)

  const handleToggleLink = (item) => {
    if (isLinked(item.id)) {
      onUnlink(item.id)
    } else {
      onLink(item.id)
    }
  }

  if (!isOpen) return null

  const typeLabel = type === 'task' ? 'uppgift' : 'anteckning'
  const typeLabelPlural = type === 'task' ? 'uppgifter' : 'anteckningar'

  return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Länka {typeLabelPlural}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Sök ${typeLabelPlural}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm
                    ? `Inga ${typeLabelPlural} hittades`
                    : `Inga ${typeLabelPlural} finns ännu`}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((item) => {
                    const linked = isLinked(item.id)

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleToggleLink(item)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          linked
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 p-1.5 rounded-lg ${
                            linked ? 'bg-blue-500' : 'bg-gray-200'
                          }`}>
                            {linked ? (
                              <LinkIcon className="w-4 h-4 text-white" />
                            ) : (
                              <Unlink className="w-4 h-4 text-gray-500" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className={`font-medium truncate ${
                              linked ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {item.title}
                            </h3>

                            {(item.description || item.content) && (
                              <p className={`text-sm mt-1 line-clamp-2 ${
                                linked ? 'text-blue-700' : 'text-gray-600'
                              }`}>
                                {item.description || item.content}
                              </p>
                            )}

                            {type === 'task' && (
                              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                {item.category && (
                                  <span className="px-2 py-1 bg-gray-100 rounded">
                                    {item.category}
                                  </span>
                                )}
                                {item.priority && (
                                  <span className={`px-2 py-1 rounded ${
                                    item.priority === 'high'
                                      ? 'bg-red-100 text-red-700'
                                      : item.priority === 'medium'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {item.priority}
                                  </span>
                                )}
                              </div>
                            )}

                            {type === 'note' && item.category && (
                              <div className="mt-2">
                                <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                                  {item.category}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className={`text-sm font-medium ${
                            linked ? 'text-blue-600' : 'text-gray-400'
                          }`}>
                            {linked ? 'Länkad' : 'Länka'}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {linkedIds?.length || 0} {typeLabelPlural} länkade
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Klar
              </button>
            </div>
          </div>
        </div>
  )
}
