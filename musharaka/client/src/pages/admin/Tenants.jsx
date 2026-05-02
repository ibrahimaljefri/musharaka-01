import { useState, useEffect, useMemo, Fragment } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/axiosClient'
import ConfirmDialog from '../../components/ConfirmDialog'
import { TableSkeleton } from '../../components/SkeletonLoader'
import Pagination from '../../components/Pagination'
import { toast } from '../../lib/useToast'
import EmptyState from '../../components/EmptyState'
import DraggableHeaderRow from '../../components/DraggableHeaderRow'
import DraggableSortHeader from '../../components/DraggableSortHeader'
import { useColumnOrder } from '../../lib/useColumnOrder'
import { Plus, Edit2, Trash2, Key, Building2, ChevronLeft, ChevronDown, GitBranch } from 'lucide-react'
import './admin-tenants.css'

// Adapter so SortHeader's (key, dir) API drives Tenants' existing
// `sort = { field, dir }` state without changing the sort logic itself.
function makeSortAdapter(sort, setSort) {
  return {
    sortKey: sort.field,
    sortDir: sort.dir,
    toggle:  (field) => setSort(prev =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' }
    ),
  }
}

const PAGE_SIZE = 20

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const PLAN_LABELS = { basic: 'أساسي', professional: 'احترافي', enterprise: 'مؤسسي' }

function tenantStatusInfo(tenant) {
  const expired = tenant.expires_at && new Date(tenant.expires_at) < new Date()
  if (expired || tenant.status === 'expired') return { cls: 'expired', label: 'منتهي' }
  if (tenant.status === 'suspended')           return { cls: 'suspended', label: 'موقوف' }
  if (tenant.status === 'trial')               return { cls: 'trial', label: 'تجريبي' }
  return { cls: 'active', label: 'نشط' }
}

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return `${dt.getDate()} ${MONTHS_AR[dt.getMonth()]} ${dt.getFullYear()}`
}

const INPUT_TYPE_LABELS = { daily: 'يومي', monthly: 'شهري' }
function inputTypesList(value) {
  if (Array.isArray(value)) return value
  return String(value || 'daily').split(',').map(s => s.trim()).filter(Boolean)
}

const TN_COLS = ['name', 'slug', 'plan', 'input_types', 'status', 'expires_at']
const TN_COL_META = {
  name:        { label: 'الاسم' },
  slug:        { label: 'الرمز' },
  plan:        { label: 'الباقة' },
  input_types: { label: 'أنواع الإدخال' },
  status:      { label: 'الحالة' },
  expires_at:  { label: 'تاريخ الانتهاء' },
}

function renderTenantCell(t, key) {
  switch (key) {
    case 'name': return (
      <>
        <strong>{t.name}</strong>
        {t.commercial_registration && (
          <div className="t-micro">{t.commercial_registration}</div>
        )}
      </>
    )
    case 'slug': return <span className="t-mono">{t.slug || '—'}</span>
    case 'plan': return PLAN_LABELS[t.plan] || t.plan || '—'
    case 'input_types': return (
      <>
        {inputTypesList(t.allowed_input_types).map(type => (
          <span key={type} className="adm-chip">
            {INPUT_TYPE_LABELS[type] || 'مخصص'}
          </span>
        ))}
      </>
    )
    case 'status': {
      const s = tenantStatusInfo(t)
      return <span className={`adm-status s-${s.cls}`}>{s.label}</span>
    }
    case 'expires_at': {
      const expired = t.expires_at && new Date(t.expires_at) < new Date()
      return (
        <span className="t-mono" style={expired ? { color: '#B91C1C', fontWeight: 600 } : undefined}>
          {t.expires_at ? fmtDate(t.expires_at) : 'غير محدد'}
        </span>
      )
    }
    default: return '—'
  }
}

