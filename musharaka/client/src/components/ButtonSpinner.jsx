/**
 * Inline button loading spinner.
 * Replaces an icon slot while keeping button width stable.
 *
 * Usage inside a button:
 *   <button disabled={loading} className="btn-primary">
 *     {loading ? <ButtonSpinner /> : <Save size={15} />}
 *     حفظ
 *   </button>
 */
export default function ButtonSpinner({ size = 14 }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="inline-block border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0"
    />
  )
}
