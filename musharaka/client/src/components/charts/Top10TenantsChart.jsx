import BarChart from './BarChart'
import EmptyChart from './EmptyChart'

export default function Top10TenantsChart({ branches_per_tenant }) {
  const data = Object.entries(branches_per_tenant || {})
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  return (
    <div className="card-surface p-4">
      <h3 className="font-bold text-gray-800 dark:text-gray-100 font-arabic text-sm mb-3">
        أعلى 10 عملاء (عدد الفروع)
      </h3>
      {data.length === 0
        ? <EmptyChart message="لا يوجد عملاء لعرضهم بعد. أضف مستأجرين وفروعاً لرؤية البيانات هنا." height={340} />
        : <BarChart data={data} title="أعلى 10 عملاء" height={340} maxItems={10} />}
    </div>
  )
}
