/**
 * Skeleton loader components.
 *
 * Usage:
 *   <TableSkeleton rows={5} cols={6} />   — shimmer table placeholder
 *   <KpiSkeleton count={4} />             — shimmer KPI card row
 */

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/60">
      {/* thead placeholder */}
      <div className="bg-gray-50/80 dark:bg-gray-800/60 px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton h-3 rounded flex-1" />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex gap-4 px-4 py-3.5 border-b border-gray-50 dark:border-gray-700/40 last:border-0"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="skeleton h-3 rounded flex-1"
              style={{ opacity: 1 - c * 0.06 }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function KpiSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="card-surface p-4 rounded-2xl flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-8 w-8 rounded-lg" />
          </div>
          <div className="skeleton h-7 w-24 rounded" />
          <div className="skeleton h-2.5 w-16 rounded" />
        </div>
      ))}
    </div>
  )
}

/** Default export for convenience if you just want a generic shimmer block */
export default function SkeletonBlock({ className = 'h-4 rounded' }) {
  return <div className={`skeleton ${className}`} />
}
