# Functional Hierarchy Diagram (FHD)
## Musharaka — Tenant Sales Management System

**Version:** 1.0  
**Date:** 2026-04-24  
**Owner:** Ibrahim Aljefri

---

## Top-level Functional Decomposition

```
مشاركة — نظام إدارة المبيعات
│
├── 1.0  المصادقة والحسابات (Authentication & Accounts)
│   ├── 1.1  تسجيل الدخول                     POST /api/auth/login
│   ├── 1.2  تسجيل حساب جديد                  POST /api/auth/signup
│   ├── 1.3  نسيت كلمة المرور                 POST /api/auth/forgot-password
│   ├── 1.4  إعادة تعيين كلمة المرور          POST /api/auth/reset-password
│   ├── 1.5  تغيير كلمة المرور                POST /api/auth/change-password
│   ├── 1.6  تجديد الجلسة (Refresh)           POST /api/auth/refresh
│   ├── 1.7  تسجيل الخروج                     POST /api/auth/logout
│   └── 1.8  بيانات المستخدم الحالي            GET  /api/auth/me
│
├── 2.0  إدارة الفروع (Branches)
│   ├── 2.1  عرض قائمة الفروع                 GET    /api/branches
│   ├── 2.2  إضافة فرع جديد                   POST   /api/branches
│   ├── 2.3  تعديل فرع                        PUT    /api/branches/:id
│   └── 2.4  حذف فرع                          DELETE /api/branches/:id
│
├── 3.0  إدخال المبيعات (Sales Entry)
│   ├── 3.1  إدخال يدوي (daily / monthly / range)
│   │     └── POST /api/sales
│   ├── 3.2  استيراد من Excel / CSV
│   │     ├── 3.2.1  تحميل النموذج الفارغ (prefilled .xlsx)
│   │     │         └── GET /api/sales/import/template
│   │     ├── 3.2.2  معاينة الملف             POST /api/sales/import/preview
│   │     └── 3.2.3  تأكيد الاستيراد          POST /api/sales/import
│   ├── 3.3  عرض سجلات المبيعات                GET /api/sales
│   └── 3.4  حذف سجل مبيعات                   DELETE /api/sales/:id
│
├── 4.0  الإرسال والتسوية (Submit)
│   ├── 4.1  عرض المبيعات المعلقة              GET /api/sales?status=pending
│   ├── 4.2  إرسال دفعة الفترة                 POST /api/submit
│   ├── 4.3  حالة الإرسال                     GET /api/submissions
│   └── 4.4  تكامل منصة العقار (Cenomi integration — internal)
│
├── 5.0  التقارير والتحليلات (Reports)
│   ├── 5.1  المبيعات الزمنية                  GET /api/sales?from=&to=
│   ├── 5.2  مقارنة الفروع                    GET /api/sales?branch_id=
│   ├── 5.3  تصفية حسب الفترة
│   ├── 5.4  لوحة التحليلات المتقدمة (flag: allow_advanced_dashboard)
│   └── 5.5  تصدير CSV
│
├── 6.0  التذاكر والدعم (Tickets)
│   ├── 6.1  إنشاء تذكرة                       POST /api/tickets
│   ├── 6.2  رفع مرفق                          multipart/form-data (.pdf/.png/.jpg)
│   ├── 6.3  تحميل مرفق                        GET /api/tickets/:id/attachment
│   └── 6.4  الأسئلة الشائعة                   /faq (client-side)
│
├── 7.0  المساعد الذكي (Telegram Assistant)
│   ├── 7.1  استقبال أوامر المستخدم            POST /api/bot/telegram (webhook)
│   ├── 7.2  تحليل رسالة المبيعات (NLP)
│   ├── 7.3  تحديد الفرع من السياق
│   └── 7.4  حفظ الفاتورة تلقائياً
│
└── 8.0  لوحة الإدارة (Super-Admin — خاصة بالمشرف العام)
    ├── 8.1  لوحة إحصائيات                    GET /api/admin/stats
    ├── 8.2  إدارة المستأجرين
    │     ├── 8.2.1  قائمة / إضافة / تعديل / حذف
    │     │         (CRUD /api/admin/tenants/:id)
    │     ├── 8.2.2  تعيين خطة اشتراك           (allowed_input_types, allow_import,
    │     │                                     allow_reports, allow_advanced_dashboard)
    │     └── 8.2.3  توكن تكامل Cenomi (مشفّر)  cenomi_api_token
    ├── 8.3  إدارة المستخدمين
    │     ├── 8.3.1  قائمة (/api/admin/users)
    │     ├── 8.3.2  إضافة + تعيين لمستأجر
    │     ├── 8.3.3  إعادة تعيين كلمة المرور
    │     └── 8.3.4  تعطيل / حذف
    ├── 8.4  مفاتيح API للمستأجرين
    │     ├── 8.4.1  إصدار مفتاح جديد (يظهر مرة واحدة)
    │     ├── 8.4.2  تحديد الحقول المسموح الوصول إليها
    │     └── 8.4.3  إلغاء
    ├── 8.5  مشتركو المساعد الذكي              /api/admin/bot-subscribers
    ├── 8.6  التذاكر (عرض + تغيير الحالة)      /api/admin/tickets
    └── 8.7  الإعدادات العامة
```

