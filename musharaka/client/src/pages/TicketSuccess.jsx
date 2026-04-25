/**
 * TicketSuccess — shown after a support ticket is submitted successfully.
 */
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, Home } from 'lucide-react'
import './ticket.css'

export default function TicketSuccess() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const ticketRef  = params.get('ref') || '—'

  return (
    <div className="ticket-page">
      <div className="surface tk-success">
        <div className="tk-success-icon">
          <CheckCircle2 size={40} />
        </div>
        <h1>تم استلام طلبك بنجاح</h1>
        <div className="hint">رقم تذكرتك هو</div>
        <div className="tk-ticket-ref">#{ticketRef}</div>
        <p>
          سيتواصل معك فريق الدعم عبر البريد الإلكتروني في أقرب وقت ممكن.
          <br />
          يرجى الاحتفاظ برقم التذكرة للمتابعة.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          <Home size={15} />
          العودة للرئيسية
        </button>
      </div>
    </div>
  )
}
