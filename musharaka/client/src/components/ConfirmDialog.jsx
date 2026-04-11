import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger = true }) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-full ${danger ? 'bg-red-50' : 'bg-yellow-50'}`}>
            <AlertTriangle size={20} className={danger ? 'text-red-500' : 'text-yellow-500'} />
          </div>
          <h2 className="text-base font-semibold text-gray-800 font-arabic">{title}</h2>
        </div>
        <p className="text-sm text-gray-600 font-arabic mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-arabic"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors font-arabic ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-600 hover:bg-yellow-700'}`}
          >
            تأكيد
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
