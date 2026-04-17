/**
 * Module-level toast store.
 * Usage: import { toast } from '../lib/useToast'
 *   toast.success('تم الحفظ')
 *   toast.error('حدث خطأ')
 *   toast.warning('تحقق من البيانات')
 *   toast.info('معلومة مهمة')
 */

let _dispatch = null

export function _registerDispatch(fn) {
  _dispatch = fn
}

let _id = 0

function show(type, message, duration) {
  if (!_dispatch) return
  const durations = { success: 4000, error: 6000, warning: 5000, info: 5000 }
  _dispatch({
    id: ++_id,
    type,
    message,
    duration: duration ?? durations[type] ?? 4000,
  })
}

export const toast = {
  success: (message, duration) => show('success', message, duration),
  error:   (message, duration) => show('error',   message, duration),
  warning: (message, duration) => show('warning', message, duration),
  info:    (message, duration) => show('info',    message, duration),
}
