import BarChart from './BarChart'
import EmptyChart from './EmptyChart'

export default function UsersPerTenantChart({ users_per_tenant }) {
  const data = Object.entries(users_per_tenant || {})
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="card-surface p-4">
      <h3 className="font-bold text-gray-800 dark:text-gray-100 font-arabic text-sm mb-3">
        المستخدمون لكل مستأجر
      </h3>
      {data.length === 0
        ? <EmptyChart message="لا يوجد مستخدمون مرتبطون بمستأجر بعد." height={240} />
        : <BarChart
            data={data}
            title="المستخدمون لكل مستأجر"
            height={Math.max(200, data.length * 32 + 40)}
          />}
    </div>
  )
}
