#!/usr/bin/env node
/**
 * build-docs.js — Build all deliverable .docx files from docs/*.md
 *
 * Outputs into docs/deliverables/:
 *   - Functional_Hierarchy_Diagram.docx
 *   - Technical_Design_Document.docx
 *   - Technical_Proposal.docx
 *   - Urwa_Marketing_Overview.docx    (updated with current tech stack)
 *
 * Usage:  cd <project-root> && node scripts/build-docs.js
 * Requires: docx (^8.5.0)
 */

const fs   = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableCell, TableRow, WidthType, AlignmentType, PageBreak, BorderStyle,
} = require('docx')

const OUT_DIR = path.join(__dirname, '..', 'docs', 'deliverables')
fs.mkdirSync(OUT_DIR, { recursive: true })

// ── Helpers ──────────────────────────────────────────────────────────────
const clean = s => String(s || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')

const H = (text, level = HeadingLevel.HEADING_1) =>
  new Paragraph({ heading: level, children: [new TextRun({ text: clean(text), bold: true })] })

const P = (text = '', opts = {}) =>
  new Paragraph({ alignment: opts.align, children: [new TextRun({ text: clean(text), ...opts })] })

const B = text => P(text, { bold: true })
const I = text => P(text, { italics: true })

const code = text => new Paragraph({
  children: [new TextRun({ text: clean(text), font: 'Consolas', size: 18 })],
  shading:  { type: 'clear', color: 'auto', fill: 'F3F4F6' },
})

function cell(text, opts = {}) {
  return new TableCell({
    children: [P(text, { bold: !!opts.bold })],
    width: { size: opts.pct || 20, type: WidthType.PERCENTAGE },
  })
}

function row(cells) { return new TableRow({ children: cells }) }

function table(rows, widths) {
  const trs = rows.map((r, i) => row(r.map((c, j) =>
    cell(c, { pct: widths?.[j] || 100 / r.length, bold: i === 0 })
  )))
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: trs })
}

function bullet(text) {
  return new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: clean(text) })] })
}

function pageBreak() { return new Paragraph({ children: [new PageBreak()] }) }

function save(name, children) {
  const doc = new Document({
    creator: 'Urwa',
    title:   name,
    sections: [{ children }],
  })
  const file = path.join(OUT_DIR, name + '.docx')
  return Packer.toBuffer(doc).then(buf => {
    fs.writeFileSync(file, buf)
    console.log('[OK]', file, `(${buf.length} bytes)`)
  })
}

