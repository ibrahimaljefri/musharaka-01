# Musharaka Test Suite

Comprehensive Playwright test suite: **531 E2E tests** (browser UI) + **250 API regression tests** = **781 total**.

## Layout

```
tests/
├── e2e/                     # Browser tests (Playwright UI)
│   ├── auth/                # login, register, forgot-password, change-password
│   ├── admin/               # Super-admin pages (tenants, users, api-keys, tickets, bot)
│   ├── branches/            # Tenant branches CRUD
│   ├── sales/               # Sales create + import
│   ├── submit.spec.ts
│   ├── submissions.spec.ts
│   ├── reports.spec.ts
│   ├── tickets.spec.ts
│   ├── dashboard.spec.ts
│   ├── excel-template.spec.ts
│   ├── smoke.spec.ts        # Post-migration production smoke
│   └── ...
├── api/                     # API regression (APIRequestContext, no browser)
│   ├── auth.api.spec.ts     # AUTH-01..30
│   ├── branches.api.spec.ts # BR-01..25
│   ├── sales.api.spec.ts    # SA-01..25
│   ├── import.api.spec.ts   # IM-01..15
│   ├── submit.api.spec.ts   # SUB-01..20
│   ├── admin.api.spec.ts    # ADM-01..50
│   ├── contracts.api.spec.ts# CONT-01..15
│   ├── tickets.api.spec.ts  # TK-01..20
│   ├── bot.api.spec.ts      # BOT-01..15
│   ├── reports.api.spec.ts  # REP-01..05
│   ├── security.api.spec.ts # SEC-01..30
│   └── _helpers.ts
├── scripts/
│   ├── run-full-suite.sh    # One-command runner
│   └── generate-report.js   # Word doc with embedded screenshots
├── fixtures/                # Auto-generated auth storage
└── playwright.config.ts
```

## Setup on 192.168.100.79 (GPU server)

```bash
cd ~/musharaka-tests
git pull
npm ci
npx playwright install --with-deps chromium

# Copy credentials
cp .env.example .env
# Edit .env with TEST_USER_* and TEST_ADMIN_* values
```

## Run

```bash
# Full suite (both projects)
bash scripts/run-full-suite.sh

# API regression only (no browser)
bash scripts/run-full-suite.sh api

# Browser E2E only
bash scripts/run-full-suite.sh e2e
```

Or direct Playwright:

```bash
npx playwright test --project=chromium      # tenant UI
npx playwright test --project=admin         # super-admin UI
npx playwright test --project=api           # API regression
npx playwright test --project=firefox       # cross-browser
npx playwright test --project=mobile        # iPhone 14
```

## Output

After a run, you get three artifacts in `playwright-report/`:

| File                        | Purpose                            |
|-----------------------------|------------------------------------|
| `index.html`                | Interactive HTML report            |
| `results.json`              | Machine-readable output            |
| `Test_Results_<date>.docx`  | Word document with failure screenshots (for stakeholders) |

## Environment variables (tests/.env)

```
BASE_URL=https://apps.stepup2you.com
API_URL=https://apps.stepup2you.com

TEST_USER_EMAIL=ibrahimaljefri@yahoo.com
TEST_USER_PASSWORD=123456

TEST_ADMIN_EMAIL=admin@admin.com
TEST_ADMIN_PASSWORD=admin123
```

## Auth strategy

- `auth/auth.setup.ts` logs in as the tenant user **once** via the real UI,
  saves `fixtures/.auth/user.json` (cookies + JWT in localStorage).
- `auth/admin.setup.ts` does the same for the super-admin → `admin.json`.
- All authenticated browser projects reuse the saved state.
- API tests log in per-file using `_helpers.ts`.

## Coverage highlights

- **Authentication:** login, signup, refresh, logout, change-password, forgot/reset, JWT security (30 tests)
- **Tenant isolation:** every CRUD endpoint verified to not leak other tenants (∼15 tests)
- **RBAC:** tenant tokens rejected from admin endpoints (∼10 tests)
- **Rate limiting:** brute-force login 429 (2 tests)
- **XSS / SQL injection:** payloads in branch name, sale amount, search, etc. (∼10 tests)
- **Security headers:** HSTS, nosniff, X-Frame-Options, Referrer-Policy (∼8 tests)
- **Sensitive data:** no `password_hash`, `SMTP_PASS`, `ENCRYPTION_KEY`, `cenomi_api_token` in any response (∼10 tests)
- **Phase 1 regression:** `lease_id` (not `lease_code`) payload, tenant-level Cenomi token (2 tests)
- **Phase 3 regression:** landing page / FAQ no longer say "بوت تيليجرام" (2 tests)
- **Phase 4 feature:** Excel template download returns valid `.xlsx` with Arabic headers (5 tests)
