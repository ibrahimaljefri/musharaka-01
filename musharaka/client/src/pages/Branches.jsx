import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import BranchBadge from '../components/BranchBadge'
import ConfirmDialog from '../components/ConfirmDialog'
import AlertBanner from '../components/AlertBanner'
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react'
import EmptyState from '../components/EmptyState'

export default function Branches() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading]   = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [flash, setFlash]       = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('branches').select('*').order('name')
    setBranches(data || [])
    setLoading(false)
  }

  async function handleDelete() {
    const id = deleteTarget.id
    setDeleteTarget(null)
    // Check if branch has sales
    const { count } = await supabase.from('sales').select('id', { count: 'exact', head: true }).eq('branch_id', id)
    if (count > 0) return setFlash({ type: 'error', msg: 'لا يمكن حذف الفرع لأن لديه سجلات مبيعات مرتبطة به.' })
    const { error } = await supabase.from('branches').delete().eq('id', id)
    if (error) return setFlash({ type: 'error', msg: 'فشل حذف الفرع.' })
    setFlash({ type: 'success', msg: 'تم حذف الفرع بنجاح.' })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 font-arabic">إدارة الفروع</h1>
        <Link to="/branches/create"
          className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors font-arabic">
          <Plus size={16} /> إضافة فرع جديد
        </Link>
      </div>

      {flash && <AlertBanner type={flash.type} message={flash.msg} />}

      <div className="card-surface overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 font-arabic text-sm">جاري التحميل...</div>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs font-arabic">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">#</th>
                  <th className="px-4 py-3 text-right font-medium">كود الفرع</th>
                  <th className="px-4 py-3 text-right font-medium">اسم الفرع</th>
                  <th className="px-4 py-3 text-right font-medium">رقم العقد</th>
                  <th className="px-4 py-3 text-right font-medium">الموقع</th>
                  <th className="px-4 py-3 text-right font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {branches.map((b, i) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3"><BranchBadge code={b.code} /></td>
                    <td className="px-4 py-3 font-medium text-gray-800 font-arabic">{b.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-arabic">{b.contract_number || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 font-arabic">{b.location || '—'}</td>
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
              </tbody>
            </table>
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
