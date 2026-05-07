import { BarChart3 } from 'lucide-react'

/**
 * EmptyChart — placeholder shown inside a chart card when there's no data
 * to plot yet. Keeps the dashboard layout balanced day-1 instead of hiding
 * the entire card.
 */
export default function EmptyChart({ message, height = 240 }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500"
      style={{ height: `${height}px` }}
    >
      <BarChart3 size={36} className="opacity-40 mb-2" aria-hidden="true" />
      <p className="font-arabic text-xs leading-relaxed max-w-xs px-4">
        {message || 'لا توجد بيانات بعد لعرضها.'}
      </p>
    </div>
  )
}
