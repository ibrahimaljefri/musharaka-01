/**
 * TenantBadge — displays a primary name + optional secondary text inline.
 * Used in:
 *   - Tenants list (name + commercial_registration)
 *   - BotSubscribers list (tenant_name + branch contract_number)
 */
export default function TenantBadge({ name, subtext }) {
  return (
    <div className="inline-flex flex-col leading-tight">
      <span className="text-sm font-semibold text-gray-800 font-arabic">{name}</span>
      {subtext && (
        <span className="text-xs text-gray-400 font-mono mt-0.5">{subtext}</span>
      )}
    </div>
  )
}