// ── 1. Functional Hierarchy Diagram ──────────────────────────────────────
async function buildFHD() {
  const ch = []
  ch.push(
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Functional Hierarchy Diagram', bold: true, size: 40 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Urwa — Tenant Sales Management System', size: 24 })] }),
    P(''),
    P(`Version: 1.0`), P(`Date: 2026-04-24`),
    P(''),
    H('1. Top-Level Functional Decomposition'),
    I('Every function maps to a backend endpoint (REST) and a client page (React).'),
  )

  const sections = [
    {
      title: '1.0 Authentication & Accounts',
      rows: [
        ['Function', 'Endpoint', 'UI Page'],
        ['Login',                    'POST /api/auth/login',            '/login'],
        ['Signup',                   'POST /api/auth/signup',           '/register'],
        ['Forgot Password',          'POST /api/auth/forgot-password',  '/forgot-password'],
        ['Reset Password',           'POST /api/auth/reset-password',   '/reset-password'],
        ['Change Password',          'POST /api/auth/change-password',  '/change-password'],
        ['Refresh Session',          'POST /api/auth/refresh',          '(background)'],
        ['Logout',                   'POST /api/auth/logout',           '(header menu)'],
        ['Load Current User',        'GET /api/auth/me',                '(app boot)'],
      ],
    },
    {
      title: '2.0 Branch Management',
      rows: [
        ['Function', 'Endpoint', 'UI Page'],
        ['List Branches',            'GET /api/branches',               '/branches'],
        ['Create Branch',            'POST /api/branches',              '/branches/create'],
        ['Update Branch',            'PUT /api/branches/:id',           '/branches/:id/edit'],
        ['Delete Branch',            'DELETE /api/branches/:id',        '/branches'],
      ],
    },
    {
      title: '3.0 Sales Entry',
      rows: [
        ['Function', 'Endpoint', 'UI Page'],
        ['Manual entry (daily/monthly/range)', 'POST /api/sales',         '/sales/create'],
        ['List sales',               'GET /api/sales',                  '(dashboard, reports)'],
        ['Delete sale',              'DELETE /api/sales/:id',           '(admin)'],
        ['Download Excel template',  'GET /api/sales/import/template',  '/sales/import'],
        ['Preview import',           'POST /api/sales/import/preview',  '/sales/import'],
        ['Confirm import',           'POST /api/sales/import',          '/sales/import'],
      ],
    },
    {
      title: '4.0 Submit & Settlement',
      rows: [
        ['Function', 'Endpoint', 'UI Page'],
        ['Submit period to platform', 'POST /api/submit',                '/submit'],
        ['List submissions',          'GET /api/submissions',            '/submissions'],
      ],
    },
    {
      title: '5.0 Reports',
      rows: [
        ['Function', 'Endpoint', 'UI Page'],
        ['Sales over time',          'GET /api/sales?from=&to=',        '/reports'],
        ['Branch comparison',        'GET /api/sales?branch_id=',       '/reports'],
        ['Export CSV',               'GET /api/sales?format=csv',       '/reports'],
      ],
    },
    {
      title: '6.0 Support Tickets',
      rows: [
        ['Function', 'Endpoint', 'UI Page'],
        ['Create ticket',            'POST /api/tickets',               '/tickets/create'],
        ['Download attachment',      'GET /api/tickets/:id/attachment', '(email link)'],
        ['FAQ',                      '(static)',                        '/faq'],
      ],
    },
    {
      title: '7.0 Smart Assistant (Telegram)',
      rows: [
        ['Function', 'Endpoint', 'UI Page'],
        ['Telegram webhook',         'POST /api/bot/telegram',          '(external)'],
        ['NLP sales parsing',        '(internal service)',              '(external)'],
      ],
    },
    {
      title: '8.0 Super-Admin Console',
      rows: [
        ['Function', 'Endpoint', 'UI Page'],
        ['Admin dashboard',          'GET /api/admin/stats',            '/admin/dashboard'],
        ['Tenants CRUD',             '/api/admin/tenants/*',            '/admin/tenants, .../:id/edit'],
        ['Users CRUD',               '/api/admin/users/*',              '/admin/users'],
        ['API Keys',                 '/api/admin/tenants/:id/api-keys', '/admin/tenants/:id/api-keys'],
        ['Bot subscribers',          '/api/admin/bot-subscribers/*',    '/admin/bot-subscribers'],
        ['Tickets admin',            '/api/admin/tickets/*',            '/admin/tickets'],
      ],
    },
  ]

  for (const sec of sections) {
    ch.push(H(sec.title, HeadingLevel.HEADING_2))
    ch.push(table(sec.rows, [40, 35, 25]))
    ch.push(P(''))
  }

  ch.push(pageBreak())
  ch.push(H('2. Actor × Function Matrix'))
  ch.push(P(''))
  ch.push(table([
    ['Function',                  'Guest', 'Tenant Member', 'Tenant Admin', 'Super-Admin'],
    ['Login',                     '✓',    '✓',            '✓',           '✓'],
    ['Signup',                    '✓',    '—',            '—',           '—'],
    ['Branches CRUD',             '—',    'Read',         'CRUD',        'CRUD'],
    ['Manual sales entry',        '—',    '✓',            '✓',           '—'],
    ['Excel import',              '—',    'If allowed',   'If allowed',  '—'],
    ['Submit to platform',        '—',    '✓',            '✓',           '—'],
    ['Reports',                   '—',    'If allowed',   'If allowed',  '✓'],
    ['Create support ticket',     '—',    '✓',            '✓',           '—'],
    ['Telegram assistant',        '—',    'If subscribed','If subscribed','—'],
    ['Admin console',             '—',    '—',            '—',           '✓'],
  ]))
  ch.push(P(''))
  ch.push(I('R = read-only • CRUD = full access • — = denied'))

  ch.push(pageBreak())
  ch.push(H('3. Per-Tenant Feature Flags'))
  ch.push(table([
    ['Flag',                          'Default',   'Controls'],
    ['allowed_input_types',           '[daily]',   'input_type values accepted on POST /api/sales'],
    ['allow_import',                  'false',     'Access to /sales/import'],
    ['allow_reports',                 'false',     'Access to /reports'],
    ['allow_advanced_dashboard',      'false',     'Advanced analytics dashboard'],
    ['max_branches',                  '3',         'Branches created per tenant (hard limit)'],
    ['max_users',                     '10',        'tenant_users rows (hard limit)'],
  ]))

  await save('Functional_Hierarchy_Diagram', ch)
}

