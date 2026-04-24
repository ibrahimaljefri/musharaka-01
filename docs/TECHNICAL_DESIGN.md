# Technical Design Document (TDD)
## Musharaka — Tenant Sales Management System

**Version:** 1.0  
**Date:** 2026-04-24  
**Status:** Post-Phase 1 migration (Supabase → cPanel PostgreSQL)

---

## 1. System Overview

Musharaka is a single-tenant SaaS (multiple tenants per deployment) that digitises the collection of monthly sales figures from mall / commercial-centre tenants for revenue-share rent reconciliation.

- **Primary users:** mall tenants (sales operators) and one super-admin (landlord ops).
- **Primary business flow:** tenant logs sales → super-admin reconciles via scheduled Cenomi submissions → rent invoicing happens downstream.
- **Deployment:** single cPanel server hosting Node.js API + static SPA + PostgreSQL DB.

## 2. Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                        │
│                                                                │
│  Vite + React SPA (RTL, Arabic-first)                          │
│  • Zustand auth store   • axios client (Bearer JWT)            │
│  • React Router         • Lazy routes                          │
│                                                                │
│                        https://apps.stepup2you.com             │
└────────────────┬───────────────────────────────────────────────┘
                 │ HTTPS
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│           cPanel Node.js 22 (Passenger + nohup fallback)        │
│                    Express API on :3001                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  helmet · CORS · cookie-parser · rateLimit · multer      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  /api/auth/*        JWT issuance (HS256, 15m access + 30d      │
│                     refresh cookie, rotation on refresh)       │
│  /api/branches/*    Tenant-scoped CRUD                         │
│  /api/sales/*       Sales + Excel template + import            │
│  /api/submit        Cenomi submission + RPC                    │
│  /api/contracts     Public API (JWT or X-API-Key)              │
│  /api/tickets/*     Support tickets + multer disk storage      │
│  /api/admin/*       Super-admin management                     │
│  /api/bot/*         Telegram webhook                           │
│                                                                │
│  BullMQ worker      Sale import queue (Redis optional)         │
│  Nodemailer         cPanel SMTP for password resets            │
└────────┬─────────────────────────────────┬────────────────────┘
         │ pg.Pool (connection-string)     │ axios
         │                                 │
         ▼                                 ▼
┌──────────────────────────┐    ┌──────────────────────────────┐
│ cPanel PostgreSQL 13+    │    │ Cenomi API (سينومي)          │
│                          │    │ POST /sales-data             │
│ 15 schema files          │    │ x-api-token: <tenant token>  │
│ App-level tenant         │    └──────────────────────────────┘
│ isolation via tenant_id  │
│                          │    ┌──────────────────────────────┐
│ Tables: app_users,       │    │ Telegram Bot API             │
│ tenants, tenant_users,   │    │ Webhook → /api/bot/telegram  │
│ super_admins, branches,  │    └──────────────────────────────┘
│ sales, submissions,      │
│ api_keys, support_       │    ┌──────────────────────────────┐
│ tickets, bot_subscribers │    │ cPanel Disk                  │
│                          │    │ ~/musharaka-uploads/         │
│ Functions:               │    │ <tenant>/<uuid>.ext          │
│ update_updated_at,       │    └──────────────────────────────┘
│ submit_to_seinomy        │
└──────────────────────────┘
```

## 3. Request/Response Shapes

### Auth response (login / signup / refresh)
```json
{
  "accessToken": "eyJhbGci...",
  "user": {
    "id":            "<uuid>",
    "email":         "string",
    "full_name":     "string | null",
    "isSuperAdmin":  false,
    "tenantId":      "<uuid> | null",
    "role":          "admin | member | null",
    "tenant_status": "active | suspended | expired",
    "allowed_input_types":      ["daily", "monthly", "range"],
    "allow_advanced_dashboard": true,
    "allow_import":             true,
    "allow_reports":            true,
    "max_branches":             10,
    "max_users":                8,
    "plan":                     "basic | professional | enterprise"
  }
}
```
Refresh token lives in an `httpOnly; secure; sameSite=lax` cookie.

### Error envelope
```json
{ "error": "رسالة الخطأ بالعربية" }
```

## 4. Key Design Decisions

| Decision                              | Choice                                                              | Rationale                                                         |
|---------------------------------------|---------------------------------------------------------------------|-------------------------------------------------------------------|
| Auth                                  | Custom JWT (HS256) + refresh-token rotation                         | Zero external dependency; full control; 15min access token        |
| DB client                             | `pg.Pool` with thin DSL helper (`src/db/query.js`)                  | Minimal abstraction; explicit SQL remains visible                 |
| Tenant isolation                      | **App-layer** `tenant_id` filter on every query                     | No RLS complexity; enforced in middleware + routes                |
| File storage                          | `multer` memoryStorage → local cPanel disk                           | No S3 cost, single-server setup; auth-gated download endpoint     |
| Email                                 | Nodemailer → cPanel local SMTP                                      | Already licensed via hosting plan                                 |
| Bot platform                          | Telegram only (WhatsApp route gated behind `ENABLE_WHATSAPP_BOT`)   | Single-platform reduces maintenance surface                       |
| Cenomi token storage                  | Per-tenant (encrypted), AES-256-CBC via `utils/crypto.js`           | Cenomi issues one token per customer, not per branch              |
| Excel template generation             | Server-side SheetJS (`xlsx`) with Arabic headers + RTL sheet        | Consistent output across clients; leverages server CPU            |
| Background jobs                       | BullMQ with optional Redis (queue disabled if no REDIS_URL)         | Redis is optional on shared hosting                               |
| Error handling                        | Arabic user-facing messages; no stack traces; semantic HTTP codes   | WCAG + UX; plays well with screen readers                         |

## 5. Security Controls

### Authentication & Authorization
- **Password hashing:** bcrypt, 12 rounds
- **JWT payload:** `{ sub, email, isSuperAdmin, tenantId, role, iat, exp }`
- **Refresh token storage:** SHA-256 hash in `app_sessions`, never raw
- **Forced password change:** `password_hash = 'NEEDS_RESET'` blocks login

### Transport
- HTTPS only (Strict-Transport-Security, preload-ready)
- Secure + HttpOnly + SameSite=lax on refresh cookie

### Headers (set via helmet + custom middleware)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- `X-Permitted-Cross-Domain-Policies: none`

### CORS
- `CLIENT_ORIGIN` env var, comma-separated whitelist; no `*`.

### Rate limiting (express-rate-limit)
- **authLimiter:** 5 POST / 15min on `/api/auth/login|signup|forgot-password|reset-password`
- **strictLimiter:** 10 / 15min on heavy ops (`/api/sales/import`)
- **adminWriteOnly:** 30 / 1min on `/api/admin/*` writes
- **standardLimiter:** 100 / 15min global baseline

### Input validation
- **Zod schemas** on every POST/PUT body
- **Multer filters:** MIME + extension allowlist; strict 5–10 MB size limits; path-traversal rejection
- **SQL:** parameterised queries via `pg.Pool` only

### Secrets management
- All secrets (`JWT_SECRET`, `ENCRYPTION_KEY`, `SMTP_PASS`, `TELEGRAM_BOT_TOKEN`, `DATABASE_URL`) loaded from `process.env` via `dotenv`
- `.env` gitignored; `.env.example` contains placeholder template

## 6. Scalability & Performance

| Capacity                            | Target              | Current          |
|-------------------------------------|---------------------|------------------|
| Concurrent tenants                  | 500                 | 6                |
| Branches total                      | 5,000               | 8                |
| Sales rows / month                  | 100,000             | ~91              |
| API p95 latency                     | < 800 ms            | measured in tests|
| Page load (4G)                      | < 3 s               | measured in tests|

Horizontal scale path if current cPanel hits limits:
1. Move Node.js to a VPS; keep Postgres on cPanel.
2. Add Redis for BullMQ sale import worker.
3. Add CDN in front of static dist assets.

## 7. Observability

- **Server logs:** `~/musharaka.log` (stdout/stderr from nohup).
- **DB logs:** cPanel PostgreSQL service logs (per-db).
- **Client errors:** surfaced via `AlertBanner` Arabic messages; backend errors never expose stack traces.
- **E2E regression:** Playwright suite in `tests/` with HTML + JSON + Word reports.

## 8. Deployment

### One-command deploy
```bash
cd ~/repositories/musharaka-01 && git pull && \
  rsync -a --delete musharaka/server/src/       ~/public_html/musharaka/server/server/src/ && \
  rsync -a --delete musharaka/client/dist/      ~/public_html/musharaka/server/client/dist/ && \
  kill $(pgrep -f "node src/index.js"); sleep 1; \
  nohup ~/nodevenv/public_html/musharaka/server/server/22/bin/node \
    ~/public_html/musharaka/server/server/src/index.js > ~/musharaka.log 2>&1 &
```

### Rollback
- `git checkout <previous-sha>` + re-run rsync.
- Previous dist lives in git history; every build commit is tagged.

## 9. Data Migration History

| Date       | Event                                                                                 |
|------------|---------------------------------------------------------------------------------------|
| 2026-04-24 | Full data migration Supabase → cPanel PostgreSQL (10 tables, 5+6+2+3+8+91+0+1+0+2 rows) |
| 2026-04-24 | Server app code refactored from `supabase.from()` to `pg.Pool` (71 call sites)        |
| 2026-04-24 | Brand cleanup: "بوت تيليجرام" → "المساعد الذكي"; "سينومي" → "منصة التكامل" (public)    |
| 2026-04-24 | Excel template download feature added (`GET /api/sales/import/template`)              |
