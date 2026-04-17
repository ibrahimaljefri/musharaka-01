import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { _registerDispatch } from '../lib/useToast'

const VARIANTS = {
  success: {
    icon: CheckCircle,
    bar:  'bg-green-400',
    bg:   'bg-white dark:bg-gray-800 border-green-400',
    text: 'text-green-700 dark:text-green-300',
    ring: 'ring-green-100 dark:ring-green-900/40',
  },
  error: {
    icon: AlertCircle,
    bar:  'bg-red-400',
    bg:   'bg-white dark:bg-gray-800 border-red-400',
    text: 'text-red-700 dark:text-red-300',
    ring: 'ring-red-100 dark:ring-red-900/40',
  },
  warning: {
    icon: AlertTriangle,
    bar:  'bg-amber-400',
    bg:   'bg-white dark:bg-gray-800 border-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-100 dark:ring-amber-900/40',
  },
  info: {
    icon: Info,
    bar:  'bg-blue-400',
    bg:   'bg-white dark:bg-gray-800 border-blue-400',
    text: 'text-blue-700 dark:text-blue-300',
    ring: 'ring-blue-100 dark:ring-blue-900/40',
  },
}

function ToastItem({ item, onRemove }) {
  const [exiting, setExiting] = useState(false)
  const v = VARIANTS[item.type] || VARIANTS.info
  const Icon = v.icon

  const dismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => onRemove(item.id), 200)
  }, [item.id, onRemove])

  useEffect(() => {
    const timer = setTimeout(dismiss, item.duration)
    return () => clearTimeout(timer)
  }, [dismiss, item.duration])

  return (
    <div
      dir="rtl"
      style={{
        animation: exiting
          ? 'toastOut 0.2s ease-in forwards'
          : 'toastIn 0.2s ease-out forwards',
      }}
      className={`relative flex items-start gap-3 p-3 pr-4 rounded-xl border shadow-lg ring-1 max-w-xs w-full ${v.bg} ${v.ring} overflow-hidden`}
    >
      {/* progress bar */}
      <span
        className={`absolute bottom-0 right-0 h-0.5 ${v.bar} rounded-full`}
        style={{ animation: `toastProgress ${item.duration}ms linear forwards` }}
      />

      <Icon size={18} className={`${v.text} mt-0.5 flex-shrink-0`} />
      <p className={`text-sm font-arabic flex-1 leading-snug ${v.text}`}>{item.message}</p>
      <button
        onClick={dismiss}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0 -mt-0.5"
        aria-label="إغلاق"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default function ToastProvider() {
  const [toasts, setToasts] = useState([])

  const add = useCallback((item) => {
    setToasts(prev => {
      const next = [...prev, item]
      // cap at 4 visible
      return next.length > 4 ? next.slice(next.length - 4) : next
    })
  }, [])

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    _registerDispatch(add)
    return () => _registerDispatch(null)
  }, [add])

  if (toasts.length === 0) return null

  return createPortal(
    <div
      className="fixed bottom-5 left-5 z-[9999] flex flex-col gap-2 items-start"
      aria-live="polite"
      aria-label="الإشعارات"
    >
      {toasts.map(t => (
        <ToastItem key={t.id} item={t} onRemove={remove} />
      ))}
    </div>,
    document.body
  )
}
