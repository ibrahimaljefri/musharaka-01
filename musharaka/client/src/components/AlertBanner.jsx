import { CheckCircle, AlertCircle, AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'

const configs = {
  success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', Icon: CheckCircle },
  error:   { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-700',   Icon: AlertCircle  },
  warning: { bg: 'bg-yellow-50',border: 'border-yellow-200',text: 'text-yellow-700',Icon: AlertTriangle },
}

export default function AlertBanner({ type = 'success', message, dismissible = true }) {
  const [visible, setVisible] = useState(true)
  if (!visible || !message) return null
  const { bg, border, text, Icon } = configs[type] || configs.success
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border mb-4 ${bg} ${border}`}>
      <Icon size={16} className={`${text} mt-0.5 flex-shrink-0`} />
      <span className={`text-sm font-arabic flex-1 ${text}`}>{message}</span>
      {dismissible && (
        <button onClick={() => setVisible(false)} className={`${text} opacity-60 hover:opacity-100`}>
          <X size={14} />
        </button>
      )}
    </div>
  )
}
