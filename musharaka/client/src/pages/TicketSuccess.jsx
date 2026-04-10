/**
 * TicketSuccess — shown after a support ticket is submitted successfully.
 * Reads ?ref=SUP-1001 from the URL.
 */
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, Home } from 'lucide-react'

export default function TicketSuccess() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const ticketRef  = params.get('ref') || '—'

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-800 font-arabic">
            تم استلام طلبك بنجاح
          </h1>
          <p className="text-gray-500 font-arabic text-sm">
            رقم تذكرتك هو
          </p>
          <div className="inline-block bg-gray-100 border border-gray-200 rounded-xl px-6 py-3">
            <span className="text-2xl font-mono font-bold text-gray-800 tracking-wider">
              #{ticketRef}
            </span>
          </div>
        </div>

        <p className="text-gray-500 font-arabic text-sm leading-relaxed">
          سيتواصل معك فريق الدعم عبر البريد الإلكتروني في أقرب وقت ممكن.
          <br />
          يرجى الاحتفاظ برقم التذكرة للمتابعة.
        </p>

        <button onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors font-arabic">
          <Home size={15} />
          العودة للرئيسية
        </button>
      </div>
    </div>
  )
}
