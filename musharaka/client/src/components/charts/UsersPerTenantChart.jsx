import BarChart from './BarChart'

export default function UsersPerTenantChart({ users_per_tenant }) {
  if (!users_per_tenant) return null

  const data = Object.entries(users_per_tenant)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) return null

  return (
    <div className="card-surface p-4">
      <h3 className="font-bold text-gray-800 dark:text-gray-100 font-arabic text-sm mb-3">
        المستخدمون لكل مستأجر
      </h3>
      <BarChart
        data={data}
        title="المستخدمون لكل مستأجر"
        height={Math.max(200, data.length * 32 + 40)}
      />
    </div>
  )
}
