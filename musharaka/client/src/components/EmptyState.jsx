/**
 * EmptyState — reusable empty-state block with icon, title, description and optional CTA.
 *
 * Usage:
 *   <EmptyState
 *     icon={Building2}
 *     title="لا توجد فروع بعد"
 *     description="أضف فرعاً جديداً للبدء في مشاركة البيانات"
 *     action={<Link to="/branches/create">...</Link>}
 *   />
 */
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="py-16 flex flex-col items-center text-center">
      {/* Decorated icon container */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-50 to-amber-100
                      border border-yellow-200 flex items-center justify-center mb-4 shadow-sm">
        <Icon size={28} className="text-yellow-500" />
      </div>

      {/* Text */}
      <h3 className="text-gray-700 font-semibold font-arabic mb-1 text-sm">{title}</h3>
      {description && (
        <p className="text-gray-400 text-xs font-arabic max-w-xs leading-relaxed mb-5">{description}</p>
      )}

      {/* Optional CTA */}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
