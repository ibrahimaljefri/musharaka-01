/**
 * Label + input slot + error/hint wrapper for form fields.
 *
 * Usage:
 *   <FormField label="الفرع" error={errors.branch} required>
 *     <select className="input-base" ...>...</select>
 *   </FormField>
 *
 * Props:
 *   label     {string}    — Field label text
 *   error     {string}    — Error message (shown in red below input)
 *   hint      {string}    — Helper text (shown in gray below input)
 *   required  {boolean}   — Adds red asterisk to label
 *   children  {ReactNode} — The input/select/textarea element
 *   className {string}    — Extra wrapper classes
 */
export default function FormField({ label, error, hint, required, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`} dir="rtl">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 font-arabic flex items-center gap-1">
          {label}
          {required && <span className="text-red-500 text-xs">*</span>}
        </label>
      )}

      {children}

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 font-arabic mt-0.5" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="text-xs text-gray-400 dark:text-gray-500 font-arabic mt-0.5">{hint}</p>
      )}
    </div>
  )
}
