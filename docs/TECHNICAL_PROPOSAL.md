# Technical Proposal and Scope of Work
## Musharaka — Tenant Sales Management System

**Version:** 1.0  
**Date:** 2026-04-24  
**Prepared for:** Stakeholders / Steering Committee  
**Prepared by:** Ibrahim Aljefri

---

## 1. Executive Summary

Musharaka is a production-ready, Arabic-first SaaS platform that replaces the manual process of collecting monthly sales figures from commercial-centre tenants for revenue-share rent reconciliation. It gives mall operators a single dashboard, gives tenants four intake channels (manual, Excel import, API, Telegram assistant), and automates the end-of-month transmission to the landlord's integration platform.

The system is live at **apps.stepup2you.com** and has been fully migrated off third-party SaaS dependencies (Supabase + Render) onto a self-owned cPanel stack, eliminating recurring vendor costs.

## 2. Problem Statement

Mall operators typically require ~500 shop tenants to report monthly sales figures, then compute percentage rent. The status quo is:
- Email / WhatsApp submissions collected manually
- Spreadsheets consolidated by a clerk
- Transcription errors and lost data
- No audit trail
- No standardised cut-off date
- 3–5 business days of reconciliation each month

## 3. Proposed Solution

A cloud-hosted, multi-tenant SaaS with:
- Arabic RTL interface (≥98% of end-user strings localised)
- Three user roles (Super-Admin, Tenant Admin, Tenant Member)
- Four sales-entry channels: manual form, Excel/CSV import, REST API, Telegram assistant
- Automated monthly submission to landlord's integration platform (Cenomi API)
- Per-tenant feature flags (plan-based)
- Ticketed support desk built-in

## 4. System Architecture

See **TECHNICAL_DESIGN.md** for the full architecture diagram. High-level:
- **Frontend:** Vite + React SPA (static files served by Node)
- **Backend:** Node.js 22 + Express + pg.Pool on cPanel
- **Database:** PostgreSQL 13+ on cPanel (single database per deployment)
- **Auth:** Custom JWT (HS256, 15-min access + 30-day refresh cookie rotation)
- **File storage:** cPanel disk with auth-gated download endpoint
- **Email:** cPanel SMTP via Nodemailer
- **Bot:** Telegram webhook for conversational sales entry

## 5. Scope of Work

### 5.1 Completed Scope

| # | Module                        | Description                                                           | Status       |
|---|-------------------------------|-----------------------------------------------------------------------|--------------|
| 1 | Authentication                | JWT login, signup, refresh, change / reset password, password rules   | ✅ Complete  |
| 2 | Branch Management             | CRUD, tenant scoping, max_branches plan limit                         | ✅ Complete  |
| 3 | Manual Sales Entry            | Daily / monthly / range input with license-window validation          | ✅ Complete  |
| 4 | Excel / CSV Import            | Upload, preview, confirm, background worker, Arabic column mapping    | ✅ Complete  |
| 5 | Excel Template Download       | Server-generated prefilled .xlsx with RTL + Arabic headers             | ✅ Complete (Phase 4) |
| 6 | Cenomi Submission             | `lease_id` payload, tenant-level token, atomic Postgres RPC           | ✅ Complete  |
| 7 | Reports                       | Date-range filtering, branch comparison, CSV export                    | ✅ Complete  |
| 8 | Support Tickets               | Multi-category, attachments (PNG/JPG/PDF), status workflow            | ✅ Complete  |
| 9 | Telegram Assistant            | NLP sales parsing, branch inference, subscriber provisioning          | ✅ Complete  |
| 10 | Landing Page                 | Marketing page, pricing table, RTL                                     | ✅ Complete  |
| 11 | Super-Admin — Tenants        | CRUD, plan assignment, feature flags, Cenomi token mgmt                | ✅ Complete  |
| 12 | Super-Admin — Users          | CRUD, tenant assignment, password reset, deactivation                  | ✅ Complete  |
| 13 | Super-Admin — API Keys       | Generate (shown once), revoke, field-level allow-list                  | ✅ Complete  |
| 14 | Super-Admin — Tickets        | List, detail, status change, admin_comment                             | ✅ Complete  |
| 15 | Super-Admin — Bot Subscribers| Platform, chat_id, activation toggle                                   | ✅ Complete  |
| 16 | DB Migration                  | Supabase → cPanel PostgreSQL (10 tables, 118 rows)                    | ✅ Complete (Phase 1) |
| 17 | Brand Cleanup                 | Public pages and marketing docs scrubbed of "Bot" / "Cenomi"          | ✅ Complete (Phase 3) |
| 18 | Test Suite                    | 531 E2E + 250 API regression tests, Word report with screenshots      | ✅ Complete (Phase 5) |

### 5.2 Scope Exclusions

- Native iOS / Android app (PWA-compatible responsive web only)
- Multi-currency (SAR only)
- Offline mode with sync
- BI / Analytics beyond the built-in reports module
- Integration with POS systems beyond CSV/Excel import
- Multi-language UI beyond Arabic (English strings exist as hard-coded labels only)

## 6. Non-Functional Requirements

