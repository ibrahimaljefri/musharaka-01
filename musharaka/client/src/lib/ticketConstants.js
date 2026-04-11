export const STATUS_LABELS = { new: 'جديد', in_progress: 'قيد المعالجة', resolved: 'محلول' }
export const STATUS_COLORS = {
  new:         'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved:    'bg-green-100 text-green-700',
}
export const STATUS_OPTIONS = [
  { v: 'new',         l: 'جديد' },
  { v: 'in_progress', l: 'قيد المعالجة' },
  { v: 'resolved',    l: 'محلول' },
]
export const CATEGORY_LABELS = { integration: 'تكامل', license: 'ترخيص', technical: 'تقني', reporting: 'تقارير' }
export const CATEGORY_COLORS = {
  integration: 'bg-purple-100 text-purple-700',
  license:     'bg-blue-100 text-blue-700',
  technical:   'bg-orange-100 text-orange-700',
  reporting:   'bg-teal-100 text-teal-700',
}

export function fmtTicketDate(d, withTime = false) {
  if (!d) return '—'
  return withTime
    ? new Date(d).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
}
