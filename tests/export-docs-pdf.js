/**
 * export-docs-pdf.js — Render the slide-deck HTML guides as multi-page PDFs.
 *
 * Both /user-guide.html and /sales-marketing.html are slide decks: each
 * <section class="slide"> is a single slide, with only the `.active` one
 * displayed at a time via JS. To produce a useful PDF we:
 *
 *   1. Navigate to the page and wait for fonts.
 *   2. Inject CSS that forces every slide to render, stacks them vertically,
 *      and inserts `page-break-after: always` between them so each slide
 *      becomes a single PDF page.
 *   3. Hide the nav (theme toggle, slide counter) since it's not useful on
 *      paper.
 *   4. Call page.pdf() with landscape A4 so wide slides aren't cut off.
 *
 * Usage:
 *   node tests/export-docs-pdf.js
 */

const { chromium } = require('@playwright/test')
const path = require('path')
const fs   = require('fs')

const OUT_DIR = 'C:\\Users\\ibrahim\\Desktop\\Musharaka PDF Exports'
fs.mkdirSync(OUT_DIR, { recursive: true })

const DOCS = [
  // Slide-deck-style HTMLs — need print CSS overrides to render every slide
  // as a separate landscape page.
  {
    url:   'https://dev.urrwah.com/user-guide.html',
    file:  'urrwah-user-guide.pdf',
    title: 'user-guide',
    style: 'slides',
  },
  {
    url:   'https://dev.urrwah.com/branding.html',
    file:  'urrwah-branding.pdf',
    title: 'branding',
    style: 'slides',
  },
  // Document-style HTML — already structured into A4 portrait pages with
  // its own @page rules. Renders from a LOCAL-ONLY file that is in
  // .gitignore — the user wants this kept local and NOT deployed to dev.
  // The deployed sales-marketing.html stays as the original slide deck.
  {
    url:   'file:///C:/Users/ibrahim/Desktop/Musharaka%20Sales%20Management%20System/musharaka/client/public/_local-sales-doc.html',
    file:  'urrwah-sales-document.pdf',
    title: 'sales-document',
    style: 'document',
  },
]

// CSS injected into the page before printing. Forces every slide visible,
// each on its own PDF page, in source order. Hides on-screen navigation.
const PRINT_OVERRIDES = `
  /* Force all slides to render in flow as printable pages */
  .slide,
  section.slide,
  section.slide.active,
  section.slide:not(.active) {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    position: static !important;
    transform: none !important;
    height: auto !important;
    min-height: 100vh !important;
    width: 100% !important;
    page-break-after: always !important;
    break-after: page !important;
    overflow: visible !important;
  }
  .slide:last-of-type,
  section.slide:last-of-type {
    page-break-after: auto !important;
    break-after: auto !important;
  }

  /* Hide screen-only navigation controls */
  #theme-toggle,
  #slide-counter,
  #prev-btn, #next-btn,
  .slide-nav, .slide-progress,
  [aria-label="انتقل إلى شريحة"] {
    display: none !important;
  }

  /* Disable any animations that interfere with print rendering */
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay:    0s !important;
    transition-duration: 0s !important;
  }

  /* Make sure the document scrolls (some decks use overflow: hidden on body) */
  html, body {
    overflow: visible !important;
    height: auto !important;
  }
`

async function exportDoc(doc) {
  console.log(`\n[${doc.title}] launching browser…`)
  const browser = await chromium.launch()
  const context = await browser.newContext({
    // Document docs use 210×297mm (A4). Slides use a wider stage.
    viewport: doc.style === 'document'
      ? { width: 794, height: 1123 }   // A4 portrait at 96dpi
      : { width: 1280, height: 800 },
  })
  const page = await context.newPage()

  console.log(`[${doc.title}] loading ${doc.url}`)
  await page.goto(doc.url, { waitUntil: 'networkidle', timeout: 60000 })

  // Tajawal is a Google font — wait for it to load before rendering
  await page.evaluate(() => document.fonts && document.fonts.ready)
  await page.waitForTimeout(1500)

  let pdfOptions
  if (doc.style === 'slides') {
    console.log(`[${doc.title}] injecting print CSS overrides for slide deck`)
    await page.addStyleTag({ content: PRINT_OVERRIDES })

    // Some decks toggle slides by JS; force every slide.active so the
    // overrides apply correctly even if classList toggles back.
    await page.evaluate(() => {
      document.querySelectorAll('section.slide, .slide').forEach(s => {
        s.classList.add('active')
        s.style.display = 'block'
      })
      if (window.slideInterval) clearInterval(window.slideInterval)
    })
    await page.waitForTimeout(800)

    const slideCount = await page.evaluate(
      () => document.querySelectorAll('section.slide, .slide').length
    )
    console.log(`[${doc.title}] discovered ${slideCount} slides`)

    pdfOptions = {
      format:          'A4',
      landscape:       true,
      printBackground: true,
      margin:          { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      preferCSSPageSize: false,
    }
  } else {
    // Document: respect the HTML's own @page rules + page-break-after on
    // each .page element. No CSS overrides, A4 portrait, native sizing.
    console.log(`[${doc.title}] rendering as document (A4 portrait, native @page)`)
    const pageCount = await page.evaluate(() => document.querySelectorAll('.page').length)
    console.log(`[${doc.title}] discovered ${pageCount} pages`)

    pdfOptions = {
      format:           'A4',
      landscape:        false,
      printBackground:  true,
      margin:           { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      preferCSSPageSize: true,
    }
  }

  const outPath = path.join(OUT_DIR, doc.file)
  console.log(`[${doc.title}] writing PDF → ${outPath}`)
  await page.pdf({ path: outPath, ...pdfOptions })

  const stat = fs.statSync(outPath)
  console.log(`[${doc.title}] ✓ wrote ${(stat.size / 1024).toFixed(0)} KB`)

  await browser.close()
  return outPath
}

;(async () => {
  const results = []
  for (const doc of DOCS) {
    try {
      const p = await exportDoc(doc)
      results.push({ doc: doc.title, ok: true, path: p })
    } catch (err) {
      console.error(`[${doc.title}] ✗ ${err.message}`)
      results.push({ doc: doc.title, ok: false, error: err.message })
    }
  }

  console.log('\n=== summary ===')
  for (const r of results) {
    console.log(r.ok ? `  ✓ ${r.doc} → ${r.path}` : `  ✗ ${r.doc}: ${r.error}`)
  }
  process.exit(results.every(r => r.ok) ? 0 : 1)
})()