// ── 2. Technical Design Document ─────────────────────────────────────────
async function buildTDD() {
  const ch = []
  ch.push(
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Technical Design Document', bold: true, size: 40 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Urwa — Tenant Sales Management System', size: 24 })] }),
    P(''),
    P(`Version: 1.0`), P(`Date: 2026-04-24`),
    P(`Status: Post-migration (cPanel PostgreSQL, custom JWT auth)`),
    P(''),
  )

  ch.push(H('1. System Overview'))
  ch.push(P('Urwa is a multi-tenant SaaS (multiple tenants per deployment) that digitises the monthly sales collection process between mall operators and their tenants for revenue-share rent reconciliation.'))
  ch.push(bullet('Primary users: mall tenants (sales operators) and a super-admin (landlord ops)'))
  ch.push(bullet('Primary business flow: tenant logs sales → super-admin reconciles via scheduled integration-platform submissions'))
  ch.push(bullet('Deployment: single cPanel server hosting Node.js API + static SPA + PostgreSQL DB'))

  ch.push(H('2. Architecture Diagram'))
  ch.push(I('Textual architecture diagram — actual rendered diagram attached separately in PDF if needed.'))
  ch.push(P(''))
  ch.push(code([
    '+-------------------------------------------------------+',
    '|                 Browser (Client)                       |',
    '|                                                        |',
    '|   Vite + React SPA — RTL, Arabic-first                 |',
    '|   - Zustand auth store                                 |',
    '|   - axiosClient (Bearer JWT)                           |',
    '|   - React Router, lazy routes                          |',
    '|                                                        |',
    '|   Served from: https://apps.stepup2you.com             |',
    '+------------------------+------------------------------+',
    '                         | HTTPS',
    '                         v',
    '+-------------------------------------------------------+',
    '|     cPanel Node.js 22 + Express  (port :3001)          |',
    '|                                                        |',
    '|   Middleware: helmet, CORS, cookie-parser,             |',
    '|   rateLimit, multer                                    |',
    '|                                                        |',
    '|   /api/auth/*       - JWT auth (HS256)                 |',
    '|   /api/branches/*   - tenant-scoped CRUD               |',
    '|   /api/sales/*      - sales CRUD + Excel template      |',
    '|   /api/submit       - integration-platform submit      |',
    '|   /api/submissions  - submission history               |',
    '|   /api/contracts    - public API (JWT or X-API-Key)    |',
    '|   /api/tickets/*    - support + multer disk storage    |',
    '|   /api/admin/*      - super-admin management           |',
    '|   /api/bot/*        - Telegram webhook                 |',
    '|                                                        |',
    '|   BullMQ worker    - sale import queue (optional)      |',
    '|   Nodemailer       - password-reset emails             |',
    '+-------+-----------------------+------------------------+',
    '        | pg.Pool                | axios',
    '        v                        v',
    '+------------------+    +-----------------------------+',
    '| cPanel           |    | Cenomi (External)           |',
    '| PostgreSQL 13+   |    | POST /sales-data            |',
    '| 15 schema files  |    | x-api-token: <tenant token> |',
    '| App-layer tenant |    +-----------------------------+',
    '| isolation        |',
    '|                  |    +-----------------------------+',
    '| Tables:          |    | Telegram Bot API            |',
    '|  - app_users     |    | Webhook receiver            |',
    '|  - tenants       |    +-----------------------------+',
    '|  - branches      |',
    '|  - sales         |    +-----------------------------+',
    '|  - submissions   |    | cPanel disk                 |',
    '|  - api_keys      |    | ~/musharaka-uploads/...     |',
    '|  - bot_subscribers|   +-----------------------------+',
    '|  - support_tickets|',
    '+------------------+',
  ].join('\n')))

  ch.push(pageBreak())
  ch.push(H('3. Current Tech Stack (post-migration)'))
  ch.push(table([
    ['Layer',               'Technology',                       'Notes'],
    ['Client framework',    'React 18 + Vite 5',               'SPA with React Router'],
    ['Client state',        'Zustand',                          'Auth store + feature flags'],
    ['Client HTTP',         'axios',                            'JWT Bearer + refresh rotation'],
    ['UI styling',          'Tailwind CSS',                     'RTL + dark mode'],
    ['Charts',              'd3',                               'Lazy-loaded for reports'],
    ['Icons',               'lucide-react',                     '—'],
    ['Server runtime',      'Node.js 22 (cPanel nodevenv)',    'Managed via Passenger / nohup'],
    ['Server framework',    'Express 4',                        '—'],
    ['Database',            'PostgreSQL 13+ on cPanel',         'Single DB per deployment'],
    ['DB driver',           'pg (node-postgres) Pool',          'No ORM; explicit SQL'],
    ['Auth',                'jsonwebtoken + bcrypt',            'HS256 15m access + 30d refresh'],
    ['File uploads',        'multer → cPanel disk',             'No S3'],
    ['Excel handling',      'SheetJS (xlsx)',                   'Template generation + parsing'],
    ['Email',               'Nodemailer → cPanel SMTP',         '—'],
    ['Background jobs',     'BullMQ (Redis optional)',          'Disabled if no REDIS_URL'],
    ['Bot',                 'Telegram Bot API webhook',         'WhatsApp gated behind env flag'],
    ['Test framework',      'Playwright 1.59',                  'Browser + APIRequestContext'],
    ['CI',                  'GitHub Actions',                   'Build client on push'],
    ['Hosting',             'cPanel shared hosting',            'apps.stepup2you.com'],
  ]))

  ch.push(H('4. Key Design Decisions'))
  ch.push(table([
    ['Decision',                   'Choice',                                          'Rationale'],
    ['Auth',                       'Custom JWT (HS256) + refresh-token rotation',     'Zero external dep; full control'],
    ['DB client',                  'pg.Pool + thin helper (src/db/query.js)',         'Explicit SQL; no ORM lock-in'],
    ['Tenant isolation',           'App-layer tenant_id filter on every query',       'No RLS; enforced in middleware'],
    ['File storage',               'multer memoryStorage → cPanel disk',              'No S3 cost'],
    ['Email',                      'Nodemailer via cPanel SMTP',                      'Already included in hosting plan'],
    ['Bot platform',               'Telegram only (WhatsApp gated)',                  'Lower maintenance'],
    ['Cenomi token scope',         'Per-tenant (encrypted AES-256-CBC)',              'Cenomi issues one token per customer'],
    ['Excel template',             'Server-side SheetJS + Arabic headers + RTL',      'Consistent output'],
    ['Background jobs',            'BullMQ with optional Redis',                      'Redis is optional on shared hosting'],
    ['Error messages',             'Arabic user-facing; no stack traces',             'UX + i18n consistency'],
  ]))

  ch.push(H('5. Security Controls'))
  ch.push(B('5.1 Authentication & Authorization'))
  ch.push(bullet('Password hashing: bcrypt, 12 rounds'))
  ch.push(bullet('JWT payload: { sub, email, isSuperAdmin, tenantId, role, iat, exp }'))
  ch.push(bullet('Refresh token: SHA-256 hash stored in app_sessions, never raw'))
  ch.push(bullet('Forced password change: password_hash = "NEEDS_RESET" blocks login'))

  ch.push(B('5.2 Transport'))
  ch.push(bullet('HTTPS only (Strict-Transport-Security, preload-ready)'))
  ch.push(bullet('Secure + HttpOnly + SameSite=lax on refresh cookie'))

  ch.push(B('5.3 Headers (helmet + custom middleware)'))
  ch.push(code([
    'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options: nosniff',
    'X-Frame-Options: DENY',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'X-Permitted-Cross-Domain-Policies: none',
  ].join('\n')))

  ch.push(B('5.4 CORS'))
  ch.push(bullet('CLIENT_ORIGIN env var, comma-separated whitelist; no "*"'))

  ch.push(B('5.5 Rate limiting'))
  ch.push(bullet('authLimiter: 5 POST / 15min on /api/auth/login|signup|forgot|reset'))
  ch.push(bullet('strictLimiter: 10 / 15min on heavy ops (/api/sales/import)'))
  ch.push(bullet('adminWriteOnly: 30 / 1min on /api/admin/* writes'))
  ch.push(bullet('standardLimiter: 100 / 15min global baseline'))

  ch.push(B('5.6 Input validation'))
  ch.push(bullet('Zod schemas on every POST/PUT body'))
  ch.push(bullet('Multer filters: MIME + extension allowlist; 5–10 MB size limits'))
  ch.push(bullet('SQL: parameterised queries only'))

  ch.push(H('6. Scalability & Performance Targets'))
  ch.push(table([
    ['Capacity',                     'Target',         'Current'],
    ['Concurrent tenants',           '500',            '6'],
    ['Total branches',               '5,000',          '8'],
    ['Sales rows per month',         '100,000',        '~91'],
    ['API p95 latency',              '< 800 ms',       'measured in tests'],
    ['Page load (4G)',               '< 3 s',          'measured in tests'],
  ]))
  ch.push(P(''))
  ch.push(B('Horizontal scale path (if capacity hit):'))
  ch.push(bullet('Move Node.js to a VPS; keep Postgres on cPanel'))
  ch.push(bullet('Add Redis for BullMQ sale-import worker'))
  ch.push(bullet('Add CDN in front of static dist assets'))

  ch.push(H('7. Deployment'))
  ch.push(B('One-command deploy:'))
  ch.push(code([
    'cd ~/repositories/musharaka-01 && git pull',
    'rsync -a --delete musharaka/server/src/  ~/public_html/musharaka/server/server/src/',
    'rsync -a --delete musharaka/client/dist/ ~/public_html/musharaka/server/client/dist/',
    'kill $(pgrep -f "node src/index.js"); sleep 1',
    'nohup ~/nodevenv/.../node src/index.js > ~/musharaka.log 2>&1 &',
  ].join('\n')))

  ch.push(B('Rollback:'))
  ch.push(bullet('git checkout <previous-sha> + re-run rsync'))
  ch.push(bullet('Previous dist lives in git history'))

  ch.push(H('8. Data Migration History'))
  ch.push(table([
    ['Date',          'Event'],
    ['2026-04-24',    'Full data migration Supabase → cPanel PostgreSQL (10 tables, 118 rows)'],
    ['2026-04-24',    'Server app refactored from supabase.from() to pg.Pool (71 call sites)'],
    ['2026-04-24',    'Brand cleanup: "بوت تيليجرام" → "المساعد الذكي"; "سينومي" → "منصة التكامل"'],
    ['2026-04-24',    'Excel template download feature added'],
  ]))

  await save('Technical_Design_Document', ch)
}

