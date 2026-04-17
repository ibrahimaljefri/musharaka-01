import { CheckCircle, AlertCircle, AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'

const configs = {
  success: { bg: 'bg-green-50 dark:bg-green-900/20',   border: 'border-green-200 dark:border-green-700/50',   text: 'text-green-700 dark:text-green-300',   Icon: CheckCircle },
  error:   { bg: 'bg-red-50 dark:bg-red-900/20',       border: 'border-red-200 dark:border-red-700/50',       text: 'text-red-700 dark:text-red-300',       Icon: AlertCircle  },
  warning: { bg: 'bg-yellow-50 dark:bg-amber-900/20',  border: 'border-yellow-200 dark:border-amber-700/50',  text: 'text-yellow-700 dark:text-amber-300',  Icon: AlertTriangle },
  info:    { bg: 'bg-blue-50 dark:bg-blue-900/20',     border: 'border-blue-200 dark:border-blue-700/50',     text: 'text-blue-700 dark:text-blue-300',     Icon: AlertCircle  },
}

export default function AlertBanner({ type = 'success', message, dismissible = true, onClose }) {
  const [visible, setVisible] = useState(true)

  if (!visible || !message) return null

  const { bg, border, text, Icon } = configs[type] || configs.success

  const handleDismiss = () => {
    setVisible(false)
    onClose?.()
  }

  return (
    <div
      style={{ animation: 'slideDown 0.2s ease-out' }}
      className={`flex items-start gap-3 p-3 rounded-lg border mb-4 ${bg} ${border}`}
    >
      <Icon size={16} className={`${text} mt-0.5 flex-shrink-0`} />
      <span className={`text-sm font-arabic flex-1 ${text}`}>{message}</span>
      {dismissible && (
        <button onClick={handleDismiss} className={`${text} opacity-60 hover:opacity-100`}>
          <X size={14} />
        </button>
      )}
    </div>
  )
}
