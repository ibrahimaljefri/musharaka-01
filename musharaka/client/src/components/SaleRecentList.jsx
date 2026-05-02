/**
 * SaleRecentList — self-contained "آخر المبيعات" table.
 *
 * Used on the SaleCreate page below the entry form so the user can
 * immediately see newly submitted rows without navigating away.
 *
 * Props:
 *   branchId    — pre-filter to this branch (optional; '' = all)
 *   refreshTick — increment from parent after a successful save to refetch
 */
import { useEffect, useState, useMemo, useCallback } from 'react'
import api from '../lib/axiosClient'
import { toast } from '../lib/useToast'
import { useSortable } from '../lib/useSortable'
import SortHeader from './SortHeader'
import BranchBadge from './BranchBadge'
import ConfirmDialog from './ConfirmDialog'
import { TableSkeleton } from './SkeletonLoader'
import { Lock, Trash2, RefreshCw } from 'lucide-react'

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

export default function SaleRecentList({ branchId = '', refreshTick = 0 }) {
  const [rows, setRows]       = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState(null)
  const [page, setPage]       = useState(0)

  // Filters
  const [filterYear, setFilterYear]   = useState(new Date().getFullYear())
  const [filterMonth, setFilterMonth] = useState('')

  // Fetch whenever branch/refreshTick changes
  useEffect(() => {
    setPage(0)
    load()
  }, [branchId, refreshTick]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset page on filter change
  useEffect(() => { setPage(0) }, [filterYear, filterMonth])

  async function load() {
    setLoading(true)
    try {
      const [salesRes, branchRes] = await Promise.all([
        api.get('/sales', { params: { limit: 5000, ...(branchId ? { branch_id: branchId } : {}) } }),
        api.get('/branches'),
      ])
      setRows(salesRes.data?.sales || [])
      setBranches(Array.isArray(branchRes.data) ? branchRes.data : (branchRes.data?.branches || []))
    } catch {
      setRows([])
    }
    setLoading(false)
  }

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

  // Available years from data
  const availableYears = useMemo(() => {
    const ySet = new Set([new Date().getFullYear()])
    for (const r of rows) {
      if (r.sale_date) ySet.add(new Date(r.sale_date).getFullYear())
    }
    return [...ySet].sort((a, b) => b - a)
  }, [rows])

  // Filter by year + month
  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (!r.sale_date) return true
      const d = new Date(r.sale_date)
      if (filterYear && d.getFullYear() !== Number(filterYear)) return false
      if (filterMonth && d.getMonth() + 1 !== Number(filterMonth)) return false
      return true
    })
  }, [rows, filterYear, filterMonth])

  // Enrich with branch info
  const enriched = useMemo(() => {
    const bMap = new Map(branches.map(b => [b.id, b]))
    return filtered.map(r => {
      const b = bMap.get(r.branch_id)
      return { ...r, _branch: b ? { code: b.code, name: b.name } : null }
    })
  }, [filtered, branches])

  // Sort
  const getter = useCallback((row, key) => {
    if (key === 'branch_code') return row._branch?.code || ''
    if (key === 'amount')      return parseFloat(row.amount || 0)
    return row?.[key]
  }, [])

  const { sorted, sortKey, sortDir, toggle } = useSortable(enriched, 'sale_date', 'desc', getter)

  // Paginate
  const totalRows  = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const paged      = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Monthly total for the selected month (quick summary)
  const monthTotal = useMemo(() => {
    if (!filterMonth) return null
    return filtered.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
  }, [filtered, filterMonth])

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

        {(filterMonth || (filterYear && String(filterYear) !== String(new Date().getFullYear()))) && (
          <button
            type="button"
            className="srl-clear-btn"
            onClick={() => { setFilterYear(new Date().getFullYear()); setFilterMonth('') }}
          >
            ✕ مسح
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: '12px 0' }}><TableSkeleton rows={5} cols={5} /></div>
      ) : paged.length === 0 ? (
        <div className="srl-empty">
          {rows.length > 0 ? 'لا توجد مبيعات لهذا الشهر' : 'لا توجد مبيعات مسجّلة بعد'}
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="srl-table">
              <thead>
                <tr>
                  <SortHeader k="branch_code"    label="الفرع"        sortKey={sortKey} sortDir={sortDir} onToggle={toggle} />
                  <SortHeader k="invoice_number" label="رقم الفاتورة" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} />
                  <SortHeader k="amount"         label="المبلغ"        sortKey={sortKey} sortDir={sortDir} onToggle={toggle} />
                  <SortHeader k="sale_date"      label="التاريخ"       sortKey={sortKey} sortDir={sortDir} onToggle={toggle} />
                  <SortHeader k="status"         label="الحالة"        sortKey={sortKey} sortDir={sortDir} onToggle={toggle} />
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paged.map(s => (
                  <tr key={s.id}>
                    <td>
                      {s._branch
                        ? <BranchBadge code={s._branch.code || '—'} />
                        : <span className="srl-muted">—</span>}
                    </td>
                    <td className="srl-mono">{s.invoice_number || '—'}</td>
                    <td className="srl-mono" dir="ltr">{fmt(s.amount)} ر.س</td>
                    <td>{fmtDate(s.sale_date)}</td>
                    <td>
                      <span className={`srl-status ${s.status === 'sent' ? 'srl-sent' : 'srl-pending'}`}>
                        {statusLabel(s.status)}
                      </span>
                    </td>
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
                ))}
              </tbody>
            </table>
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

      <ConfirmDialog
        open={!!deleteId}
        title="حذف السجل"
        message="هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
