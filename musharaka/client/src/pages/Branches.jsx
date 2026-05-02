import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/axiosClient'
import BranchBadge from '../components/BranchBadge'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { TableSkeleton } from '../components/SkeletonLoader'
import { toast } from '../lib/useToast'
import { Plus, Edit2, Trash2, Building2, AlertTriangle } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import SortHeader from '../components/SortHeader'
import { useSortable } from '../lib/useSortable'
import { useAuthStore } from '../store/authStore'
import './branches.css'

const PAGE_SIZE = 20

export default function Branches() {
  const [branches, setBranches]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch]           = useState('')

  const maxBranches = useAuthStore(s => s.maxBranches)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/branches')
      setBranches(data || [])
    } catch {
      setBranches([])
    }
    setLoading(false)
  }

  async function handleDelete() {
    const id = deleteTarget.id
    setDeleteTarget(null)
    try {
      await api.delete(`/branches/${id}`)
      toast.success('تم حذف الفرع بنجاح.')
      load()
    } catch (e) {
      const msg = e.response?.data?.error || 'فشل حذف الفرع.'
      toast.error(msg)
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return branches
    const q = search.trim().toLowerCase()
    return branches.filter(b =>
      (b.name     || '').toLowerCase().includes(q) ||
      (b.code     || '').toLowerCase().includes(q) ||
      (b.location || '').toLowerCase().includes(q)
    )
  }, [branches, search])

  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [search])
  const { sorted: sortedRows, sortKey, sortDir, toggle: toggleSort } = useSortable(filtered, 'created_at', 'desc')
  const totalPages  = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged       = sortedRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const atLimit    = maxBranches != null && branches.length >= maxBranches
  const overLimit  = maxBranches != null && branches.length > maxBranches

  const AddBranchButton = () => {
    if (atLimit) {
      return (
        <button
          type="button"
          disabled
          title={`وصلت إلى الحد الأقصى (${maxBranches} فروع)`}
          className="btn btn-primary"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', borderColor: 'var(--border)', cursor: 'not-allowed' }}
        >
          <Plus size={15} /> إضافة فرع جديد
        </button>
      )
    }
    return (
      <Link to="/branches/create" className="btn btn-primary">
        <Plus size={15} /> إضافة فرع جديد
      </Link>
    )
  }

  return (
    <div className="branches-page">
      <div className="br-page-header">
        <div>
          <h1 className="br-page-title">إدارة الفروع</h1>
          <div className="t-small">
            {branches.length} فرع{maxBranches != null ? ` من أصل ${maxBranches}` : ''}
          </div>
        </div>
        <AddBranchButton />
      </div>

      {overLimit && (
        <div className="br-alert error">
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>تجاوزت الحد الأقصى للفروع</strong>
            <p>
              لديك {branches.length} فروع والحد المسموح به {maxBranches} فروع. لا يمكن إضافة فروع جديدة. تواصل مع الإدارة للترقية.
            </p>
          </div>
        </div>
      )}

      {atLimit && !overLimit && (
        <div className="br-alert warn">
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p>وصلت إلى الحد الأقصى للفروع ({maxBranches} فروع). تواصل مع الإدارة لإضافة المزيد.</p>
          </div>
        </div>
      )}

      {!loading && branches.length > 0 && (
        <div className="br-filter-bar">
          <input
            type="search"
            className="input"
            placeholder="🔍 بحث بالاسم أو الكود أو الموقع..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      <div className="br-tbl-wrap surface">
        {loading ? (
          <div style={{ padding: 16 }}>
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : branches.length === 0 ? (
          <div style={{ padding: 24 }}>
            <EmptyState
              icon={Building2}
              title="لا توجد فروع بعد"
              description="أضف فرعاً جديداً للبدء في مشاركة بياناتك وإرسال الفواتير"
              action={<AddBranchButton />}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="br-state">لا توجد نتائج مطابقة للبحث</div>
        ) : (
          <>
            <table className="br-tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <SortHeader k="code"            label="كود الفرع"  sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <SortHeader k="name"            label="اسم الفرع"  sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <SortHeader k="contract_number" label="رقم العقد"   sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <SortHeader k="location"        label="الموقع"      sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((b, i) => (
                  <tr key={b.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                    <td><BranchBadge code={b.code} /></td>
                    <td style={{ fontWeight: 500 }}>{b.name}</td>
                    <td>{b.contract_number || '—'}</td>
                    <td>{b.location || '—'}</td>
                    <td>
                      <div className="br-actions">
                        <Link to={`/branches/${b.id}/edit`} className="br-icon-btn" title="تعديل" aria-label="تعديل">
                          <Edit2 size={13} />
                        </Link>
                        <button type="button" className="br-icon-btn danger" onClick={() => setDeleteTarget(b)} title="حذف" aria-label="حذف">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="br-cards-mobile">
              {paged.map(b => (
                <div key={b.id} className="br-card-row">
                  <div className="card-title">{b.name}</div>
                  <div className="kv"><span className="k">الكود</span><span><BranchBadge code={b.code} /></span></div>
                  <div className="kv"><span className="k">رقم العقد</span><span>{b.contract_number || '—'}</span></div>
                  <div className="kv"><span className="k">الموقع</span><span>{b.location || '—'}</span></div>
                  <div className="kv" style={{ justifyContent: 'flex-end', paddingTop: 8 }}>
                    <div className="br-actions">
                      <Link to={`/branches/${b.id}/edit`} className="br-icon-btn" aria-label="تعديل">
                        <Edit2 size={13} />
                      </Link>
                      <button type="button" className="br-icon-btn danger" onClick={() => setDeleteTarget(b)} aria-label="حذف">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="br-pagination">
                <span className="t-small">عرض {filtered.length} فرع</span>
                <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="حذف الفرع"
        message={`هل أنت متأكد من حذف فرع "${deleteTarget?.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
