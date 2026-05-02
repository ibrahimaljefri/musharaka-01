/**
 * SaleRecentList — self-contained "آخر المبيعات" table.
 *
 * Props:
 *   branchId    — pre-filter to this branch (optional; '' = all)
 *   refreshTick — increment from parent after a successful save to refetch
 */
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
  DndContext, closestCenter,
  PointerSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import api from '../lib/axiosClient'
import { toast } from '../lib/useToast'
import { useSortable as useTableSort } from '../lib/useSortable'
import BranchBadge from './BranchBadge'
import ConfirmDialog from './ConfirmDialog'
import { TableSkeleton } from './SkeletonLoader'
import { Lock, Trash2, RefreshCw, GripHorizontal } from 'lucide-react'

// ── Column definitions ─────────────────────────────────────────────────────
const DEFAULT_COL_ORDER = ['branch_code', 'invoice_number', 'amount', 'sale_date', 'status']
const COL_LS_KEY = 'srl_col_order'

const COL_META = {
  branch_code:    { label: 'الفرع' },
  invoice_number: { label: 'رقم الفاتورة' },
  amount:         { label: 'المبلغ' },
  sale_date:      { label: 'التاريخ' },
  status:         { label: 'الحالة' },
}

function loadColOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(COL_LS_KEY) || 'null')
    if (
      Array.isArray(saved) &&
      saved.length === DEFAULT_COL_ORDER.length &&
      saved.every(k => DEFAULT_COL_ORDER.includes(k))
    ) return saved
  } catch {}
  return [...DEFAULT_COL_ORDER]
}

// ── Draggable column header ────────────────────────────────────────────────
function DraggableColTh({ id, label, sortKey, sortDir, onToggle }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    position: 'relative',
    zIndex: isDragging ? 20 : undefined,
  }

  const active = sortKey === id

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`srl-th-col${isDragging ? ' srl-col-dragging' : ''}`}
    >
      {/* Sort click area */}
      <span
        className="srl-th-sort-area"
        onClick={() => onToggle(id)}
        role="button"
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggle(id)}
        aria-label={`ترتيب حسب ${label}`}
      >
        {label}
        <span className={`srl-sort-arrow${active ? ' srl-sort-active' : ''}`}>
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </span>

      {/* Drag handle */}
      <span
        className="srl-col-drag-handle"
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
        title="اسحب لإعادة الترتيب"
        aria-label="اسحب لإعادة ترتيب العمود"
      >
        <GripHorizontal size={11} />
      </span>
    </th>
  )
}

