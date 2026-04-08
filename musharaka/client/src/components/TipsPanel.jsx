import { Lightbulb } from 'lucide-react'

export default function TipsPanel({ tips = [] }) {
  return (
    <div
      className="rounded-xl border border-yellow-200 p-4 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #fffbeb 0%, #fef9c3 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(202,138,4,0.08)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-yellow-100 rounded-lg">
          <Lightbulb size={14} className="text-yellow-600" />
        </div>
        <span className="text-sm font-bold text-yellow-800 font-arabic">تلميحات</span>
      </div>
      <ul className="space-y-2.5">
        {tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-yellow-700 font-arabic leading-relaxed">
            <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-yellow-200 text-yellow-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
