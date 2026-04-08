/**
 * TenantBadge — displays tenant name + optional contract number inline.
 * Used in: Tenants list, BotSubscribers list, bot confirmation replies.
 */
export default function TenantBadge({ name, contractNumber }) {
  return (
    <div className="inline-flex flex-col leading-tight">
      <span className="text-sm font-semibold text-gray-800 font-arabic">{name}</span>
      {contractNumber && (
        <span className="text-xs text-gray-400 font-mono mt-0.5">{contractNumber}</span>
      )}
    </div>
  )
}
