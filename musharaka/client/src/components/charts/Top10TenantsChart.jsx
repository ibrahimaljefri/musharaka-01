import BarChart from './BarChart'

export default function Top10TenantsChart({ branches_per_tenant }) {
  if (!branches_per_tenant) return null

  const data = Object.entries(branches_per_tenant)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  if (data.length === 0) return null

  return (
    <div className="card-surface p-4">
      <h3 className="font-bold text-gray-800 dark:text-gray-100 font-arabic text-sm mb-3">
        أعلى 10 عملاء (عدد الفروع)
      </h3>
      <BarChart data={data} title="أعلى 10 عملاء" height={340} maxItems={10} />
    </div>
  )
}
