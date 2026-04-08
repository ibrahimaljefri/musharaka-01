const colorMap = {
  green:  {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/60',
    border: 'border-emerald-200',
    text: 'text-emerald-600',
    val: 'text-emerald-900',
    icon: 'bg-emerald-100 kpi-glow-green',
  },
  pink:   {
    bg: 'bg-gradient-to-br from-pink-50 to-pink-100/60',
    border: 'border-pink-200',
    text: 'text-pink-600',
    val: 'text-pink-900',
    icon: 'bg-pink-100 kpi-glow-pink',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100/60',
    border: 'border-purple-200',
    text: 'text-purple-600',
    val: 'text-purple-900',
    icon: 'bg-purple-100 kpi-glow-purple',
  },
  cyan:   {
    bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100/60',
    border: 'border-cyan-200',
    text: 'text-cyan-600',
    val: 'text-cyan-900',
    icon: 'bg-cyan-100 kpi-glow-cyan',
  },
  yellow: {
    bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100/60',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    val: 'text-yellow-900',
    icon: 'bg-yellow-100 kpi-glow-yellow',
  },
}

export default function KpiCard({ title, value, subtitle, color = 'green', icon: Icon }) {
  const c = colorMap[color] || colorMap.green
  return (
    <div className={`rounded-xl border p-5 hover-lift ${c.bg} ${c.border}`}>
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
    </div>
  )
}
