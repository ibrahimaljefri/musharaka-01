/**
 * Admin: Support Tickets — list/queue view
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/axiosClient'
import AlertBanner from '../../components/AlertBanner'
import EmptyState from '../../components/EmptyState'
import { TableSkeleton } from '../../components/SkeletonLoader'
import TableControls from '../../components/TableControls'
import SortableHeader from '../../components/SortableHeader'
import Pagination from '../../components/Pagination'
import { Ticket } from 'lucide-react'
import { STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS, CATEGORY_COLORS, fmtTicketDate } from '../../lib/ticketConstants'

const PAGE_SIZE = 20

const STATUS_FILTERS = [
  { value: null,        label: 'الكل' },
  { value: 'open',      label: 'مفتوح' },
  { value: 'in_progress', label: 'قيد المعالجة' },
  { value: 'resolved',  label: 'محلول' },
]

export default function Tickets() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [flash,   setFlash]   = useState(null)
  const [search, setSearch]   = useState('')
  const [statusFilter, setStatusFilter] = useState(null)
  const [sort, setSort]       = useState({ field: null, dir: 'asc' })
  const [page, setPage]       = useState(1)

  useEffect(() => { load() }, [])
  // Reset to page 1 whenever filters/sort change
  useEffect(() => { setPage(1) }, [search, statusFilter, sort])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/tickets')
      setTickets(data || [])
    } catch (err) {
      setFlash({ type: 'error', msg: err.response?.data?.error || 'فشل تحميل التذاكر' })
    } finally { setLoading(false) }
  }

  const filteredSorted = useMemo(() => {
    let list = tickets.filter(t => {
      if (statusFilter && t.status !== statusFilter) return false
      if (!search) return true
      const q = search.toLowerCase()
      return (
        (t.ticket_number || '').toLowerCase().includes(q) ||
        (t.submitter_name || '').toLowerCase().includes(q) ||
        (t.tenant_name || '').toLowerCase().includes(q)
      )
    })

    if (sort.field) {
      list = [...list].sort((a, b) => {
        if (sort.field === 'created_at') {
          const av = a.created_at ? new Date(a.created_at).getTime() : 0
          const bv = b.created_at ? new Date(b.created_at).getTime() : 0
          return sort.dir === 'asc' ? av - bv : bv - av
        }
        const av = a[sort.field] ?? ''
        const bv = b[sort.field] ?? ''
        const cmp = String(av).localeCompare(String(bv), 'ar')
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }
    return list
  }, [tickets, search, statusFilter, sort])

  const totalPages   = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE))
  const currentPage  = Math.min(page, totalPages)
  const pagedTickets = filteredSorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800 font-arabic">تذاكر الدعم</h1>
        <p className="text-xs text-gray-400 font-arabic mt-0.5">إدارة وحل طلبات الدعم المقدمة من العملاء</p>
      </div>

      {flash && <AlertBanner type={flash.type} message={flash.msg} />}

      <div className="card-surface overflow-hidden">
        <div className="section-header">
          <span className="font-semibold text-gray-700 font-arabic text-sm">قائمة التذاكر</span>
          <span className="text-xs text-gray-400 font-arabic">{tickets.length} تذكرة</span>
        </div>

        <div className="px-4 pt-3 space-y-3">
          {/* Search */}
          <TableControls
            value={search}
            onChange={setSearch}
            count={filteredSorted.length}
            total={tickets.length}
            placeholder="بحث برقم التذكرة أو العميل أو المستأجر..."
          />

          {/* Status filter pills */}
          <div className="flex items-center gap-2 flex-wrap pb-1" dir="rtl">
            {STATUS_FILTERS.map(f => (
              <button
                key={String(f.value)}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1 rounded-full text-xs font-arabic border transition-colors ${
                  statusFilter === f.value
                    ? 'bg-yellow-500 text-white border-yellow-500'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-yellow-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={5} />
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="لا توجد تذاكر بعد"
            description="ستظهر هنا تذاكر الدعم المقدمة من العملاء"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">رقم التذكرة والحالة</th>
                  <th className="px-4 py-3 text-right font-medium">المستأجر</th>
                  <th className="px-4 py-3 text-right font-medium">العميل</th>
                  <th className="px-4 py-3 text-right font-medium">التصنيف</th>
                  <SortableHeader field="created_at" sort={sort} onSort={setSort}>تاريخ الإنشاء</SortableHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedTickets.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/admin/tickets/${t.id}`)}
                    className="hover:bg-yellow-50/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono font-semibold text-gray-800 text-xs">{t.ticket_number}</span>
                        <span className={`inline-flex w-fit text-xs px-2 py-0.5 rounded-full font-arabic ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[t.status] || t.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-arabic text-sm text-gray-700">{t.tenant_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-800 font-arabic">{t.submitter_name}</span>
                        <span className="text-xs text-gray-400 font-mono" dir="ltr">{t.submitter_email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-arabic ${CATEGORY_COLORS[t.category] || 'bg-gray-100 text-gray-600'}`}>
                        {CATEGORY_LABELS[t.category] || t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-arabic">{fmtTicketDate(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
