#!/usr/bin/env node
/**
 * generate-report.js
 *
 * Reads Playwright JSON reporter output and creates a Word document
 * summarising pass/fail with embedded screenshots for every failure.
 *
 * Usage:
 *   cd tests && node scripts/generate-report.js
 *
 * Requires: docx
 *   npm install docx
 */

const fs    = require('fs')
const path  = require('path')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableCell, TableRow, WidthType, BorderStyle,
  ImageRun, AlignmentType, PageBreak,
} = require('docx')

const REPORT_JSON = path.join(__dirname, '..', 'playwright-report', 'results.json')
const OUT_DIR     = path.join(__dirname, '..', 'playwright-report')

function pad(n) { return String(n).padStart(2, '0') }

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Walk the Playwright report tree and return a flat list of tests. */
function flatten(suites, file = '', parents = []) {
  const out = []
  for (const suite of suites || []) {
    const here = [...parents, suite.title || '']
    if (suite.specs) {
      for (const spec of suite.specs) {
        for (const test of spec.tests || []) {
          const result = test.results?.[0]
          out.push({
            id:           spec.id || spec.title,
            title:        spec.title,
            file:         suite.file || file || spec.file,
            suite:        here.filter(Boolean).join(' › '),
            status:       result?.status || test.status || 'unknown',
            duration_ms:  result?.duration || 0,
            error:        result?.error?.message || result?.error?.stack || '',
            attachments:  result?.attachments || [],
          })
        }
      }
    }
    if (suite.suites) out.push(...flatten(suite.suites, suite.file || file, here))
  }
  return out
}

function stats(tests) {
  let passed = 0, failed = 0, skipped = 0, flaky = 0
  for (const t of tests) {
    if (t.status === 'passed')  passed++
    else if (t.status === 'failed' || t.status === 'timedOut') failed++
    else if (t.status === 'skipped') skipped++
    else if (t.status === 'flaky') flaky++
  }
  return { total: tests.length, passed, failed, skipped, flaky }
}

function H(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, children: [new TextRun({ text, bold: true })] })
}
function P(text, opts = {}) {
  return new Paragraph({ children: [new TextRun({ text, ...opts })] })
}

function row(cells, opts = {}) {
  return new TableRow({
    children: cells.map(c => new TableCell({
      children: [typeof c === 'string' ? P(c, opts) : c],
      width:    { size: 100 / cells.length, type: WidthType.PERCENTAGE },
    })),
  })
}

async function buildDoc() {
  if (!fs.existsSync(REPORT_JSON)) {
    console.error(`[FATAL] ${REPORT_JSON} not found. Run Playwright first.`)
    process.exit(1)
  }

  const report = JSON.parse(fs.readFileSync(REPORT_JSON, 'utf8'))
  const tests  = flatten(report.suites)
  const s      = stats(tests)
  const env    = process.env.BASE_URL || 'https://apps.stepup2you.com'

  // ── Cover page ────────────────────────────────────────────────────────────
  const cover = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children:  [new TextRun({ text: 'Musharaka — Test Results', bold: true, size: 48 })],
    }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tenant Sales Management System', size: 28 })] }),
    P(''),
    P(''),
    P(`Run date:         ${today()}`),
    P(`Environment:      ${env}`),
    P(`Runner host:      ${process.env.HOSTNAME || process.env.COMPUTERNAME || 'localhost'}`),
    P(''),
    H('Summary', HeadingLevel.HEADING_2),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        row(['Metric', 'Count'], { bold: true }),
        row(['Total',     String(s.total)]),
        row(['Passed',    String(s.passed)]),
        row(['Failed',    String(s.failed)]),
        row(['Skipped',   String(s.skipped)]),
        row(['Flaky',     String(s.flaky)]),
        row(['Pass rate', s.total ? `${((s.passed / s.total) * 100).toFixed(1)}%` : 'N/A']),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ]

  // ── Group by suite file ───────────────────────────────────────────────────
  const bySuite = new Map()
  for (const t of tests) {
    const k = t.file || 'unknown'
    if (!bySuite.has(k)) bySuite.set(k, [])
    bySuite.get(k).push(t)
  }

  const suiteSections = []
  for (const [file, list] of bySuite) {
    const passedHere = list.filter(t => t.status === 'passed').length
    const failedHere = list.filter(t => ['failed', 'timedOut'].includes(t.status)).length
    suiteSections.push(H(path.basename(file), HeadingLevel.HEADING_2))
    suiteSections.push(P(`${passedHere} passed, ${failedHere} failed, of ${list.length} total`))
    suiteSections.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        row(['Test', 'Status', 'Duration'], { bold: true }),
        ...list.map(t => row([
          t.title,
          t.status,
          `${t.duration_ms} ms`,
        ])),
      ],
    }))
    suiteSections.push(P(''))
  }

  // ── Failure details with screenshots ──────────────────────────────────────
  const failures = tests.filter(t => ['failed', 'timedOut'].includes(t.status))
  const failureSections = []
  if (failures.length) {
    failureSections.push(new Paragraph({ children: [new PageBreak()] }))
    failureSections.push(H('Failure Details', HeadingLevel.HEADING_1))
    for (const f of failures) {
      failureSections.push(H(f.title, HeadingLevel.HEADING_2))
      failureSections.push(P(`File:  ${f.file}`))
      failureSections.push(P(`Suite: ${f.suite}`))
      failureSections.push(P(''))
      // Error message
      const errorText = (f.error || '').split('\n').slice(0, 20).join('\n')
      failureSections.push(P(errorText, { color: 'B91C1C' }))
      // Screenshots (embedded)
      for (const att of f.attachments || []) {
        if (att.contentType?.startsWith('image/') && att.path && fs.existsSync(att.path)) {
          try {
            const buf = fs.readFileSync(att.path)
            failureSections.push(new Paragraph({
              children: [new ImageRun({ data: buf, transformation: { width: 600, height: 375 } })],
            }))
            failureSections.push(P(`Screenshot: ${path.basename(att.path)}`, { italics: true, size: 18 }))
          } catch (e) {
            failureSections.push(P(`[could not embed ${att.path}: ${e.message}]`))
          }
        }
      }
      failureSections.push(P(''))
    }
  }

  const doc = new Document({
    creator:     'Musharaka Test Suite',
    title:       'Musharaka — Test Results',
    description: 'Automated test results with failure screenshots',
    sections: [{
      children: [
        ...cover,
        ...suiteSections,
        ...failureSections,
      ],
    }],
  })

  const filename = `Test_Results_${today()}.docx`
  const filepath = path.join(OUT_DIR, filename)
  const buf      = await Packer.toBuffer(doc)
  fs.writeFileSync(filepath, buf)

  console.log(`✓ Wrote ${filepath}`)
  console.log(`  Total: ${s.total}  Pass: ${s.passed}  Fail: ${s.failed}  Skip: ${s.skipped}`)
}

buildDoc().catch(e => {
  console.error('[ERROR]', e)
  process.exit(1)
})
