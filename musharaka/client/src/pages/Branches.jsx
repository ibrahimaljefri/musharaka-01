import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/axiosClient'
import BranchBadge from '../components/BranchBadge'
import ConfirmDialog from '../components/ConfirmDialog'
import TableControls from '../components/TableControls'
import { TableSkeleton } from '../components/SkeletonLoader'
import { toast } from '../lib/useToast'
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react'
import EmptyState from '../components/EmptyState'

export default function Branches() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading]   = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch]     = useState('')

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white font-arabic">إدارة الفروع</h1>
        <Link to="/branches/create"
          className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors font-arabic">
          <Plus size={16} /> إضافة فرع جديد
        </Link>
      </div>

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
            action={
              <Link to="/branches/create"
                className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors font-arabic">
                <Plus size={15} /> إضافة فرع جديد
              </Link>
            }
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
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-xs font-arabic table-head">
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
