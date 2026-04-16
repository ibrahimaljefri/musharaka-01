import BarChart from './BarChart'

export default function SubscriptionStatusChart({ subscriptions }) {
  if (!subscriptions) return null

  const data = [
    { label: '0 – 3 أشهر',   value: subscriptions.expiring_3m       || 0 },
    { label: '4 – 6 أشهر',   value: subscriptions.expiring_6m       || 0 },
    { label: '7 – 11 شهراً', value: subscriptions.expiring_11m      || 0 },
    { label: '+12 شهراً',     value: subscriptions.expiring_12m_plus || 0 },
    { label: 'مفتوح',         value: subscriptions.no_expiry         || 0 },
  ]

  return (
    <div className="card-surface p-4">
      <h3 className="font-bold text-gray-800 dark:text-gray-100 font-arabic text-sm mb-3">
        حالة الاشتراكات
      </h3>
      <BarChart data={data} title="حالة الاشتراكات" height={220} />
    </div>
  )
}
