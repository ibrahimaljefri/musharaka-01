const colors = [
  'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700', 'bg-teal-100 text-teal-700',
  'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700',
]

export default function BranchBadge({ code }) {
  const idx = code ? code.charCodeAt(0) % colors.length : 0
  return (
    <span data-testid="branch-badge" className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-arabic ${colors[idx]}`}>
      {code}
    </span>
  )
}
