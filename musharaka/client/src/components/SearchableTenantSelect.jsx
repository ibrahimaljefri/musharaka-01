/**
 * SearchableTenantSelect — combobox for picking a tenant out of a long list.
 *
 * Built for the super-admin filter dropdowns on /admin/submissions and
 * /admin/cenomi-logs. Replaces the native <select> which becomes unworkable
 * past ~50 items. Virtualized via react-window so 1000+ tenants stay 60fps.
 *
 * Props:
 *   tenants     [{id, name, slug}, ...]
 *   value       selected id (string '' = "all tenants")
 *   onChange    (id: string) => void
 *   placeholder string  (defaults to "جميع المستأجرين")
 *   className   optional extra class on the trigger input
 *
 * Keyboard: ↓/↑ navigate, Enter select, Esc close, Tab close + commit highlight.
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import { FixedSizeList } from 'react-window'
import { ChevronDown, X, Search } from 'lucide-react'

const ITEM_HEIGHT  = 36
const MAX_VISIBLE  = 8
const ALL_OPTION   = { id: '', name: 'جميع المستأجرين', slug: '__all__' }

export default function SearchableTenantSelect({
  tenants = [],
  value = '',
  onChange,
  placeholder = 'جميع المستأجرين',
  className = 'cen-input',
}) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [highlight, setHighlight] = useState(0)
  const wrapRef   = useRef(null)
  const inputRef  = useRef(null)
  const listRef   = useRef(null)

  // Close on outside-click
  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  // Build the filtered + always-prepended-"all" list
  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? tenants.filter(t =>
          (t.name || '').toLowerCase().includes(q) ||
          (t.slug || '').toLowerCase().includes(q)
        )
      : tenants
    return [ALL_OPTION, ...filtered]
  }, [tenants, query])

  const selected = useMemo(
    () => tenants.find(t => t.id === value) || (value === '' ? ALL_OPTION : null),
    [tenants, value]
  )

  // Display value in the trigger when CLOSED — placeholder when nothing selected
  const triggerLabel = selected ? selected.name : placeholder

  function handleSelect(opt) {
    onChange?.(opt.id)
    setOpen(false)
    setQuery('')
    setHighlight(0)
  }

  function onKeyDown(e) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); e.preventDefault() }
      return
    }
    if (e.key === 'ArrowDown') { setHighlight(h => Math.min(h + 1, options.length - 1)); e.preventDefault() }
    else if (e.key === 'ArrowUp')   { setHighlight(h => Math.max(h - 1, 0)); e.preventDefault() }
    else if (e.key === 'Enter')     { if (options[highlight]) handleSelect(options[highlight]); e.preventDefault() }
    else if (e.key === 'Escape')    { setOpen(false); e.preventDefault() }
    else if (e.key === 'Tab')       { setOpen(false) }
  }

  // Keep the highlighted row in view inside the virtualized list
  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollToItem(highlight, 'smart')
  }, [highlight, open])

  // When opening, clear query and reset highlight to the currently-selected item
  useEffect(() => {
    if (open) {
      setQuery('')
      const idx = Math.max(0, options.findIndex(o => o.id === value))
      setHighlight(idx)
      // Defer focus to next tick so the input exists
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Virtualized row renderer
  const Row = ({ index, style }) => {
    const opt = options[index]
    const isSelected = opt.id === value
    const isHighlight = index === highlight
    return (
      <div
        style={{
          ...style,
          padding: '8px 12px',
          fontSize: 13,
          cursor: 'pointer',
          background: isHighlight ? 'rgba(184,134,11,0.10)' : (isSelected ? 'rgba(184,134,11,0.05)' : 'transparent'),
          color: isSelected ? '#B8860B' : 'var(--text)',
          fontWeight: isSelected ? 600 : 400,
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: index === 0 && opt.id === '' ? '1px solid var(--border)' : 'none',
        }}
        onMouseEnter={() => setHighlight(index)}
        onMouseDown={(e) => { e.preventDefault(); handleSelect(opt) }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {opt.name}
        </span>
        {opt.slug && opt.slug !== '__all__' && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{opt.slug}</span>
        )}
      </div>
    )
  }

  const listHeight = Math.min(options.length * ITEM_HEIGHT, MAX_VISIBLE * ITEM_HEIGHT)
  const showClear  = !!value && !open

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex', flex: '1 1 240px', minWidth: 200 }}>
      {/* Trigger / input combo */}
      {open ? (
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', insetInlineStart: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            className={className}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setHighlight(0) }}
            onKeyDown={onKeyDown}
            placeholder="ابحث عن مستأجر…"
            dir="rtl"
            style={{ width: '100%', paddingInlineStart: 32 }}
            autoComplete="off"
          />
        </div>
      ) : (
        <button
          type="button"
          className={className}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          dir="rtl"
          style={{
            flex: 1, textAlign: 'start', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            color: selected && selected.id !== '' ? 'var(--text)' : 'var(--text-muted)',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{triggerLabel}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
            {showClear && (
              <X size={12}
                onClick={(e) => { e.stopPropagation(); onChange?.('') }}
                style={{ cursor: 'pointer', opacity: 0.6 }}
                title="مسح"
              />
            )}
            <ChevronDown size={14} />
          </span>
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%', insetInlineStart: 0, insetInlineEnd: 0,
            marginTop: 4,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              لا يوجد مستأجرون مطابقون
            </div>
          ) : (
            <>
              <FixedSizeList
                ref={listRef}
                height={listHeight}
                itemCount={options.length}
                itemSize={ITEM_HEIGHT}
                width="100%"
              >
                {Row}
              </FixedSizeList>
              {tenants.length > 50 && (
                <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--text-muted)',
                              borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                  {options.length - 1} من أصل {tenants.length} مستأجر
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
