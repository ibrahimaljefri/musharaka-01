import { TrendingUp, TrendingDown } from 'lucide-react'

const colorMap = {
  green:  {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-green-900/30 dark:to-emerald-800/30 dark:bg-gray-800/50',
    border: 'border-emerald-200 dark:border-emerald-700/50',
    text: 'text-emerald-600 dark:text-green-300',
    val: 'text-emerald-900 dark:text-green-300',
    icon: 'bg-emerald-100 dark:bg-green-900/30 kpi-glow-green',
  },
  pink:   {
    bg: 'bg-gradient-to-br from-pink-50 to-pink-100/60 dark:from-pink-900/30 dark:to-rose-800/30 dark:bg-gray-800/50',
    border: 'border-pink-200 dark:border-pink-700/50',
    text: 'text-pink-600 dark:text-pink-300',
    val: 'text-pink-900 dark:text-pink-300',
    icon: 'bg-pink-100 dark:bg-pink-900/30 kpi-glow-pink',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100/60 dark:from-purple-900/30 dark:to-violet-800/30 dark:bg-gray-800/50',
    border: 'border-purple-200 dark:border-purple-700/50',
    text: 'text-purple-600 dark:text-purple-300',
    val: 'text-purple-900 dark:text-purple-300',
    icon: 'bg-purple-100 dark:bg-purple-900/30 kpi-glow-purple',
  },
  cyan:   {
    bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100/60 dark:from-cyan-900/30 dark:to-sky-800/30 dark:bg-gray-800/50',
    border: 'border-cyan-200 dark:border-cyan-700/50',
    text: 'text-cyan-600 dark:text-cyan-300',
    val: 'text-cyan-900 dark:text-cyan-300',
    icon: 'bg-cyan-100 dark:bg-cyan-900/30 kpi-glow-cyan',
  },
  yellow: {
    bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100/60 dark:from-yellow-900/30 dark:to-amber-800/30 dark:bg-gray-800/50',
    border: 'border-yellow-200 dark:border-yellow-700/50',
    text: 'text-yellow-700 dark:text-yellow-300',
    val: 'text-yellow-900 dark:text-yellow-300',
    icon: 'bg-yellow-100 dark:bg-yellow-900/30 kpi-glow-yellow',
  },
}

export default function KpiCard({ title, value, subtitle, color = 'green', icon: Icon, trend }) {
  const c = colorMap[color] || colorMap.green
  return (
    <div data-testid="kpi-card" className={`rounded-xl border p-5 hover-lift ${c.bg} ${c.border}`}>
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-semibold font-arabic uppercase tracking-wide ${c.text}`}>{title}</span>
        {Icon && (
          <div className={`p-2 rounded-lg ${c.icon}`}>
            <Icon size={16} className={c.text} />
          </div>
        )}
      </div>
      <div className={`text-2xl font-bold font-arabic ${c.val}`}>{value}</div>
      {subtitle && <div className={`text-xs mt-1.5 font-arabic ${c.text} opacity-80`}>{subtitle}</div>}
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trend.dir === 'up' ? (
            <>
              <TrendingUp size={11} className="text-green-500" />
              <span className="text-xs text-green-600 dark:text-green-400 font-arabic">{trend.value}% مقارنة بالشهر الماضي</span>
            </>
          ) : (
            <>
              <TrendingDown size={11} className="text-red-400" />
              <span className="text-xs text-red-500 dark:text-red-400 font-arabic">{trend.value}% مقارنة بالشهر الماضي</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