export default function Tenants() {
  const [tenants, setTenants]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [planFilter, setPlanFilter]     = useState('')
  const [sort, setSort]                 = useState({ field: null, dir: 'asc' })
  const [page, setPage]                 = useState(1)

  // branchesByTenant: { [tenantId]: branches[] } — pre-fetched on page
  // load via parallel fan-out so search can match branch names without
  // requiring the user to expand rows first.
  const [branchesByTenant, setBranchesByTenant] = useState({})

  // Expanded-row state: Set of tenant_ids that are currently open.
  // Combines user-toggled rows with auto-expansion driven by search.
  const [userExpanded, setUserExpanded] = useState(new Set())

  function toggleExpand(tenantId) {
    setUserExpanded(prev => {
      const next = new Set(prev)
      if (next.has(tenantId)) next.delete(tenantId)
      else next.add(tenantId)
      return next
    })
  }

  useEffect(() => { load() }, [])
  useEffect(() => { setPage(1) }, [search, statusFilter, planFilter])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/tenants')
      const tenantList = data || []
      setTenants(tenantList)
      // Fan-out: fetch every tenant's branches in parallel so the search
      // box can match branch names/codes/contract numbers without forcing
      // the admin to expand rows manually. Failures don't block the page —
      // a tenant with a failed fetch just won't surface via branch search.
      const pairs = await Promise.all(
        tenantList.map(t =>
          api.get(`/admin/tenants/${t.id}/branches`)
            .then(r => [t.id, r.data || []])
            .catch(() => [t.id, []])
        )
      )
      setBranchesByTenant(Object.fromEntries(pairs))
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل تحميل المستأجرين')
    } finally { setLoading(false) }
  }

  async function handleDelete() {
    const id = deleteTarget.id
    setDeleteTarget(null)
    try {
      await api.delete(`/admin/tenants/${id}`)
      toast.success('تم حذف المستأجر بنجاح')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل الحذف')
    }
  }

  // Build plan option list from real data so the select mirrors what's served.
  const planOptions = useMemo(() => {
    const set = new Set()
    tenants.forEach(t => { if (t.plan) set.add(t.plan) })
    return Array.from(set)
  }, [tenants])

  // Tenants whose branches match the search — also drives auto-expansion.
  const branchMatchedTenantIds = useMemo(() => {
    if (!search) return new Set()
    const q = search.toLowerCase()
    const hits = new Set()
    for (const [tid, branches] of Object.entries(branchesByTenant)) {
      for (const b of branches) {
        if (
          (b.name || '').toLowerCase().includes(q) ||
          (b.code || '').toLowerCase().includes(q) ||
          (b.contract_number || '').toLowerCase().includes(q)
        ) { hits.add(tid); break }
      }
    }
    return hits
  }, [search, branchesByTenant])

  const filteredSorted = useMemo(() => {
    let list = tenants.filter(t => {
      if (search) {
        const q = search.toLowerCase()
        const tenantHit = (t.name || '').toLowerCase().includes(q) ||
                          (t.slug || '').toLowerCase().includes(q)
        const branchHit = branchMatchedTenantIds.has(t.id)
        if (!tenantHit && !branchHit) return false
      }
      if (statusFilter) {
        const { cls } = tenantStatusInfo(t)
        if (cls !== statusFilter) return false
      }
      if (planFilter && t.plan !== planFilter) return false
      return true
    })

    if (sort.field) {
      list = [...list].sort((a, b) => {
        let av = a[sort.field] ?? ''
        let bv = b[sort.field] ?? ''
        if (sort.field === 'expires_at' || sort.field === 'activated_at') {
          av = av ? new Date(av).getTime() : 0
          bv = bv ? new Date(bv).getTime() : 0
          return sort.dir === 'asc' ? av - bv : bv - av
        }
        const cmp = String(av).localeCompare(String(bv), 'ar')
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }
    return list
  }, [tenants, search, statusFilter, planFilter, sort, branchMatchedTenantIds])

  // The set of tenants currently rendered as expanded =
  //   user-toggled rows  ∪  rows auto-expanded due to a branch search hit.
  const effectivelyExpanded = useMemo(() => {
    const merged = new Set(userExpanded)
    for (const tid of branchMatchedTenantIds) merged.add(tid)
    return merged
  }, [userExpanded, branchMatchedTenantIds])

  const sortAdapter = makeSortAdapter(sort, setSort)
  const [colOrder, setColOrder] = useColumnOrder(TN_COLS, 'adm_tn_col_order')
  const totalPages = Math.ceil(filteredSorted.length / PAGE_SIZE) || 1
  const paged = filteredSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const firstIdx = filteredSorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastIdx  = Math.min(page * PAGE_SIZE, filteredSorted.length)

  // Summary counts reflect full list, not current filter view.
  const { activeCount, trialCount, expiredCount } = useMemo(() => {
    let a = 0, tr = 0, ex = 0
    tenants.forEach(t => {
      const { cls } = tenantStatusInfo(t)
      if (cls === 'expired') ex++
      else if (cls === 'trial') tr++
      else if (cls === 'active') a++
    })
    return { activeCount: a, trialCount: tr, expiredCount: ex }
  }, [tenants])

  return (
    <div className="adm-tenants">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">إدارة العملاء</h1>
          <div className="t-small">
            {activeCount} عميل نشط · {trialCount} تجريبي · {expiredCount} منتهي
          </div>
        </div>
        <Link to="/admin/tenants/create" className="btn btn-primary">
          <Plus size={15} /> إضافة عميل
        </Link>
      </div>

      <div className="adm-filter-bar">
        <input
          className="input"
          placeholder="🔍 بحث باسم العميل، الرمز، اسم الفرع، كود الفرع، أو رقم العقد..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="input"
          style={{ maxWidth: 180 }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">جميع الحالات</option>
          <option value="active">نشط</option>
          <option value="trial">تجريبي</option>
          <option value="expired">منتهي</option>
          <option value="suspended">موقوف</option>
        </select>
        <select
          className="input"
          style={{ maxWidth: 180 }}
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
        >
          <option value="">جميع الباقات</option>
          {planOptions.map(p => (
            <option key={p} value={p}>{PLAN_LABELS[p] || p}</option>
          ))}
        </select>
      </div>

      <div className="adm-tbl-wrap surface">
        {loading ? (
          <div style={{ padding: 16 }}>
            <TableSkeleton rows={5} cols={7} />
          </div>
        ) : tenants.length === 0 ? (
          <div style={{ padding: 24 }}>
            <EmptyState
              icon={Building2}
              title="لا يوجد مستأجرون بعد"
              description="أضف أول مستأجر لبدء إدارة الحسابات والاشتراكات"
              action={
                <Link to="/admin/tenants/create" className="btn btn-primary">
                  <Plus size={15} /> إضافة عميل
                </Link>
              }
            />
          </div>
        ) : filteredSorted.length === 0 ? (
          <div className="adm-state">لا توجد نتائج مطابقة للمرشحات الحالية</div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <DraggableHeaderRow order={colOrder} onReorder={setColOrder}>
                    {colOrder.map(k => (
                      <DraggableSortHeader
                        key={k}
                        id={k}
                        label={TN_COL_META[k].label}
                        sortKey={sortAdapter.sortKey}
                        sortDir={sortAdapter.sortDir}
                        onToggle={sortAdapter.toggle}
                      />
                    ))}
                  </DraggableHeaderRow>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(t => {
                  const isOpen = effectivelyExpanded.has(t.id)
                  const branches = branchesByTenant[t.id] || []
                  // When auto-expanded by branch search, highlight only the
                  // matching branches; otherwise show all.
                  const branchQuery = search ? search.toLowerCase() : ''
                  const visibleBranches = branchQuery && branchMatchedTenantIds.has(t.id)
                    ? branches.filter(b =>
                        (b.name || '').toLowerCase().includes(branchQuery) ||
                        (b.code || '').toLowerCase().includes(branchQuery) ||
                        (b.contract_number || '').toLowerCase().includes(branchQuery)
                      )
                    : branches
                  return (
                    <Fragment key={t.id}>
                    <tr>
                      <td>
                        <button
                          type="button"
                          onClick={() => toggleExpand(t.id)}
                          className="adm-icon-btn"
                          title={isOpen ? 'إخفاء الفروع' : 'عرض الفروع'}
                          aria-label={isOpen ? 'إخفاء الفروع' : 'عرض الفروع'}
                          aria-expanded={isOpen}
                        >
                          {isOpen ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
                        </button>
                      </td>
                      {colOrder.map(k => <td key={k}>{renderTenantCell(t, k)}</td>)}
                      <td>
                        <div className="adm-actions">
                          <Link
                            to={`/admin/tenants/${t.id}/edit`}
                            className="adm-icon-btn"
                            title="تعديل"
                            aria-label="تعديل"
                          >
                            <Edit2 size={13} />
                          </Link>
                          <Link
                            to={`/admin/tenants/${t.id}/api-keys`}
                            className="adm-icon-btn"
                            title="مفاتيح API"
                            aria-label="مفاتيح API"
                          >
                            <Key size={13} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(t)}
                            className="adm-icon-btn danger"
                            title="حذف"
                            aria-label="حذف"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="adm-tenant-branches-row">
                        <td></td>
                        <td colSpan={7}>
                          <div className="adm-tenant-branches">
                            <div className="adm-tenant-branches-head">
                              <GitBranch size={13} />
                              <span>فروع <strong>{t.name}</strong></span>
                            </div>
                            {visibleBranches.length === 0 ? (
                              <div className="t-small" style={{ padding: '8px 0', color: 'var(--text-muted)' }}>
                                {branches.length === 0 ? 'لا توجد فروع لهذا العميل' : 'لا توجد فروع مطابقة للبحث'}
                              </div>
                            ) : (
                              <table className="adm-sub-tbl">
                                <thead>
                                  <tr>
                                    <th>كود الفرع</th>
                                    <th>اسم الفرع</th>
                                    <th>رقم العقد</th>
                                    <th style={{ width: 80 }}>إجراء</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {visibleBranches.map(b => (
                                    <tr key={b.id}>
                                      <td className="t-mono">{b.code || '—'}</td>
                                      <td>{b.name}</td>
                                      <td className="t-mono">{b.contract_number || '—'}</td>
                                      <td>
                                        <Link
                                          to={`/branches/${b.id}/edit`}
                                          className="adm-icon-btn"
                                          title="تعديل الفرع"
                                          aria-label="تعديل الفرع"
                                        >
                                          <Edit2 size={13} />
                                        </Link>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile card fallback */}
            <div className="adm-cards-mobile">
              {paged.map(t => {
                const s = tenantStatusInfo(t)
                return (
                  <div key={t.id} className="adm-card-row">
                    <div className="card-title">{t.name}</div>
                    <div className="kv"><span className="k">الرمز</span><span className="t-mono">{t.slug || '—'}</span></div>
                    <div className="kv"><span className="k">الباقة</span><span>{PLAN_LABELS[t.plan] || t.plan || '—'}</span></div>
                    <div className="kv"><span className="k">الحالة</span><span className={`adm-status s-${s.cls}`}>{s.label}</span></div>
                    <div className="kv"><span className="k">ينتهي في</span><span className="t-mono">{t.expires_at ? fmtDate(t.expires_at) : 'غير محدد'}</span></div>
                    <div className="kv kv-actions">
                      <div className="adm-actions">
                        <Link to={`/admin/tenants/${t.id}/edit`} className="adm-icon-btn" aria-label="تعديل">
                          <Edit2 size={13} />
                        </Link>
                        <Link to={`/admin/tenants/${t.id}/api-keys`} className="adm-icon-btn" aria-label="مفاتيح API">
                          <Key size={13} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(t)}
                          className="adm-icon-btn danger"
                          aria-label="حذف"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="adm-pagination">
              <span className="t-small">
                عرض {firstIdx}–{lastIdx} من {filteredSorted.length}
              </span>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="حذف المستأجر"
        message={`هل أنت متأكد من حذف حساب "${deleteTarget?.name}"؟ سيتم حذف جميع البيانات المرتبطة به نهائياً.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
