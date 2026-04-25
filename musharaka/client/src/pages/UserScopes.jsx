/**
 * UserScopes — tenant-admin page at /users/scopes
 *
 * Lists tenant members and lets the manager assign them to specific branches.
 * Admins (managers) themselves are read-only — they always have full access.
 *
 * No add/delete buttons here on purpose: super-admin owns user lifecycle.
 */
import { useEffect, useMemo, useState } from 'react'
import api from '../lib/axiosClient'
import { TableSkeleton } from '../components/SkeletonLoader'
import EmptyState from '../components/EmptyState'
import { toast } from '../lib/useToast'
import { Users, Save, ShieldCheck } from 'lucide-react'

function MemberRow({ member, branches, initialBranchIds, onSaved }) {
  const [selected, setSelected] = useState(new Set(initialBranchIds))
  const [saving, setSaving]     = useState(false)

  const dirty = useMemo(() => {
    if (selected.size !== initialBranchIds.length) return true
    for (const id of initialBranchIds) if (!selected.has(id)) return true
    return false
  }, [selected, initialBranchIds])

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.put(`/tenant-admin/users/${member.id}/branches`, {
        branch_ids: Array.from(selected),
      })
      toast.success('تم حفظ صلاحيات الفروع')
      onSaved(Array.from(selected))
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="surface" style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 600 }}>{member.full_name || member.email}</div>
          <div className="t-small" style={{ color: 'var(--text-muted)' }}>{member.email}</div>
        </div>
        <span className="adm-status s-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Users size={12} /> مستخدم
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 12 }}>
        {branches.map(b => (
          <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, border: '1px solid var(--border)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selected.has(b.id)}
              onChange={() => toggle(b.id)}
            />
            <span style={{ fontSize: 13 }}>
              <strong>{b.code}</strong> — {b.name}
            </span>
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!dirty || saving}
          onClick={handleSave}
        >
          <Save size={14} /> {saving ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </div>
    </div>
  )
}

export default function UserScopes() {
  const [members, setMembers]     = useState([])
  const [branches, setBranches]   = useState([])
  const [scopes, setScopes]       = useState({})  // userId → branch_ids[]
  const [loading, setLoading]     = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [usersRes, branchesRes] = await Promise.all([
        api.get('/tenant-admin/users'),
        api.get('/branches'),
      ])
      const allUsers = usersRes.data || []
      const onlyMembers = allUsers.filter(u => u.role === 'member')
      setMembers(onlyMembers)
      setBranches(branchesRes.data || [])

      // Load each member's current branches
      const scopeMap = {}
      await Promise.all(
        onlyMembers.map(async u => {
          try {
            const { data } = await api.get(`/tenant-admin/users/${u.id}/branches`)
            scopeMap[u.id] = data?.branch_ids || []
          } catch { scopeMap[u.id] = [] }
        })
      )
      setScopes(scopeMap)
    } catch {
      toast.error('فشل تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const adminUser = useMemo(
    () => null,  // admins are excluded from `members`; shown separately if needed
    []
  )

  return (
    <div className="adm-users">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">إدارة صلاحيات الفروع</h1>
          <div className="t-small">
            حدد الفروع التي يمكن لكل مستخدم رؤيتها وإدارتها
          </div>
        </div>
      </div>

      <div className="surface" style={{ padding: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldCheck size={16} style={{ color: 'var(--brand)' }} />
        <span className="t-small">
          مدير الحساب لديه وصول كامل تلقائياً لجميع الفروع. هذه الصفحة تتحكم فقط في صلاحيات المستخدمين العاديين.
        </span>
      </div>

      {loading ? (
        <div className="surface" style={{ padding: 16 }}>
          <TableSkeleton rows={4} cols={3} />
        </div>
      ) : members.length === 0 ? (
        <div className="surface" style={{ padding: 24 }}>
          <EmptyState
            icon={Users}
            title="لا يوجد مستخدمون عاديون بعد"
            description="عند إضافة مستخدمين جدد إلى الحساب من قبل المشرف العام، ستظهر هنا لتخصيص صلاحيات الفروع."
          />
        </div>
      ) : branches.length === 0 ? (
        <div className="surface" style={{ padding: 24 }}>
          <EmptyState
            icon={Users}
            title="لا توجد فروع لتخصيصها"
            description="أضف فرعاً واحداً على الأقل من صفحة الفروع قبل تخصيص الصلاحيات."
          />
        </div>
      ) : (
        members.map(m => (
          <MemberRow
            key={m.id}
            member={m}
            branches={branches}
            initialBranchIds={scopes[m.id] || []}
            onSaved={(next) => setScopes(prev => ({ ...prev, [m.id]: next }))}
          />
        ))
      )}
    </div>
  )
}
