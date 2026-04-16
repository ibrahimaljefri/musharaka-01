import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../../lib/axiosClient'
import AlertBanner from '../../components/AlertBanner'
import ConfirmDialog from '../../components/ConfirmDialog'
import {
  UserPlus, Trash2, CheckCircle2, Clock, UserCheck,
  Building2, Eye, EyeOff, X, Pencil
} from 'lucide-react'

function statusBadge(status) {
  if (status === 'assigned')
    return <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-arabic"><UserCheck size={10} />مُعيَّن</span>
  return <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-arabic"><Clock size={10} />في الانتظار</span>
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Assign Modal ──────────────────────────────────────────────────────────────
function AssignModal({ user, onClose, onDone }) {
  const [tenants, setTenants]   = useState([])
  const [tenantId, setTenantId] = useState('')
  const [role, setRole]         = useState('member')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    api.get('/admin/tenants').then(({ data }) => setTenants(data || []))
  }, [])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!tenantId) return setError('يرجى اختيار المستأجر')
    setLoading(true)
    try {
      await api.post(`/admin/users/${user.id}/assign`, { tenant_id: tenantId, role })
      onDone()
    } catch (err) {
      setError(err.response?.data?.error || 'فشل التعيين')
    } finally { setLoading(false) }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800 font-arabic">تعيين مستأجر للمستخدم</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <p className="text-sm text-gray-500 font-arabic mb-4">
          المستخدم: <span className="font-semibold text-gray-700">{user.email}</span>
        </p>

        {error && <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-arabic">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="assign-tenant" className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">المستأجر</label>
            <select id="assign-tenant" value={tenantId} onChange={e => setTenantId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-arabic">
              <option value="">اختر مستأجراً...</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="assign-role" className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">الدور</label>
            <select id="assign-role" value={role} onChange={e => setRole(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-arabic">
              <option value="admin">مدير</option>
              <option value="member">مستخدم</option>
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition-colors font-arabic">
              {loading ? 'جاري التعيين...' : 'تعيين'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors font-arabic">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ── Create User Modal ─────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onDone }) {
  const [form, setForm]       = useState({ email: '', password: '', full_name: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.email) return setError('البريد الإلكتروني مطلوب')
    if (!form.password || form.password.length < 6) return setError('كلمة المرور 6 أحرف على الأقل')
    setLoading(true)
    try {
      await api.post('/admin/users', form)
      onDone()
    } catch (err) {
      setError(err.response?.data?.error || 'فشل إنشاء المستخدم')
    } finally { setLoading(false) }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-800 font-arabic">إنشاء مستخدم جديد</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {error && <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-arabic">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">الاسم الكامل</label>
            <input type="text" dir="rtl" value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="أحمد محمد"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">البريد الإلكتروني</label>
            <input type="email" dir="ltr" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="user@example.com"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">كلمة المرور المؤقتة</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} dir="ltr" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 pl-10" />
              <button type="button" onClick={() => setShowPass(p => !p)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400 font-arabic">سيُطلب من المستخدم تغييرها عند أول دخول</p>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition-colors font-arabic">
              {loading ? 'جاري الإنشاء...' : 'إنشاء المستخدم'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors font-arabic">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ── Edit User Modal ───────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onDone }) {
  const [tenants, setTenants]     = useState([])
  const [form, setForm]           = useState({
    full_name:    user.full_name || '',
    new_password: '',
    tenant_id:    user.tenant_id || '',
    role:         user.role || 'member',
  })
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    api.get('/admin/tenants').then(({ data }) => setTenants(data || []))
  }, [])

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.new_password && form.new_password.length < 6)
      return setError('كلمة المرور 6 أحرف على الأقل')
    setLoading(true)
    try {
      await api.put(`/admin/users/${user.id}`, {
        full_name:    form.full_name,
        new_password: form.new_password || undefined,
        tenant_id:    form.tenant_id || null,
        role:         form.role,
      })
      onDone()
    } catch (err) {
      setError(err.response?.data?.error || 'فشل التحديث')
    } finally { setLoading(false) }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-800 font-arabic">تعديل المستخدم</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <p className="text-xs text-gray-400 font-mono mb-4">{user.email}</p>

        {error && <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-arabic">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">الاسم الكامل</label>
            <input type="text" dir="rtl" value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">
              كلمة مرور جديدة <span className="text-gray-400 font-normal">(اتركها فارغة لعدم التغيير)</span>
            </label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} dir="ltr" value={form.new_password}
                onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
                placeholder="••••••"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 pl-10" />
              <button type="button" onClick={() => setShowPass(p => !p)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">المستأجر</label>
            <select value={form.tenant_id} onChange={e => setForm(f => ({ ...f, tenant_id: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-arabic">
              <option value="">بدون مستأجر</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">الدور</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-arabic">
              <option value="admin">مدير</option>
              <option value="member">مستخدم</option>
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition-colors font-arabic">
              {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors font-arabic">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Users() {
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [flash, setFlash]           = useState(null)
  const [assignTarget, setAssignTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/users')
      setUsers(data || [])
    } catch (err) {
      setFlash({ type: 'error', msg: 'فشل تحميل المستخدمين' })
    } finally { setLoading(false) }
  }

  async function handleDelete() {
    const id = deleteTarget.id
    setDeleteTarget(null)
    try {
      await api.delete(`/admin/users/${id}`)
      setFlash({ type: 'success', msg: 'تم حذف المستخدم' })
      load()
    } catch (err) {
      setFlash({ type: 'error', msg: err.response?.data?.error || 'فشل الحذف' })
    }
  }

  const pending  = users.filter(u => u.status === 'pending')
  const assigned = users.filter(u => u.status !== 'pending')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 font-arabic">إدارة المستخدمين</h1>
          <p className="text-xs text-gray-400 font-arabic mt-0.5">المستخدمون المسجلون وتعيين الاشتراكات</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors font-arabic shadow-sm">
          <UserPlus size={15} /> مستخدم جديد
        </button>
      </div>

      {flash && <AlertBanner type={flash.type} message={flash.msg} onClose={() => setFlash(null)} />}

      {/* Pending users — need attention */}
      {pending.length > 0 && (
        <div className="card-surface overflow-hidden">
          <div className="section-header">
            <span className="font-semibold text-yellow-700 font-arabic text-sm flex items-center gap-2">
              <Clock size={14} /> في انتظار التفعيل
            </span>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-arabic">{pending.length} مستخدم</span>
          </div>
          <div className="divide-y divide-gray-100">
            {pending.map(u => (
              <div key={u.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 font-arabic truncate">{u.full_name || '—'}</p>
                  <p className="text-xs text-gray-400 font-mono">{u.email}</p>
                  <p className="text-xs text-gray-300 font-arabic mt-0.5">سجّل في {fmtDate(u.registered_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setAssignTarget(u)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 hover:bg-yellow-100 text-xs font-medium rounded-lg transition-colors font-arabic">
                    <Building2 size={12} /> تعيين مستأجر
                  </button>
                  <button onClick={() => setDeleteTarget(u)}
                    className="p-1.5 rounded-lg text-red-400 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All assigned users */}
      <div className="card-surface overflow-hidden">
        <div className="section-header">
          <span className="font-semibold text-gray-700 font-arabic text-sm">جميع المستخدمين</span>
          <span className="text-xs text-gray-400 font-arabic">{users.length} مستخدم</span>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <div className="inline-block w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-gray-400 font-arabic text-sm">جاري التحميل...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center">
            <UserPlus size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 font-arabic text-sm">لا يوجد مستخدمون بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 text-gray-500 text-xs font-arabic border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">الاسم</th>
                  <th className="px-4 py-3 text-right font-medium">البريد الإلكتروني</th>
                  <th className="px-4 py-3 text-right font-medium">الحالة</th>
                  <th className="px-4 py-3 text-right font-medium">المستأجر</th>
                  <th className="px-4 py-3 text-right font-medium">الدور</th>
                  <th className="px-4 py-3 text-right font-medium">تاريخ التسجيل</th>
                  <th className="px-4 py-3 text-right font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-yellow-50/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-800 font-arabic">{u.full_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{u.email}</td>
                    <td className="px-4 py-3">{statusBadge(u.status)}</td>
                    <td className="px-4 py-3 text-gray-600 font-arabic text-xs">{u.tenant_name || <span className="text-gray-300">غير مُعيَّن</span>}</td>
                    <td className="px-4 py-3 text-gray-500 font-arabic text-xs">
                      {u.role === 'admin' ? 'مدير' : u.role === 'member' ? 'مستخدم' : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-arabic">{fmtDate(u.registered_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {u.status === 'pending' && (
                          <button onClick={() => setAssignTarget(u)}
                            className="p-1.5 rounded-lg text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 transition-colors" title="تعيين مستأجر">
                            <Building2 size={13} />
                          </button>
                        )}
                        <button onClick={() => setEditTarget(u)}
                          className="p-1.5 rounded-lg text-blue-500 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors" title="تعديل">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeleteTarget(u)}
                          className="p-1.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors" title="حذف">
                          <Trash2 size={13} />
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

      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onDone={() => { setEditTarget(null); setFlash({ type: 'success', msg: 'تم تحديث المستخدم بنجاح' }); load() }}
        />
      )}

      {assignTarget && (
        <AssignModal
          user={assignTarget}
          onClose={() => setAssignTarget(null)}
          onDone={() => { setAssignTarget(null); setFlash({ type: 'success', msg: 'تم تعيين المستخدم بنجاح' }); load() }}
        />
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onDone={() => { setShowCreate(false); setFlash({ type: 'success', msg: 'تم إنشاء المستخدم بنجاح' }); load() }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="حذف المستخدم"
        message={`هل أنت متأكد من حذف حساب "${deleteTarget?.email}"؟`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
