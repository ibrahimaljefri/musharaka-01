# Phase 0 — Design Preview Handoff

**Date:** 2026-04-24
**Branch:** `redesign` (separate from `master` for safe rollback)
**Status:** ✅ Mockups complete — awaiting user review & approval

---

## How to review

1. Open `docs/design-previews/index.html` in any modern browser (no server needed).
2. Click tabs at the top to switch between the 5 mockups.
3. Each mockup renders simultaneously at **375px (mobile)**, **768px (tablet)**, and **full desktop**.
4. Use the 🌓 toggle (top-left) to flip **light ↔ dark** themes.
5. Review each at all 3 viewports, both themes, then decide:
   - ✅ Approve → we proceed to Phase E (landing implementation)
   - ✏️ Request changes → iterate on the mockups first

### Individual previews (direct links)

| Page | File | Key feature |
|------|------|-------------|
| Landing | `landing-preview.html` | Contact-Us-in-nav, WhatsApp modal, custom SVG icons, compact hero, simplified footer |
| Dashboard | `dashboard-preview.html` | 4-col KPIs with sparklines, area chart, compact recent-sales table |
| Sale Create | `sale-create-preview.html` | Segmented control for 3 input modes, inline validation, compact two-col form |
| Admin Tenants | `admin-tenants-preview.html` | Dense table → card fallback on mobile, filter bar, pagination |
| Login | `login-preview.html` | Brand-split two-panel layout (dark brand / light form) |

---

## 🔴 Items needing your input

1. **WhatsApp numbers for pre-sales engineers** (currently placeholders `+966 5X XXX XXXX`).
   - How many engineers? 1 or 2?
   - Real numbers + display name for each.
2. **Design approval on each of the 5 mockups** — all 5 must be approved before Phase E starts.
3. **Brand gold shade** — current light: `#B8860B`, dark: `#FBBF24`. Acceptable?
4. **Old deliverable doc** — `docs/deliverables/Musharaka_Marketing_Overview.docx` is locked by Word on your machine and couldn't be auto-deleted. The new `Urwa_Marketing_Overview.docx` exists beside it. Please delete the old file manually when Word releases the lock.

---

## ✅ What's already done on `redesign` branch

| Phase | Description | Commits |
|-------|-------------|---------|
| A | 25 tenant-isolation breach tests — all pass | `221f94b` |
| D | Brand audit (مشاركة → عروة) in customer-facing strings | `a73dba7` |
| F | Deliverable .docx regen with Urwa branding | `a73dba7` |
| 0 | 5 preview mockups + index hub | _(this commit)_ |

**Test suite:** 275/275 passing on `redesign` branch (250 existing + 25 breach).

---

## 🟡 What's next (after your approval)

In order:

1. **Phase E** — Landing page implementation (~11.5 hrs) — ports `landing-preview.html` into `musharaka/client/src/pages/LandingPage.jsx` + adds `config/contact.js` + 9 SVG illustrations + Heroicons
2. **Phase H + I interleaved** — Full app redesign + per-tier visual regression tests (~59.5 hrs)
3. **Phase B** — Per-branch user scoping backend + UI (~11.5 hrs)
4. **Phase C** — Nav visibility rule (~1 hr)
5. **Phase G** — HTML marketing refresh (~2 hrs)

**Total remaining after approval:** ~85 hours — can start as soon as you say "go".

---

## Git state

```bash
# Current branch
redesign

# To rollback to production state
git checkout master

# To continue redesign work
git checkout redesign
```

`master` remains untouched — production (`apps.stepup2you.com`) is unaffected by any of this work.

---

## Design principles applied

1. **Compact density** — spacing 4-6-8-12-16-24-32 (dropped 48/64/96 inside pages)
2. **Visible texture** — SVG noise grain (2% opacity), gradient card shells, inner ring highlights
3. **Mobile-first** — 375 → 768 → 1024 → 1440 breakpoints; table → card transform on small screens
4. **Urwa-branded** — "عروة" / "Urwa" throughout; no "مشاركة" / "Musharaka" in any customer string
5. **Clean-SaaS aesthetic** — Linear/Stripe/Notion inspired; minimal, typography-driven
6. **Light default + dark toggle** — both palettes first-class; Tajawal type family
