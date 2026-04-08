import { Outlet } from 'react-router-dom'

export default function GuestLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-green-50" dir="rtl">
      {/* Geometric background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-50 rounded-full opacity-30 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md px-4">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="text-4xl font-bold text-yellow-700 font-arabic mb-1">مشاركة</div>
          <div className="text-sm text-gray-500 font-arabic">نظام إدارة المبيعات</div>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