// ── Cell renderer ──────────────────────────────────────────────────────────
function renderCell(s, colKey) {
  switch (colKey) {
    case 'branch_code':
      return s._branch
        ? <BranchBadge code={s._branch.code || '—'} />
        : <span className="srl-muted">—</span>
    case 'invoice_number':
      return <span className="srl-mono">{s.invoice_number || '—'}</span>
    case 'amount':
      return <span className="srl-mono" dir="ltr">{fmt(s.amount)} ر.س</span>
    case 'sale_date':
      return fmtDate(s.sale_date)
    case 'status':
      return (
        <span className={`srl-status ${s.status === 'sent' ? 'srl-sent' : 'srl-pending'}`}>
          {statusLabel(s.status)}
        </span>
      )
    default:
      return '—'
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
const MONTHS_AR = [
  'يناير','فبراير','مارس','أبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر',
]

const PAGE_SIZE = 20

function fmt(n) {
  return Number(n || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return iso }
}
function statusLabel(s) {
  if (s === 'sent')    return 'مُرسل'
  if (s === 'pending') return 'معلّق'
  return s || '—'
}

// ── Main component ─────────────────────────────────────────────────────────
export default function SaleRecentList({ branchId = '', refreshTick = 0 }) {
  const [rows, setRows]         = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading]   = useState(true)
  const [deleteId, setDeleteId] = useState(null)
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [page, setPage]         = useState(0)

  // Column order (draggable)
  const [colOrder, setColOrder] = useState(loadColOrder)

  // Filters
  const [filterBranch, setFilterBranch] = useState(branchId)
  const [filterYear,   setFilterYear]   = useState(new Date().getFullYear())
  const [filterMonth,  setFilterMonth]  = useState('')

  // Multi-select (Set of IDs)
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Ref for indeterminate state on the "select-all" checkbox
  const selectAllRef = useRef(null)

  // When the form's selected branch changes, mirror it in the filter
  useEffect(() => {
    setFilterBranch(branchId)
    setPage(0)
  }, [branchId])

  // Reload on refreshTick (includes initial mount)
  useEffect(() => {
    setPage(0)
    load()
  }, [refreshTick]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset page + clear selection on any filter change
  useEffect(() => {
    setPage(0)
    setSelectedIds(new Set())
  }, [filterBranch, filterYear, filterMonth])

  async function load() {
    setLoading(true)
    try {
      const [salesRes, branchRes] = await Promise.all([
        api.get('/sales', { params: { limit: 5000 } }),
        api.get('/branches'),
      ])
      setRows(salesRes.data?.sales || [])
      setBranches(Array.isArray(branchRes.data) ? branchRes.data : (branchRes.data?.branches || []))
    } catch {
      setRows([])
    }
    setLoading(false)
  }

  // ── Single delete ──────────────────────────────────────────────────────
  async function handleDelete() {
    try {
      await api.delete(`/sales/${deleteId}`)
      setDeleteId(null)
      toast.success('تم حذف السجل بنجاح')
      load()
    } catch (err) {
      setDeleteId(null)
      toast.error(err.response?.data?.error || 'لا يمكن حذف هذا السجل')
    }
  }

  // ── Bulk delete ────────────────────────────────────────────────────────
  async function handleBulkDelete() {
    setBulkConfirm(false)
    const ids = [...selectedIds]
    let failed = 0
    await Promise.all(
      ids.map(id =>
        api.delete(`/sales/${id}`).catch(() => { failed++ }),
      ),
    )
    const deleted = ids.length - failed
    if (deleted > 0) toast.success(`تم حذف ${deleted} سجل بنجاح`)
    if (failed > 0)  toast.error(`لم يمكن حذف ${failed} سجل (محمية أو خطأ)`)
    setSelectedIds(new Set())
    load()
  }

  // ── Column drag-and-drop ───────────────────────────────────────────────
  const colSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleColDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setColOrder(prev => {
      const next = arrayMove(prev, prev.indexOf(active.id), prev.indexOf(over.id))
      localStorage.setItem(COL_LS_KEY, JSON.stringify(next))
      return next
    })
  }

  // ── Filter pipeline ────────────────────────────────────────────────────
  const availableYears = useMemo(() => {
    const ySet = new Set([new Date().getFullYear()])
    for (const r of rows) {
      if (r.sale_date) ySet.add(new Date(r.sale_date).getFullYear())
    }
    return [...ySet].sort((a, b) => b - a)
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filterBranch && r.branch_id !== filterBranch) return false
      if (!r.sale_date) return true
      const d = new Date(r.sale_date)
      if (filterYear && d.getFullYear() !== Number(filterYear)) return false
      if (filterMonth && d.getMonth() + 1 !== Number(filterMonth)) return false
      return true
    })
  }, [rows, filterBranch, filterYear, filterMonth])

  const enriched = useMemo(() => {
    const bMap = new Map(branches.map(b => [b.id, b]))
    return filtered.map(r => {
      const b = bMap.get(r.branch_id)
      return { ...r, _branch: b ? { code: b.code, name: b.name } : null }
    })
  }, [filtered, branches])

  const getter = useCallback((row, key) => {
    if (key === 'branch_code') return row._branch?.code || ''
    if (key === 'amount')      return parseFloat(row.amount || 0)
    return row?.[key]
  }, [])

  const { sorted, sortKey, sortDir, toggle } = useTableSort(enriched, 'sale_date', 'desc', getter)

  const totalRows  = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const paged      = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const monthTotal = useMemo(() => {
    if (!filterMonth) return null
    return filtered.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
  }, [filtered, filterMonth])

  // ── Selection helpers ──────────────────────────────────────────────────
  const deletableFiltered = useMemo(
    () => sorted.filter(s => s.status !== 'sent'),
    [sorted],
  )
  const selectedCount = selectedIds.size
  const allSelected   = deletableFiltered.length > 0 && deletableFiltered.every(s => selectedIds.has(s.id))
  const someSelected  = !allSelected && deletableFiltered.some(s => selectedIds.has(s.id))

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected
  }, [someSelected])

  function toggleRow(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected || someSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        deletableFiltered.forEach(s => next.delete(s.id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        deletableFiltered.forEach(s => next.add(s.id))
        return next
      })
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="srl-wrap">
      {/* Header */}
      <div className="srl-header">
        <div>
          <h2 className="srl-title">آخر المبيعات</h2>
          {monthTotal !== null && (
            <div className="srl-subtitle">
              إجمالي {MONTHS_AR[Number(filterMonth) - 1]}: <strong>{fmt(monthTotal)} ر.س</strong>
              {' '}— {totalRows} سجل
            </div>
          )}
          {monthTotal === null && totalRows > 0 && (
            <div className="srl-subtitle">{totalRows} سجل</div>
          )}
        </div>
        <button
          type="button"
          className="srl-refresh-btn"
          onClick={load}
          title="تحديث"
          aria-label="تحديث القائمة"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Filters */}
      <div className="srl-filters">
        <label className="srl-filter-label">الفرع:</label>
        <select
          value={filterBranch}
          onChange={e => setFilterBranch(e.target.value)}
          className="srl-select"
        >
          <option value="">جميع الفروع</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
          ))}
        </select>

        <label className="srl-filter-label">السنة:</label>
        <select
          value={filterYear}
          onChange={e => setFilterYear(e.target.value)}
          className="srl-select"
        >
          <option value="">الكل</option>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <label className="srl-filter-label">الشهر:</label>
        <select
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="srl-select"
        >
          <option value="">جميع الشهور</option>
          {MONTHS_AR.map((name, i) => (
            <option key={i + 1} value={i + 1}>{name}</option>
          ))}
        </select>

        {(filterBranch || filterMonth || (filterYear && String(filterYear) !== String(new Date().getFullYear()))) && (
          <button
            type="button"
            className="srl-clear-btn"
            onClick={() => { setFilterBranch(''); setFilterYear(new Date().getFullYear()); setFilterMonth('') }}
          >
            ✕ مسح الكل
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="srl-bulk-bar">
          <span className="srl-bulk-count">
            تم تحديد <strong>{selectedCount}</strong> سجل
          </span>
          <div className="srl-bulk-actions">
            <button
              type="button"
              className="srl-bulk-delete-btn"
              onClick={() => setBulkConfirm(true)}
            >
              <Trash2 size={13} />
              حذف المحدد
            </button>
            <button
              type="button"
              className="srl-bulk-clear-btn"
              onClick={() => setSelectedIds(new Set())}
            >
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ padding: '12px 0' }}><TableSkeleton rows={5} cols={6} /></div>
      ) : paged.length === 0 ? (
        <div className="srl-empty">
          {rows.length > 0 ? 'لا توجد مبيعات تطابق الفلاتر المحددة' : 'لا توجد مبيعات مسجّلة بعد'}
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <DndContext
              sensors={colSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleColDragEnd}
            >
              <table className="srl-table">
                <thead>
                  <tr>
                    {/* Fixed: select-all checkbox */}
                    <th className="srl-th-check">
                      <input
                        type="checkbox"
                        ref={selectAllRef}
                        checked={allSelected}
                        onChange={toggleAll}
                        className="srl-checkbox"
                        title={allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل القابلة للحذف'}
                        disabled={deletableFiltered.length === 0}
                      />
                    </th>

                    {/* Draggable sortable columns */}
                    <SortableContext items={colOrder} strategy={horizontalListSortingStrategy}>
                      {colOrder.map(colKey => (
                        <DraggableColTh
                          key={colKey}
                          id={colKey}
                          label={COL_META[colKey].label}
                          sortKey={sortKey}
                          sortDir={sortDir}
                          onToggle={toggle}
                        />
                      ))}
                    </SortableContext>

                    {/* Fixed: actions column */}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(s => {
                    const canDelete  = s.status !== 'sent'
                    const isSelected = selectedIds.has(s.id)
                    return (
                      <tr
                        key={s.id}
                        className={isSelected ? 'srl-row-selected' : ''}
                      >
                        {/* Fixed: checkbox */}
                        <td className="srl-td-check">
                          {canDelete ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRow(s.id)}
                              className="srl-checkbox"
                            />
                          ) : (
                            <span style={{ display: 'inline-block', width: 16 }} />
                          )}
                        </td>

                        {/* Data cells follow colOrder */}
                        {colOrder.map(colKey => (
                          <td key={colKey}>{renderCell(s, colKey)}</td>
                        ))}

                        {/* Fixed: delete button */}
                        <td>
                          {s.status === 'sent' ? (
                            <span className="srl-protected">
                              <Lock size={10} /> محمية
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteId(s.id)}
                              className="srl-delete-btn"
                              aria-label="حذف"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </DndContext>
          </div>

          {totalPages > 1 && (
            <div className="srl-pagination">
              <span className="srl-page-info">
                صفحة {page + 1} من {totalPages} — {totalRows} سجل
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="srl-page-btn"
                >‹</button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="srl-page-btn"
                >›</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Single-row delete */}
      <ConfirmDialog
        open={!!deleteId}
        title="حذف السجل"
        message="هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Bulk delete */}
      <ConfirmDialog
        open={bulkConfirm}
        title="حذف المحدد"
        message={`هل أنت متأكد من حذف ${selectedCount} سجل؟ لا يمكن التراجع عن هذا الإجراء.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkConfirm(false)}
      />
    </div>
  )
}
