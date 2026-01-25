import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { scanReceipt, fileToBase64, receiptCategories, vatRates } from '../lib/receiptOCR'
import { Camera, Upload, Loader2, X, Save, Download, Trash2, Edit2, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ReceiptScanner({ user }) {
  const [receipts, setReceipts] = useState([])
  const [isScanning, setIsScanning] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [lists, setLists] = useState([])
  const [newListName, setNewListName] = useState('')
  const [showNewListInput, setShowNewListInput] = useState(false)
  const [selectedList, setSelectedList] = useState('all')
  const [selectedReceipts, setSelectedReceipts] = useState([])
  const [formData, setFormData] = useState({
    date: '',
    amount: '',
    vatAmount: '',
    vatRate: '25%',
    tipAmount: '',
    vendorName: '',
    orgNumber: '',
    category: 'Material',
    description: '',
    listName: ''
  })
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  // Ladda kvitton när komponenten mountas
  useEffect(() => {
    if (user) {
      loadReceipts()
    }
  }, [user])

  async function loadReceipts() {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (error) throw error
      setReceipts(data || [])

      // Extrahera unika listor
      const uniqueLists = [...new Set(data?.map(r => r.list_name).filter(Boolean))]
      setLists(uniqueLists)
    } catch (error) {
      console.error('Error loading receipts:', error)
      toast.error('Kunde inte ladda kvitton')
    }
  }

  async function handleFileSelect(file) {
    if (!file) return

    // Validera filtyp
    if (!file.type.startsWith('image/')) {
      toast.error('Vänligen välj en bildfil')
      return
    }

    // Validera filstorlek (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Bilden är för stor (max 10MB)')
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setIsScanning(true)
    setShowForm(true)

    try {
      // Konvertera till base64 och skanna
      const base64 = await fileToBase64(file)
      const scannedData = await scanReceipt(base64)

      // Fyll i formuläret med OCR-data
      setFormData({
        date: scannedData.date || new Date().toISOString().split('T')[0],
        amount: scannedData.amount?.toString() || '',
        vatAmount: scannedData.vatAmount?.toString() || '',
        vatRate: scannedData.vatRate || '25%',
        tipAmount: scannedData.tipAmount?.toString() || '',
        vendorName: scannedData.vendorName || '',
        orgNumber: scannedData.orgNumber || '',
        category: scannedData.category || 'Material',
        description: scannedData.description || '',
        listName: ''
      })

      toast.success('Kvitto inskannat!')
    } catch (error) {
      console.error('Scan error:', error)
      toast.error('Kunde inte läsa kvittot automatiskt. Fyll i manuellt.')
    } finally {
      setIsScanning(false)
    }
  }

  async function handleSave() {
    try {
      if (!imageFile) {
        toast.error('Ingen bild vald')
        return
      }

      // Validera formulär
      if (!formData.date || !formData.amount || !formData.vendorName) {
        toast.error('Fyll i datum, belopp och leverantör')
        return
      }

      setIsScanning(true)

      // Ladda upp bild till Supabase Storage
      const fileName = `${user.id}/${Date.now()}-${imageFile.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, imageFile)

      if (uploadError) throw uploadError

      // Hämta publik URL för bilden
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName)

      // Spara kvitto i databas
      const { data, error } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          date: formData.date,
          amount: parseFloat(formData.amount),
          vat_amount: formData.vatAmount ? parseFloat(formData.vatAmount) : null,
          vat_rate: formData.vatRate,
          tip_amount: formData.tipAmount ? parseFloat(formData.tipAmount) : null,
          vendor_name: formData.vendorName,
          org_number: formData.orgNumber || null,
          category: formData.category,
          description: formData.description || null,
          list_name: formData.listName || null
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Kvitto sparat!')
      await loadReceipts() // Ladda om för att uppdatera listor
      handleCancel()
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Kunde inte spara kvitto: ' + error.message)
    } finally {
      setIsScanning(false)
    }
  }

  async function handleDelete(receipt) {
    if (!confirm('Är du säker på att du vill radera detta kvitto?')) return

    try {
      // Radera bild från storage
      const fileName = receipt.image_url.split('/receipts/')[1]
      if (fileName) {
        await supabase.storage.from('receipts').remove([fileName])
      }

      // Radera från databas
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receipt.id)

      if (error) throw error

      toast.success('Kvitto raderat')
      setReceipts(receipts.filter(r => r.id !== receipt.id))
      if (selectedReceipt?.id === receipt.id) {
        setSelectedReceipt(null)
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Kunde inte radera kvitto')
    }
  }

  async function handleUpdate() {
    try {
      const { error } = await supabase
        .from('receipts')
        .update({
          date: formData.date,
          amount: parseFloat(formData.amount),
          vat_amount: formData.vatAmount ? parseFloat(formData.vatAmount) : null,
          vat_rate: formData.vatRate,
          tip_amount: formData.tipAmount ? parseFloat(formData.tipAmount) : null,
          vendor_name: formData.vendorName,
          org_number: formData.orgNumber || null,
          category: formData.category,
          description: formData.description || null,
          list_name: formData.listName || null
        })
        .eq('id', selectedReceipt.id)

      if (error) throw error

      toast.success('Kvitto uppdaterat!')
      await loadReceipts()
      setIsEditing(false)
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Kunde inte uppdatera kvitto')
    }
  }

  function handleCancel() {
    setShowForm(false)
    setImagePreview(null)
    setImageFile(null)
    setNewListName('')
    setShowNewListInput(false)
    setFormData({
      date: '',
      amount: '',
      vatAmount: '',
      vatRate: '25%',
      tipAmount: '',
      vendorName: '',
      orgNumber: '',
      category: 'Material',
      description: '',
      listName: ''
    })
  }

  function handleEdit(receipt) {
    setSelectedReceipt(receipt)
    setFormData({
      date: receipt.date,
      amount: receipt.amount.toString(),
      vatAmount: receipt.vat_amount?.toString() || '',
      vatRate: receipt.vat_rate || '25%',
      tipAmount: receipt.tip_amount?.toString() || '',
      vendorName: receipt.vendor_name,
      orgNumber: receipt.org_number || '',
      category: receipt.category,
      description: receipt.description || '',
      listName: receipt.list_name || ''
    })
    setIsEditing(true)
  }

  function toggleReceiptSelection(receiptId) {
    setSelectedReceipts(prev => {
      if (prev.includes(receiptId)) {
        return prev.filter(id => id !== receiptId)
      } else {
        return [...prev, receiptId]
      }
    })
  }

  function selectAllReceipts() {
    const filteredIds = receipts
      .filter(receipt => {
        if (selectedList === 'all') return true
        if (selectedList === 'no-list') return !receipt.list_name
        return receipt.list_name === selectedList
      })
      .map(r => r.id)
    setSelectedReceipts(filteredIds)
  }

  function deselectAllReceipts() {
    setSelectedReceipts([])
  }

  // Gruppera kvitton per månad
  function groupReceiptsByMonth(receiptsToGroup) {
    const groups = {}
    receiptsToGroup.forEach(receipt => {
      const monthKey = receipt.date.substring(0, 7) // YYYY-MM
      if (!groups[monthKey]) {
        groups[monthKey] = []
      }
      groups[monthKey].push(receipt)
    })

    // Sortera månader i fallande ordning (nyaste först)
    const sortedMonths = Object.keys(groups).sort((a, b) => b.localeCompare(a))

    return sortedMonths.map(month => ({
      month,
      receipts: groups[month],
      total: groups[month].reduce((sum, r) => sum + parseFloat(r.amount), 0),
      vatTotal: groups[month].reduce((sum, r) => sum + (parseFloat(r.vat_amount) || 0), 0),
      tipTotal: groups[month].reduce((sum, r) => sum + (parseFloat(r.tip_amount) || 0), 0)
    }))
  }

  // Formatera månadsnamn (YYYY-MM -> "Januari 2024")
  function formatMonthName(monthKey) {
    const [year, month] = monthKey.split('-')
    const monthNames = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
                        'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December']
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  async function exportToCSV() {
    // Exportera endast valda kvitton, eller alla om inga är valda
    const receiptsToExport = selectedReceipts.length > 0
      ? receipts.filter(r => selectedReceipts.includes(r.id))
      : receipts.filter(receipt => {
          if (selectedList === 'all') return true
          if (selectedList === 'no-list') return !receipt.list_name
          return receipt.list_name === selectedList
        })

    if (receiptsToExport.length === 0) {
      toast.error('Inga kvitton att exportera')
      return
    }

    try {
      const csv = [
        ['Datum', 'Belopp', 'Moms', 'Momssats', 'Dricks', 'Leverantör', 'Org.nr', 'Kategori', 'Beskrivning', 'Lista'].join(';'),
        ...receiptsToExport.map(r => [
          r.date,
          r.amount,
          r.vat_amount || '',
          r.vat_rate || '',
          r.tip_amount || '',
          r.vendor_name,
          r.org_number || '',
          r.category,
          r.description || '',
          r.list_name || ''
        ].join(';'))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `kvitton_${new Date().toISOString().split('T')[0]}.csv`
      link.click()

      toast.success(`${receiptsToExport.length} kvitton exporterade!`)
      setSelectedReceipts([]) // Rensa urval efter export
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Kunde inte exportera')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Kvittoscanning</h2>
        {receipts.length > 0 && (
          <div className="flex items-center gap-2">
            {selectedReceipts.length > 0 && (
              <span className="text-sm text-gray-600">
                {selectedReceipts.length} valda
              </span>
            )}
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              {selectedReceipts.length > 0
                ? `Exportera ${selectedReceipts.length} st`
                : 'Exportera CSV'}
            </button>
          </div>
        )}
      </div>

      {/* Upload buttons */}
      {!showForm && (
        <div className="flex gap-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Camera className="w-5 h-5" />
            Ta foto
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Upload className="w-5 h-5" />
            Ladda upp
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileSelect(e.target.files[0])}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files[0])}
            className="hidden"
          />
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          {imagePreview && (
            <div className="relative">
              <img src={imagePreview} alt="Kvitto" className="w-full max-h-64 object-contain rounded-lg" />
              {isScanning && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Belopp (kr) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Momsbelopp (kr)</label>
              <input
                type="number"
                step="0.01"
                value={formData.vatAmount}
                onChange={(e) => setFormData({ ...formData, vatAmount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Momssats</label>
              <select
                value={formData.vatRate}
                onChange={(e) => setFormData({ ...formData, vatRate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {vatRates.map(rate => (
                  <option key={rate} value={rate}>{rate}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dricks (kr)</label>
              <input
                type="number"
                step="0.01"
                value={formData.tipAmount}
                onChange={(e) => setFormData({ ...formData, tipAmount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leverantör *</label>
              <input
                type="text"
                value={formData.vendorName}
                onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Företagsnamn"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Org.nummer</label>
              <input
                type="text"
                value={formData.orgNumber}
                onChange={(e) => setFormData({ ...formData, orgNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="556677-8899"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {receiptCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Lista (valfritt)</label>
              <div className="flex gap-2">
                {showNewListInput ? (
                  <>
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ny lista..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newListName.trim()) {
                          setFormData({ ...formData, listName: newListName.trim() })
                          setLists([...lists, newListName.trim()])
                          setNewListName('')
                          setShowNewListInput(false)
                        }
                      }}
                    />
                    <button
                      onClick={() => setShowNewListInput(false)}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Avbryt
                    </button>
                  </>
                ) : (
                  <>
                    <select
                      value={formData.listName}
                      onChange={(e) => setFormData({ ...formData, listName: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Ingen lista</option>
                      {lists.map(list => (
                        <option key={list} value={list}>{list}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowNewListInput(true)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      + Ny lista
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivning</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="2"
                placeholder="Valfri beskrivning..."
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isScanning}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sparar...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Spara
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {isEditing && selectedReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Redigera kvitto</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <img src={selectedReceipt.image_url} alt="Kvitto" className="w-full max-h-64 object-contain rounded-lg mb-4" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Belopp (kr)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Momsbelopp (kr)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.vatAmount}
                  onChange={(e) => setFormData({ ...formData, vatAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Momssats</label>
                <select
                  value={formData.vatRate}
                  onChange={(e) => setFormData({ ...formData, vatRate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {vatRates.map(rate => (
                    <option key={rate} value={rate}>{rate}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dricks (kr)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tipAmount}
                  onChange={(e) => setFormData({ ...formData, tipAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leverantör</label>
                <input
                  type="text"
                  value={formData.vendorName}
                  onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Org.nummer</label>
                <input
                  type="text"
                  value={formData.orgNumber}
                  onChange={(e) => setFormData({ ...formData, orgNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {receiptCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Lista (valfritt)</label>
                <div className="flex gap-2">
                  {showNewListInput ? (
                    <>
                      <input
                        type="text"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ny lista..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newListName.trim()) {
                            setFormData({ ...formData, listName: newListName.trim() })
                            setLists([...lists, newListName.trim()])
                            setNewListName('')
                            setShowNewListInput(false)
                          }
                        }}
                      />
                      <button
                        onClick={() => setShowNewListInput(false)}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Avbryt
                      </button>
                    </>
                  ) : (
                    <>
                      <select
                        value={formData.listName}
                        onChange={(e) => setFormData({ ...formData, listName: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Ingen lista</option>
                        {lists.map(list => (
                          <option key={list} value={list}>{list}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setShowNewListInput(true)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                      >
                        + Ny lista
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivning</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                Spara ändringar
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List filter */}
      {lists.length > 0 && receipts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filtrera på lista</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedList('all')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedList === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alla ({receipts.length})
            </button>
            <button
              onClick={() => setSelectedList('no-list')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedList === 'no-list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Utan lista ({receipts.filter(r => !r.list_name).length})
            </button>
            {lists.map(list => (
              <button
                key={list}
                onClick={() => setSelectedList(list)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedList === list
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {list} ({receipts.filter(r => r.list_name === list).length})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Receipt list */}
      {receipts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              Sparade kvitton ({
                selectedList === 'all'
                  ? receipts.length
                  : selectedList === 'no-list'
                  ? receipts.filter(r => !r.list_name).length
                  : receipts.filter(r => r.list_name === selectedList).length
              })
            </h3>
            <div className="flex gap-2">
              <button
                onClick={selectAllReceipts}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                Välj alla
              </button>
              {selectedReceipts.length > 0 && (
                <button
                  onClick={deselectAllReceipts}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Avmarkera alla
                </button>
              )}
            </div>
          </div>

          {/* Gruppera och visa kvitton per månad */}
          {groupReceiptsByMonth(
            receipts.filter(receipt => {
              if (selectedList === 'all') return true
              if (selectedList === 'no-list') return !receipt.list_name
              return receipt.list_name === selectedList
            })
          ).map(({ month, receipts: monthReceipts, total, vatTotal, tipTotal }) => (
            <div key={month} className="space-y-2">
              {/* Månadsrubrik */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-800">{formatMonthName(month)}</h4>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{monthReceipts.length} kvitton</span>
                    <span className="mx-2">•</span>
                    <span className="font-bold text-gray-900">{total.toFixed(2)} kr</span>
                    {vatTotal > 0 && (
                      <span className="text-xs ml-2">(moms: {vatTotal.toFixed(2)} kr)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Kvitton för denna månad */}
              <div className="space-y-2">
                {monthReceipts.map(receipt => (
                  <div
                    key={receipt.id}
                    className={`bg-white border rounded-lg p-3 transition-all ${
                      selectedReceipts.includes(receipt.id)
                        ? 'border-blue-500 shadow-md'
                        : 'border-gray-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Checkbox */}
                      <div className="flex items-start pt-1">
                        <input
                          type="checkbox"
                          checked={selectedReceipts.includes(receipt.id)}
                          onChange={() => toggleReceiptSelection(receipt.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>

                      <img
                        src={receipt.image_url}
                        alt="Kvitto"
                        className="w-20 h-20 object-cover rounded cursor-pointer"
                        onClick={() => window.open(receipt.image_url, '_blank')}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{receipt.vendor_name}</p>
                            <p className="text-sm text-gray-600">{receipt.date}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-gray-500">{receipt.category}</p>
                              {receipt.list_name && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {receipt.list_name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">{receipt.amount} kr</p>
                            {receipt.vat_amount && (
                              <p className="text-sm text-gray-600">Moms: {receipt.vat_amount} kr</p>
                            )}
                            {receipt.tip_amount && (
                              <p className="text-sm text-gray-600">Dricks: {receipt.tip_amount} kr</p>
                            )}
                          </div>
                        </div>
                        {receipt.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{receipt.description}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleEdit(receipt)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            Redigera
                          </button>
                          <button
                            onClick={() => handleDelete(receipt)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Radera
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {receipts.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-500">
          <Camera className="w-16 h-16 mx-auto mb-3 opacity-50" />
          <p>Inga kvitton sparade än</p>
          <p className="text-sm">Ta ett foto eller ladda upp ett kvitto för att komma igång</p>
        </div>
      )}
    </div>
  )
}
