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
/** Arabic labels are now used directly as the stored value */
export const CATEGORY_LABELS = {
  // New Arabic-value categories
  'مبيعات':    'مبيعات',
  'فروع':      'فروع',
  'مستخدمون': 'مستخدمون',
  'ترخيص':    'ترخيص',
  'تقني':     'تقني',
  'أخرى':     'أخرى',
  // Legacy English-key categories (backward compat)
  integration: 'تكامل',
  license:     'ترخيص',
  technical:   'تقني',
  reporting:   'تقارير',
}
export const CATEGORY_COLORS = {
  // New Arabic-value categories
  'مبيعات':    'bg-green-100 text-green-700',
  'فروع':      'bg-purple-100 text-purple-700',
  'مستخدمون': 'bg-cyan-100 text-cyan-700',
  'ترخيص':    'bg-yellow-100 text-yellow-800',
  'تقني':     'bg-blue-100 text-blue-700',
  'أخرى':     'bg-gray-100 text-gray-600',
  // Legacy English-key categories (backward compat)
  integration: 'bg-purple-100 text-purple-700',
  license:     'bg-yellow-100 text-yellow-800',
  technical:   'bg-blue-100 text-blue-700',
  reporting:   'bg-teal-100 text-teal-700',
}

export function fmtTicketDate(d, withTime = false) {
  if (!d) return '—'
  return withTime
    ? new Date(d).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
}
