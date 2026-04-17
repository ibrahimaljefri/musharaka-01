import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/axiosClient'
import BranchBadge from '../components/BranchBadge'
import ConfirmDialog from '../components/ConfirmDialog'
import TableControls from '../components/TableControls'
import { TableSkeleton } from '../components/SkeletonLoader'
import { toast } from '../lib/useToast'
import { Plus, Edit2, Trash2, Building2, AlertTriangle } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import { useAuthStore } from '../store/authStore'

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

  // Limit enforcement
  const atLimit    = maxBranches != null && branches.length >= maxBranches
  const overLimit  = maxBranches != null && branches.length > maxBranches

  const AddBranchButton = ({ size = 16, className = '' }) => {
    if (atLimit) {
      return (
        <button
          disabled
          title={`وصلت إلى الحد الأقصى (${maxBranches} فروع)`}
          className={`inline-flex items-center gap-2 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium px-4 py-2 rounded-lg cursor-not-allowed font-arabic ${className}`}
        >
          <Plus size={size} /> إضافة فرع جديد
        </button>
      )
    }
    return (
      <Link to="/branches/create"
        className={`inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors font-arabic ${className}`}>
        <Plus size={size} /> إضافة فرع جديد
      </Link>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between" dir="rtl">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white font-arabic">إدارة الفروع</h1>
          {maxBranches != null && (
            <p className="text-xs text-gray-400 dark:text-gray-500 font-arabic mt-0.5">
              {branches.length} من {maxBranches} فرع مستخدم
            </p>
          )}
        </div>
        <AddBranchButton />
      </div>

      {/* Over-limit warning banner */}
      {overLimit && (
        <div dir="rtl" className="flex items-start gap-3 p-3 rounded-lg border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300 font-arabic">
              تجاوزت الحد الأقصى للفروع
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 font-arabic mt-0.5">
              لديك {branches.length} فروع والحد المسموح به {maxBranches} فروع. لا يمكن إضافة فروع جديدة. تواصل مع الإدارة للترقية.
            </p>
          </div>
        </div>
      )}

      {/* At-limit info banner */}
      {atLimit && !overLimit && (
        <div dir="rtl" className="flex items-start gap-3 p-3 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300 font-arabic">
            وصلت إلى الحد الأقصى للفروع ({maxBranches} فروع). تواصل مع الإدارة لإضافة المزيد.
          </p>
        </div>
      )}

      <div className="card-surface overflow-hidden">
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={5} />
          </div>
        ) : branches.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="لا توجد فروع بعد"
            description="أضف فرعاً جديداً للبدء في إدارة مبيعاتك وإرسال الفواتير"
            action={<AddBranchButton size={15} />}
          />
        ) : (
          <div>
            <div className="px-4 pt-4">
              <TableControls
                value={search}
                onChange={setSearch}
                count={filtered.length}
                total={branches.length}
                placeholder="بحث بالاسم أو الكود أو الموقع..."
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">#</th>
                    <th className="px-4 py-3 text-right font-medium">كود الفرع</th>
                    <th className="px-4 py-3 text-right font-medium">اسم الفرع</th>
                    <th className="px-4 py-3 text-right font-medium">رقم العقد</th>
                    <th className="px-4 py-3 text-right font-medium">الموقع</th>
                    <th className="px-4 py-3 text-right font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {filtered.map((b, i) => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3"><BranchBadge code={b.code} /></td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100 font-arabic">{b.name}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-arabic">{b.contract_number || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-arabic">{b.location || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link to={`/branches/${b.id}/edit`}
                            className="inline-flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 px-2.5 py-1 rounded-md transition-colors font-arabic">
                            <Edit2 size={12} /> تعديل
                          </Link>
                          <button onClick={() => setDeleteTarget(b)}
                            className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-md transition-colors font-arabic">
                            <Trash2 size={12} /> حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400 font-arabic">
                        لا توجد نتائج مطابقة للبحث
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
