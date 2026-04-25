import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/axiosClient'
import ConfirmDialog from '../../components/ConfirmDialog'
import { TableSkeleton } from '../../components/SkeletonLoader'
import Pagination from '../../components/Pagination'
import { toast } from '../../lib/useToast'
import { Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import './admin-bot-subs.css'

const PAGE_SIZE = 20

// Label/color maps kept for legacy whatsapp rows in the DB; the UI no longer
// offers WhatsApp as a create option but will still render existing rows correctly.
const PLATFORM_LABELS = { telegram: 'تيليجرام', whatsapp: 'واتساب' }

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-SA')
}

export default function BotSubscribers() {
  const [subscribers, setSubscribers]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch]             = useState('')
  const [page, setPage]                 = useState(1)

  useEffect(() => { load() }, [])
  useEffect(() => { setPage(1) }, [search])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/bot-subscribers')
      setSubscribers(data || [])
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل تحميل المشتركين')
    } finally { setLoading(false) }
  }

  async function handleDelete() {
    const id = deleteTarget.id
    setDeleteTarget(null)
    try {
      await api.delete(`/admin/bot-subscribers/${id}`)
      toast.success('تم حذف المشترك بنجاح')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل الحذف')
    }
  }

  const filtered = useMemo(() => {
    if (!search) return subscribers
    const q = search.toLowerCase()
    return subscribers.filter(s =>
      (s.platform || '').toLowerCase().includes(q) ||
      (s.chat_id || '').toLowerCase().includes(q) ||
      (s.tenant_name || '').toLowerCase().includes(q) ||
      (s.contact_name || '').toLowerCase().includes(q)
    )
  }, [subscribers, search])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged       = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const firstIdx    = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const lastIdx     = Math.min(currentPage * PAGE_SIZE, filtered.length)

  return (
    <div className="adm-bot-subs">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">مشتركو الروبوت</h1>
          <div className="t-small">{subscribers.length} مشترك · إدارة حسابات تيليجرام المرتبطة بالفروع</div>
        </div>
        <Link to="/admin/bot-subscribers/create" className="btn btn-primary">
          <Plus size={15} /> مشترك جديد
        </Link>
      </div>

      <div className="adm-filter-bar">
        <input className="input"
          placeholder="🔍 بحث بالمنصة أو المعرّف أو المستأجر..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="surface adm-tbl-wrap">
        {loading ? (
          <div style={{ padding: 16 }}><TableSkeleton rows={5} cols={8} /></div>
        ) : subscribers.length === 0 ? (
          <div className="adm-state">لا يوجد مشتركون بعد</div>
        ) : filtered.length === 0 ? (
          <div className="adm-state">لا توجد نتائج مطابقة</div>
        ) : (
          <>
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>المستأجر</th>
                  <th>الفرع</th>
                  <th>المنصة</th>
                  <th>معرّف الدردشة</th>
                  <th>الاسم</th>
                  <th>الحالة</th>
                  <th>آخر رسالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(s => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.tenant_name}</strong>
                      {s.contract_number && <div className="t-mono" style={{ fontSize: '0.7rem' }}>{s.contract_number}</div>}
                    </td>
                    <td>
                      <div>{s.branch_name}</div>
                      <div className="t-mono" style={{ fontSize: '0.7rem' }}>{s.branch_code}</div>
                    </td>
                    <td>
                      <span className={`adm-tag s-${s.platform}`}>
                        {PLATFORM_LABELS[s.platform] || s.platform}
                      </span>
                    </td>
                    <td className="t-mono" dir="ltr">{s.chat_id}</td>
                    <td>{s.contact_name || '—'}</td>
                    <td>
                      {s.is_active
                        ? <span className="adm-tag s-active"><CheckCircle2 size={10} />نشط</span>
                        : <span className="adm-tag s-inactive"><XCircle size={10} />معطل</span>
                      }
                    </td>
                    <td className="t-small">{fmtDate(s.last_message_at)}</td>
                    <td>
                      <div className="adm-actions">
                        <Link to={`/admin/bot-subscribers/${s.id}/edit`} className="adm-icon-btn" title="تعديل" aria-label="تعديل">
                          <Edit2 size={13} />
                        </Link>
                        <button onClick={() => setDeleteTarget(s)} className="adm-icon-btn danger" title="حذف" aria-label="حذف">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="adm-cards-mobile">
              {paged.map(s => (
                <div key={s.id} className="adm-card-row">
                  <div className="card-title">{s.tenant_name}</div>
                  <div className="kv"><span className="k">الفرع</span><span>{s.branch_name}</span></div>
                  <div className="kv"><span className="k">المنصة</span>
                    <span className={`adm-tag s-${s.platform}`}>{PLATFORM_LABELS[s.platform] || s.platform}</span>
                  </div>
                  <div className="kv"><span className="k">معرّف</span><span className="t-mono" dir="ltr">{s.chat_id}</span></div>
                  <div className="kv"><span className="k">الحالة</span>
                    {s.is_active
                      ? <span className="adm-tag s-active"><CheckCircle2 size={10} />نشط</span>
                      : <span className="adm-tag s-inactive"><XCircle size={10} />معطل</span>}
                  </div>
                  <div className="kv kv-actions">
                    <div className="adm-actions">
                      <Link to={`/admin/bot-subscribers/${s.id}/edit`} className="adm-icon-btn"><Edit2 size={13} /></Link>
                      <button onClick={() => setDeleteTarget(s)} className="adm-icon-btn danger"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="adm-pagination">
              <span className="t-small">عرض {firstIdx}–{lastIdx} من {filtered.length}</span>
              <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="حذف المشترك"
        message={`هل أنت متأكد من حذف مشترك "${deleteTarget?.contact_name || deleteTarget?.chat_id}"؟`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
