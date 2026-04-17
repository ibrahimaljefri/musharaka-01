import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

/**
 * Unified page header used across all app pages.
 *
 * Props:
 *   title      {string}        — Required. Page title
 *   subtitle   {string}        — Optional. Muted sub-text
 *   icon       {LucideIcon}    — Optional. Icon shown before title
 *   action     {ReactNode}     — Optional. Slot for primary action button
 *   backTo     {string}        — Optional. Path to navigate back to
 *   backLabel  {string}        — Optional. Label for back button (default: "رجوع")
 */
export default function PageHeader({ title, subtitle, icon: Icon, action, backTo, backLabel = 'رجوع' }) {
  const navigate = useNavigate()

  return (
    <div className="flex items-start justify-between gap-4 mb-6" dir="rtl">
      <div className="flex items-center gap-3 min-w-0">
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors font-arabic flex-shrink-0"
          >
            <ArrowRight size={15} />
            {backLabel}
          </button>
        )}
        {Icon && <Icon size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" />}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 font-arabic truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 font-arabic mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