// ── 3. Technical Proposal ────────────────────────────────────────────────
async function buildProposal() {
  const ch = []
  ch.push(
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Technical Proposal & Scope of Work', bold: true, size: 40 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Urwa — Tenant Sales Management System', size: 24 })] }),
    P(''),
    P('Prepared for: Stakeholders / Steering Committee'),
    P('Prepared by:  Ibrahim Aljefri'),
    P('Date:         2026-04-24  |  Version: 1.0'),
    P(''),
  )

  ch.push(H('1. Executive Summary'))
  ch.push(P('Urwa is a production-ready, Arabic-first SaaS platform that digitises the collection of monthly sales figures from commercial-centre tenants for revenue-share rent reconciliation. It gives mall operators a single dashboard, gives tenants four intake channels (manual, Excel import, API, Telegram assistant), and automates the end-of-month transmission to the landlord\u2019s integration platform.'))
  ch.push(P('The system is live at apps.stepup2you.com and has been fully migrated off third-party SaaS dependencies (Supabase + Render) onto a self-owned cPanel stack, eliminating recurring vendor costs.'))

  ch.push(H('2. Problem Statement'))
  ch.push(P('Mall operators typically require ~500 shop tenants to report monthly sales figures, then compute percentage rent. The status quo is:'))
  ch.push(bullet('Email / WhatsApp submissions collected manually'))
  ch.push(bullet('Spreadsheets consolidated by a clerk'))
  ch.push(bullet('Transcription errors and lost data'))
  ch.push(bullet('No audit trail'))
  ch.push(bullet('No standardised cut-off date'))
  ch.push(bullet('3–5 business days of reconciliation each month'))

  ch.push(H('3. Proposed Solution'))
  ch.push(P('A cloud-hosted, multi-tenant SaaS with:'))
  ch.push(bullet('Arabic RTL interface (≥98% of end-user strings localised)'))
  ch.push(bullet('Three user roles (Super-Admin, Tenant Admin, Tenant Member)'))
  ch.push(bullet('Four sales-entry channels: manual form, Excel/CSV import, REST API, Telegram assistant'))
  ch.push(bullet('Automated monthly submission to landlord\u2019s integration platform'))
  ch.push(bullet('Per-tenant feature flags (plan-based)'))
  ch.push(bullet('Ticketed support desk built-in'))

  ch.push(H('4. Scope of Work — Module Status'))
  ch.push(table([
    ['#',  'Module',                      'Description',                                                 'Status'],
    ['1',  'Authentication',              'JWT login, signup, refresh, change/reset password',          'Complete'],
    ['2',  'Branch Management',           'CRUD, tenant scoping, max_branches plan limit',              'Complete'],
    ['3',  'Manual Sales Entry',          'Daily / monthly / range input with license-window validation','Complete'],
    ['4',  'Excel / CSV Import',          'Upload, preview, confirm, background worker',                 'Complete'],
    ['5',  'Excel Template Download',     'Server-generated prefilled .xlsx with Arabic headers',        'Complete'],
    ['6',  'Cenomi Submission',           'lease_id payload, tenant-level token, atomic Postgres RPC',   'Complete'],
    ['7',  'Reports',                     'Date-range filtering, branch comparison, CSV export',         'Complete'],
    ['8',  'Support Tickets',             'Multi-category, attachments (PNG/JPG/PDF), status workflow',  'Complete'],
    ['9',  'Telegram Assistant',          'NLP sales parsing, branch inference, subscriber provisioning','Complete'],
    ['10', 'Landing Page',                'Marketing page, pricing, RTL',                                'Complete'],
    ['11', 'Super-Admin — Tenants',       'CRUD, plan assignment, feature flags',                        'Complete'],
    ['12', 'Super-Admin — Users',         'Create, reset, deactivate',                                   'Complete'],
    ['13', 'Super-Admin — API Keys',      'Generate (shown once), revoke, field-level allow-list',       'Complete'],
    ['14', 'DB Migration',                'Supabase → cPanel PostgreSQL',                                'Complete'],
    ['15', 'Brand Cleanup',               'Public pages + marketing docs scrubbed of Bot / Cenomi',      'Complete'],
    ['16', 'Test Suite',                  '531 E2E + 250 API regression tests + Word report generator',  'Complete'],
  ]))

  ch.push(H('5. Non-Functional Requirements'))
  ch.push(table([
    ['Requirement',            'Target',                                   'Verification'],
    ['Availability',           '99.5% uptime',                             'Hosting-provider SLA'],
    ['API p95 latency',        '< 800 ms',                                 'Playwright perf assertions'],
    ['Page load (4G)',         '< 3 s',                                    'Lighthouse + Playwright'],
    ['Security',               'OWASP Top 10 mitigated',                   '30 SEC-* tests'],
    ['Tenant isolation',       'No cross-tenant data visible',             '15 isolation tests'],
    ['RTL support',            '100% Arabic UI',                           '20 bidi tests'],
    ['Browser support',        'Chrome/Firefox/Safari/Edge (last 2 major)','5 Playwright projects'],
    ['Mobile support',         'iOS 16+, Android 12+',                     'mobile/tablet projects'],
    ['Data retention',         '5 years',                                  'Postgres backup schedule'],
  ]))

  ch.push(H('6. Deliverables'))
  ch.push(bullet('Production deployment at https://apps.stepup2you.com'))
  ch.push(bullet('Source code on GitHub (ibrahimaljefri/musharaka-01)'))
  ch.push(bullet('Database migration scripts'))
  ch.push(bullet('Regression test suite (826 total tests)'))
  ch.push(bullet('Word test-result report with embedded failure details'))
  ch.push(bullet('Functional Hierarchy Diagram (this bundle)'))
  ch.push(bullet('Technical Design Document (this bundle)'))
  ch.push(bullet('Technical Proposal (this document)'))
  ch.push(bullet('Cleaned marketing overview'))

  ch.push(H('7. Operational Handover'))
  ch.push(B('Credentials (stored separately in .env):'))
  ch.push(bullet('Super-admin: admin@admin.com'))
  ch.push(bullet('Test client:  ibrahimaljefri@yahoo.com'))
  ch.push(bullet('Database:    stepupyo_musharaka owned by stepupyo_mshadmin'))

  ch.push(B('Monitoring:'))
  ch.push(bullet('Server log: ~/musharaka.log'))
  ch.push(bullet('DB: cPanel → PostgreSQL → stepupyo_musharaka'))
  ch.push(bullet('Client assets: ~/public_html/musharaka/server/client/dist/'))

  ch.push(H('8. Risk Register'))
  ch.push(table([
    ['Risk',                                 'Likelihood', 'Impact',  'Mitigation'],
    ['cPanel Postgres connection limits',    'Medium',    'High',    'pg.Pool max=10; throttle worker'],
    ['Cenomi API rate limits / outage',      'Low',       'Medium',  'SEINOMY_MOCK fallback; exponential backoff'],
    ['JWT secret leakage',                   'Low',       'Critical','Env-var isolation; quarterly rotation'],
    ['Data loss on cPanel disk',             'Medium',    'High',    'Daily cPanel backup; offline copy'],
    ['Brand copy drift',                     'Low',       'Low',     'smoke.spec.ts regression'],
    ['Test credential leakage',              'Low',       'Medium',  '.env gitignored; .env.example placeholders'],
  ]))

  ch.push(H('9. Out of Scope'))
  ch.push(bullet('Native iOS / Android app (PWA-compatible responsive web only)'))
  ch.push(bullet('Multi-currency (SAR only)'))
  ch.push(bullet('Offline mode with sync'))
  ch.push(bullet('BI / analytics beyond the built-in reports module'))
  ch.push(bullet('Multi-language UI beyond Arabic'))

  ch.push(H('10. Acceptance Criteria'))
  ch.push(bullet('Production /api/health returns {"status":"ok"}'))
  ch.push(bullet('Admin + tenant login both succeed end-to-end'))
  ch.push(bullet('Full regression suite runs against production'))
  ch.push(bullet('All SEC-* security tests pass'))
  ch.push(bullet('Documentation (FHD, TDD, Proposal) approved'))

  await save('Technical_Proposal', ch)
}

