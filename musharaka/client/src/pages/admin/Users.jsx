import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import api from '../../lib/axiosClient'
import ConfirmDialog from '../../components/ConfirmDialog'
import { TableSkeleton } from '../../components/SkeletonLoader'
import Pagination from '../../components/Pagination'
import { toast } from '../../lib/useToast'
import {
  UserPlus, Trash2, Clock, UserCheck,
  Building2, Eye, EyeOff, X, Pencil
} from 'lucide-react'
import './admin-users.css'

const PAGE_SIZE = 20

function statusInfo(status) {
  if (status === 'assigned') return { cls: 'assigned', label: 'مُعيَّن', Icon: UserCheck }
  return { cls: 'pending', label: 'في الانتظار', Icon: Clock }
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

  useEffect(() => {
    const handleEsc = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

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
    <div className="adm-users-modal" dir="rtl" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-head">
          <h2 className="modal-title">تعيين مستأجر للمستخدم</h2>
          <button onClick={onClose} className="modal-close" aria-label="إغلاق"><X size={18} /></button>
        </div>
        <p className="modal-sub">المستخدم: <strong>{user.email}</strong></p>

        {error && <div className="modal-err">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="field">
            <label htmlFor="assign-tenant" className="field-label">المستأجر</label>
            <select id="assign-tenant" className="input" value={tenantId} onChange={e => setTenantId(e.target.value)}>
              <option value="">اختر مستأجراً...</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="assign-role" className="field-label">الدور</label>
            <select id="assign-role" className="input" value={role} onChange={e => setRole(e.target.value)}>
              <option value="admin">مدير</option>
              <option value="member">مستخدم</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'جاري التعيين...' : 'تعيين'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ── Create User Modal ─────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onDone }) {
  const [form, setForm]         = useState({ email: '', password: '', full_name: '', phone: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    const handleEsc = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const normalizePhone = (v) => (v || '').replace(/[\s\-()]/g, '').replace(/^(\+|00)/, '')
  const isValidSaPhone = (v) => {
    const n = normalizePhone(v)
    return /^(966)?5\d{8}$/.test(n) || /^0?5\d{8}$/.test(n)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.email) return setError('البريد الإلكتروني مطلوب')
    if (!form.phone.trim()) return setError('رقم الجوال مطلوب')
    if (!isValidSaPhone(form.phone)) return setError('صيغة رقم الجوال غير صحيحة (مثال: 05xxxxxxxx)')
    if (!form.password || form.password.length < 6) return setError('كلمة المرور 6 أحرف على الأقل')
    setLoading(true)
    try {
      const n = normalizePhone(form.phone)
      const canonicalPhone = /^966/.test(n) ? n : /^0/.test(n) ? '966' + n.slice(1) : '966' + n
      await api.post('/admin/users', { ...form, phone: canonicalPhone })
      onDone()
    } catch (err) {
      setError(err.response?.data?.error || 'فشل إنشاء المستخدم')
    } finally { setLoading(false) }
  }

  return createPortal(
    <div className="adm-users-modal" dir="rtl" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-head">
          <h2 className="modal-title">إنشاء مستخدم جديد</h2>
          <button onClick={onClose} className="modal-close" aria-label="إغلاق"><X size={18} /></button>
        </div>

        {error && <div className="modal-err">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="field">
            <label className="field-label">الاسم الكامل</label>
            <input className="input" type="text" dir="rtl" value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="أحمد محمد" />
          </div>
          <div className="field">
            <label className="field-label">البريد الإلكتروني</label>
            <input className="input" type="email" dir="ltr" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="user@example.com" />
          </div>
          <div className="field">
            <label className="field-label">رقم الجوال <span style={{ color: '#B91C1C' }}>*</span></label>
            <input className="input" type="tel" dir="ltr" inputMode="tel" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="05xxxxxxxx" />
          </div>
          <div className="field">
            <label className="field-label">كلمة المرور المؤقتة</label>
            <div className="pwd-wrap">
              <input className="input" type={showPass ? 'text' : 'password'} dir="ltr" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              <button type="button" onClick={() => setShowPass(p => !p)} className="pwd-toggle" aria-label="عرض/إخفاء">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <span className="field-hint">سيُطلب من المستخدم تغييرها عند أول دخول</span>
          </div>

          <div className="modal-actions">
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'جاري الإنشاء...' : 'إنشاء المستخدم'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ── Edit User Modal ───────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onDone }) {
  const [tenants, setTenants]   = useState([])
  const [form, setForm]         = useState({
    full_name:    user.full_name || '',
    phone:        user.phone || '',
    new_password: '',
    tenant_id:    user.tenant_id || '',
    role:         user.role || 'member',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    api.get('/admin/tenants').then(({ data }) => setTenants(data || []))
  }, [])

  useEffect(() => {
    const handleEsc = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const normalizePhone = (v) => (v || '').replace(/[\s\-()]/g, '').replace(/^(\+|00)/, '')
  const isValidSaPhone = (v) => {
    if (!v) return true
    const n = normalizePhone(v)
    return /^(966)?5\d{8}$/.test(n) || /^0?5\d{8}$/.test(n)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.new_password && form.new_password.length < 6)
      return setError('كلمة المرور 6 أحرف على الأقل')
    if (!isValidSaPhone(form.phone))
      return setError('صيغة رقم الجوال غير صحيحة (مثال: 05xxxxxxxx)')
    setLoading(true)
    try {
      const n = normalizePhone(form.phone)
      const canonicalPhone = form.phone
        ? (/^966/.test(n) ? n : /^0/.test(n) ? '966' + n.slice(1) : '966' + n)
        : ''
      await api.put(`/admin/users/${user.id}`, {
        full_name:    form.full_name,
        phone:        canonicalPhone,
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
    <div className="adm-users-modal" dir="rtl" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-head">
          <h2 className="modal-title">تعديل المستخدم</h2>
          <button onClick={onClose} className="modal-close" aria-label="إغلاق"><X size={18} /></button>
        </div>

        <p className="modal-sub" style={{ fontFamily: 'ui-monospace, monospace' }}>{user.email}</p>

        {error && <div className="modal-err">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="field">
            <label className="field-label">الاسم الكامل</label>
            <input className="input" type="text" dir="rtl" value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>

          <div className="field">
            <label className="field-label">رقم الجوال</label>
            <input className="input" type="tel" dir="ltr" inputMode="tel" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="05xxxxxxxx" />
          </div>

          <div className="field">
            <label className="field-label">
              كلمة مرور جديدة <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(اتركها فارغة لعدم التغيير)</span>
            </label>
            <div className="pwd-wrap">
              <input className="input" type={showPass ? 'text' : 'password'} dir="ltr" value={form.new_password}
                onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
                placeholder="••••••" />
              <button type="button" onClick={() => setShowPass(p => !p)} className="pwd-toggle" aria-label="عرض/إخفاء">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="field">
            <label className="field-label">المستأجر</label>
            <select className="input" value={form.tenant_id} onChange={e => setForm(f => ({ ...f, tenant_id: e.target.value }))}>
              <option value="">بدون مستأجر</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>)}
            </select>
          </div>

          <div className="field">
            <label className="field-label">الدور</label>
            <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="admin">مدير</option>
              <option value="member">مستخدم</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Users() {
  const [users, setUsers]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [assignTarget, setAssignTarget] = useState(null)
  const [editTarget, setEditTarget]     = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showCreate, setShowCreate]     = useState(false)
  const [search, setSearch]             = useState('')
  const [page, setPage]                 = useState(1)

  useEffect(() => { load() }, [])
  useEffect(() => { setPage(1) }, [search])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/users')
      setUsers(data || [])
    } catch {
      toast.error('فشل تحميل المستخدمين')
    } finally { setLoading(false) }
  }

  async function handleDelete() {
    const id = deleteTarget.id
    setDeleteTarget(null)
    try {
      await api.delete(`/admin/users/${id}`)
      toast.success('تم حذف المستخدم')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل الحذف')
    }
  }

  const pending = users.filter(u => u.status === 'pending')

  const filtered = useMemo(() => {
    if (!search) return users
    const q = search.toLowerCase()
    return users.filter(u =>
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    )
  }, [users, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const firstIdx = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const lastIdx  = Math.min(currentPage * PAGE_SIZE, filtered.length)

  return (
    <div className="adm-users">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">إدارة المستخدمين</h1>
          <div className="t-small">{users.length} مستخدم · {pending.length} في الانتظار</div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary">
          <UserPlus size={15} /> مستخدم جديد
        </button>
      </div>

      {/* Pending users — need attention */}
      {pending.length > 0 && (
        <div className="surface adm-tbl-wrap" style={{ marginBottom: 'var(--space-4, 16px)' }}>
          <div className="adm-sec-head">
            <span className="adm-sec-title"><Clock size={14} /> في انتظار التفعيل</span>
            <span className="adm-status s-pending">{pending.length} مستخدم</span>
          </div>
          {pending.map(u => (
            <div key={u.id} className="adm-pending-row">
              <div style={{ minWidth: 0 }}>
                <div className="row-name">{u.full_name || '—'}</div>
                <div className="t-mono">{u.email}</div>
                {u.phone && <div className="t-mono" dir="ltr">{u.phone}</div>}
                <div className="t-small">سجّل في {fmtDate(u.registered_at)}</div>
              </div>
              <div className="adm-actions">
                <button onClick={() => setAssignTarget(u)} className="adm-icon-btn" title="تعيين مستأجر">
                  <Building2 size={13} />
                </button>
                <button onClick={() => setDeleteTarget(u)} className="adm-icon-btn danger" title="حذف">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="adm-filter-bar">
        <input className="input" placeholder="🔍 بحث بالاسم أو البريد أو الجوال..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* All users */}
      <div className="surface adm-tbl-wrap">
        {loading ? (
          <div style={{ padding: 16 }}><TableSkeleton rows={6} cols={7} /></div>
        ) : users.length === 0 ? (
          <div className="adm-state">لا يوجد مستخدمون بعد</div>
        ) : filtered.length === 0 ? (
          <div className="adm-state">لا توجد نتائج مطابقة</div>
        ) : (
          <>
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>البريد الإلكتروني</th>
                  <th>رقم الجوال</th>
                  <th>الحالة</th>
                  <th>المستأجر</th>
                  <th>الدور</th>
                  <th>تاريخ التسجيل</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(u => {
                  const s = statusInfo(u.status)
                  return (
                    <tr key={u.id}>
                      <td><strong>{u.full_name || '—'}</strong></td>
                      <td className="t-mono">{u.email}</td>
                      <td className="t-mono" dir="ltr">{u.phone || '—'}</td>
                      <td>
                        <span className={`adm-status s-${s.cls}`}>
                          <s.Icon size={10} /> {s.label}
                        </span>
                      </td>
                      <td>{u.tenant_name || <span style={{ color: 'var(--text-muted)' }}>غير مُعيَّن</span>}</td>
                      <td>{u.role === 'admin' ? 'مدير' : u.role === 'member' ? 'مستخدم' : '—'}</td>
                      <td className="t-small">{fmtDate(u.registered_at)}</td>
                      <td>
                        <div className="adm-actions">
                          {u.status === 'pending' && (
                            <button onClick={() => setAssignTarget(u)} className="adm-icon-btn" title="تعيين مستأجر">
                              <Building2 size={13} />
                            </button>
                          )}
                          <button onClick={() => setEditTarget(u)} className="adm-icon-btn" title="تعديل">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleteTarget(u)} className="adm-icon-btn danger" title="حذف">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="adm-cards-mobile">
              {paged.map(u => {
                const s = statusInfo(u.status)
                return (
                  <div key={u.id} className="adm-card-row">
                    <div className="card-title">{u.full_name || '—'}</div>
                    <div className="kv"><span className="k">البريد</span><span className="t-mono">{u.email}</span></div>
                    {u.phone && <div className="kv"><span className="k">الجوال</span><span className="t-mono" dir="ltr">{u.phone}</span></div>}
                    <div className="kv"><span className="k">الحالة</span><span className={`adm-status s-${s.cls}`}><s.Icon size={10} /> {s.label}</span></div>
                    <div className="kv"><span className="k">المستأجر</span><span>{u.tenant_name || 'غير مُعيَّن'}</span></div>
                    <div className="kv kv-actions">
                      <div className="adm-actions">
                        {u.status === 'pending' && (
                          <button onClick={() => setAssignTarget(u)} className="adm-icon-btn"><Building2 size={13} /></button>
                        )}
                        <button onClick={() => setEditTarget(u)} className="adm-icon-btn"><Pencil size={13} /></button>
                        <button onClick={() => setDeleteTarget(u)} className="adm-icon-btn danger"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="adm-pagination">
              <span className="t-small">عرض {firstIdx}–{lastIdx} من {filtered.length}</span>
              <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onDone={() => { setEditTarget(null); toast.success('تم تحديث المستخدم بنجاح'); load() }}
        />
      )}

      {assignTarget && (
        <AssignModal
          user={assignTarget}
          onClose={() => setAssignTarget(null)}
          onDone={() => { setAssignTarget(null); toast.success('تم تعيين المستخدم بنجاح'); load() }}
        />
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onDone={() => { setShowCreate(false); toast.success('تم إنشاء المستخدم بنجاح'); load() }}
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