| Requirement            | Target                                      | Verification                       |
|------------------------|---------------------------------------------|------------------------------------|
| Availability           | 99.5% uptime (cPanel SLA)                   | Hosting-provider SLA               |
| API p95 latency        | < 800 ms                                    | Playwright perf assertions         |
| Page load (4G)         | < 3 s                                       | Lighthouse + Playwright timing     |
| Security               | OWASP Top 10 mitigated                      | 30 SEC-* regression tests          |
| Tenant isolation       | No cross-tenant data visible                | 15 isolation-specific tests        |
| RTL support            | 100% Arabic UI, BiDi-safe                   | 20 bidi.spec.ts tests              |
| Browser support        | Last 2 major of Chrome/Firefox/Safari/Edge | 5 Playwright projects              |
| Mobile support         | iOS 16+ / Android 12+                       | `mobile` + `tablet` Playwright projects |
| Data retention         | 5 years                                     | Postgres backup schedule (manual)  |
| Backup cadence         | Daily                                       | cPanel automatic backup            |

## 7. Timeline & Milestones

| Phase                                  | Duration       | Status       |
|----------------------------------------|---------------|--------------|
| Phase 0 — Pre-work (WhatsApp removal)  | 1 day         | ✅ Completed  |
| Phase 1 — Database migration to cPanel | 2 days        | ✅ Completed  |
| Phase 2 — Cenomi integration fixes     | Same day      | ✅ Completed  |
| Phase 3 — Brand cleanup                | Same day      | ✅ Completed  |
| Phase 4 — Excel template feature       | Same day      | ✅ Completed  |
| Phase 5 — Full test suite              | 1 day         | ✅ Completed  |
| Phase 6 — Technical documentation      | Same day      | ✅ Completed  |

All phases completed on **2026-04-24**.

## 8. Deliverables

1. ✅ **Production deployment** at `https://apps.stepup2you.com`
2. ✅ **Source code** on GitHub (`ibrahimaljefri/musharaka-01`)
3. ✅ **Database migration scripts** (`musharaka/server/scripts/migrate-from-supabase.js`)
4. ✅ **Regression test suite** — 781 total tests, runnable from 192.168.100.79 GPU server
5. ✅ **Word test-result reports** — generated per run with embedded failure screenshots
6. ✅ **Functional Hierarchy Diagram** (`docs/FHD.md`)
7. ✅ **Technical Design Document** (`docs/TECHNICAL_DESIGN.md`)
8. ✅ **Technical Proposal** (this document)
9. ✅ **Cleaned marketing assets** (`*_clean.docx`)

## 9. Operational Handover

### Credentials (stored separately — see cPanel .env)
- Super-admin: `admin@admin.com`
- Test client user: `ibrahimaljefri@yahoo.com`
- Database: `stepupyo_musharaka` owned by `stepupyo_mshadmin`

### Monitoring
- Server log: `~/musharaka.log` (tail this to see API activity)
- DB: cPanel → PostgreSQL → stepupyo_musharaka
- Client CDN: cPanel File Manager → `public_html/musharaka/server/client/dist/`

### Common operations

**Restart server:**
```bash
kill $(pgrep -f "node src/index.js"); sleep 1
cd ~/public_html/musharaka/server/server
nohup ~/nodevenv/public_html/musharaka/server/server/22/bin/node src/index.js > ~/musharaka.log 2>&1 &
```

**Deploy new code:**
```bash
cd ~/repositories/musharaka-01 && git pull origin master
rsync -a --delete musharaka/server/src/  ~/public_html/musharaka/server/server/src/
rsync -a --delete musharaka/client/dist/ ~/public_html/musharaka/server/client/dist/
# then restart (above)
```

**Run tests (from 192.168.100.79):**
```bash
cd ~/musharaka-tests && bash scripts/run-full-suite.sh
# produces playwright-report/Test_Results_<date>.docx
```

## 10. Risk Register

| Risk                                         | Likelihood | Impact | Mitigation                                               |
|----------------------------------------------|------------|--------|----------------------------------------------------------|
| cPanel Postgres hitting connection limits    | Medium     | High   | `pg.Pool max=10`, add Redis queue throttle               |
| Cenomi API rate limits or outages            | Low        | Medium | `SEINOMY_MOCK` failsafe; retry with exponential backoff  |
| JWT secret leakage                           | Low        | Critical | Env-var isolation; quarterly rotation procedure          |
| Data loss on cPanel disk (uploads)           | Medium     | High   | Daily cPanel backup; offline copy to external drive       |
| Landing-page brand drift                     | Low        | Low    | `smoke.spec.ts` SMK-09/SMK-10 enforce copy regression    |
| Test credential leakage                      | Low        | Medium | `.env` gitignored; `.env.example` holds only placeholders |

## 11. Acceptance Criteria

The system is considered accepted for production use when:
- [x] All Phase 1–5 deliverables complete
- [x] Production `GET /api/health` returns `{"status":"ok"}`
- [x] Admin + tenant login both succeed end-to-end
- [x] Full regression suite runs against production without configuration changes
- [x] All `SEC-*` security regression tests pass
- [x] Documentation (FHD, TDD, Proposal) reviewed and approved