// ── 4. Marketing Overview (updated with current tech stack) ──────────────
async function buildMarketing() {
  const ch = []
  ch.push(
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'عروة', bold: true, size: 48, rightToLeft: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Urwa Sales Management System', size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Marketing & Product Overview', size: 22, italics: true })] }),
    P(''),
    P(`Version 2.0  |  Updated 2026-04-24  |  apps.stepup2you.com`),
    P(''),
  )

  ch.push(H('Product Overview'))
  ch.push(P('Urwa is an Arabic-first sales management platform built for commercial-centre operators who need to collect monthly sales reports from their tenants and automate rent reconciliation with the landlord\u2019s integration platform.'))

  ch.push(H('Key Features'))
  ch.push(bullet('Full integration with integration platforms — submit invoices in one click, synchronised and archived'))
  ch.push(bullet('Smart Assistant — send sales via chat; the assistant understands Arabic fluently'))
  ch.push(bullet('Excel import with pre-filled templates — upload Excel ready from your POS systems'))
  ch.push(bullet('Live dashboard & reports — monthly and daily charts with per-branch alerts'))
  ch.push(bullet('User management — create accounts for branch admins and accountants with role-based access'))

  ch.push(H('How It Works'))
  ch.push(bullet('01 — Share your sales smoothly: manually, via Excel import, or through the Smart Assistant'))
  ch.push(bullet('02 — Review invoices: verify each invoice and confirm numbers before submission'))
  ch.push(bullet('03 — Submit the batch: the full batch is transmitted to the platform and archived'))

  ch.push(H('Pricing Plans'))
  ch.push(table([
    ['Plan',     'Annual (SAR)', 'Monthly (SAR)', 'Branches', 'Users',   'Features'],
    ['Basic',     '999',          '83',            '3',        '1',       'Core integration, Assistant, Excel import, monthly reports, email support'],
    ['Mid',       '1,999',        '167',           '8',        '1',       'Full integration, advanced AI Assistant, smart Excel, daily + live dashboard, priority email + Telegram support, PDF export'],
    ['Pro',      '3,999',        '333',           '15',       '1',       'All Mid features, AI sales analytics, custom reports, private API, dedicated account manager, 24/7 phone support'],
  ]))

  ch.push(H('Platform Technology'))
  ch.push(P('Urwa is engineered for reliability, security, and compliance with Arabic-first UX.'))
  ch.push(table([
    ['Layer',            'Technology'],
    ['Frontend',         'React 18 + Vite 5, Tailwind CSS, Zustand'],
    ['Backend',          'Node.js 22 + Express, pg (node-postgres) Pool'],
    ['Database',         'PostgreSQL 13+'],
    ['Authentication',   'Custom JWT (HS256) + refresh-token rotation, bcrypt hashing'],
    ['Hosting',          'cPanel-managed infrastructure in Saudi-region data centre'],
    ['Email',            'SMTP via cPanel mail server'],
    ['File storage',     'Encrypted cPanel disk'],
    ['Background jobs',  'BullMQ (Redis optional)'],
    ['Test automation',  'Playwright — 826 browser + API regression tests'],
    ['CI / CD',          'GitHub Actions (automated build on push)'],
  ]))

  ch.push(H('Security & Compliance'))
  ch.push(bullet('HTTPS / TLS with HSTS preload'))
  ch.push(bullet('OWASP Top-10 mitigations (helmet headers, CSRF-safe cookies, rate limiting)'))
  ch.push(bullet('bcrypt password hashing (12 rounds)'))
  ch.push(bullet('Tenant-level data isolation enforced at the application layer'))
  ch.push(bullet('Encrypted storage of third-party API tokens (AES-256-CBC)'))
  ch.push(bullet('Daily hosted backups + 5-year data retention'))

  ch.push(H('Availability & Performance'))
  ch.push(bullet('Target uptime: 99.5%'))
  ch.push(bullet('Target API p95 latency: under 800 ms'))
  ch.push(bullet('Mobile-first responsive UI (iOS 16+, Android 12+)'))
  ch.push(bullet('Works on Chrome, Firefox, Safari, Edge (last two major versions)'))

  ch.push(H('Contact'))
  ch.push(P('Website: https://apps.stepup2you.com'))
  ch.push(P('Support: Telegram — contact support via the landing page'))

  await save('Urwa_Marketing_Overview', ch)
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  await Promise.all([
    buildFHD(),
    buildTDD(),
    buildProposal(),
    buildMarketing(),
  ])
  console.log('\nAll documents written to:', OUT_DIR)
}

main().catch(e => { console.error('[ERROR]', e); process.exit(1) })