---

## Actor × Function Matrix

| Function                              | Guest | Tenant Member | Tenant Admin | Super-Admin |
|---------------------------------------|:-----:|:-------------:|:------------:|:-----------:|
| 1.1 Login                             |   ✓   |       ✓       |      ✓       |      ✓      |
| 1.2 Signup                            |   ✓   |       —       |      —       |      —      |
| 2.0 Branches CRUD                     |   —   |       R       |     CRUD     |     CRUD    |
| 3.1 Manual sale entry                 |   —   |       ✓       |      ✓       |      —      |
| 3.2 Excel import                      |   —   |  if allowed   |  if allowed  |      —      |
| 4.0 Submit to Cenomi                  |   —   |       ✓       |      ✓       |      —      |
| 5.0 Reports                           |   —   |  if allowed   |  if allowed  |      ✓      |
| 6.0 Create support ticket             |   —   |       ✓       |      ✓       |      —      |
| 7.0 Use Telegram assistant            |   —   | if subscribed | if subscribed|      —      |
| 8.0 Admin console                     |   —   |       —       |      —       |      ✓      |

`R` = read-only · `CRUD` = full access · `—` = denied

---

## Data Flow Summary

1. **Sales entry flow**: Tenant user → Client UI → `POST /api/sales` → `pg.Pool` → `sales` table
2. **Import flow**: User downloads template (server-side .xlsx generation) → fills → uploads → `importService.parseBuffer` → BullMQ queue → `saleImportWorker` → `sales` table
3. **Submit flow**: User selects branch+period → `seinomyApiService.submit` → Cenomi REST API (`POST /sales-data`) → `submit_to_seinomy()` Postgres function → `submissions` + `sales.status='sent'`
4. **Bot flow**: Telegram webhook → `botService.processMessage` → NLP extraction → `sales` insert
5. **Auth flow**: `POST /api/auth/login` → bcrypt verify → JWT issued (15min access + 30d refresh cookie) → subsequent requests carry `Authorization: Bearer` header

---

## Session-level Feature Flags (per tenant)

| Flag                         | Default | Controls                                            |
|------------------------------|---------|-----------------------------------------------------|
| `allowed_input_types`        | `[daily]` | Which `input_type` values are accepted on POST /api/sales |
| `allow_import`               | `false` | Access to Excel/CSV import page                     |
| `allow_reports`              | `false` | Access to Reports page                              |
| `allow_advanced_dashboard`   | `false` | Advanced analytics dashboard                        |
| `max_branches`               | 3       | Hard limit on branches created per tenant           |
| `max_users`                  | 10      | Hard limit on tenant_users rows                     |
