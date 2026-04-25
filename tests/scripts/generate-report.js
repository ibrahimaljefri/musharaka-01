#!/usr/bin/env node
/**
 * generate-report.js
 *
 * Reads Playwright JSON reporter output and creates a Word document
 * summarising pass / fail / skipped with error detail for every failure.
 *
 * Usage:
 *   cd tests && node scripts/generate-report.js
 *
 * Requires: docx (^8.5.0)
 */

const fs    = require('fs')
const path  = require('path')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableCell, TableRow, WidthType, AlignmentType, PageBreak,
} = require('docx')

const REPORT_JSON = path.join(__dirname, '..', 'playwright-report', 'results.json')
const OUT_DIR     = path.join(__dirname, '..', 'playwright-report')

function pad(n) { return String(n).padStart(2, '0') }
function today() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function flatten(suites, file = '', parents = []) {
  const out = []
  for (const suite of suites || []) {
    const here = [...parents, suite.title || '']
    if (suite.specs) {
      for (const spec of suite.specs) {
        for (const test of spec.tests || []) {
          const result = test.results?.[0]
          out.push({
            title:        spec.title,
            file:         suite.file || file || spec.file || '',
            suite:        here.filter(Boolean).join(' > '),
            status:       result?.status || test.status || 'unknown',
            duration_ms:  result?.duration || 0,
            error:        result?.error?.message || result?.error?.stack || '',
          })
        }
      }
    }
    if (suite.suites) out.push(...flatten(suite.suites, suite.file || file, here))
  }
  return out
}

function stats(tests) {
  const s = { total: tests.length, passed: 0, failed: 0, skipped: 0, flaky: 0 }
  for (const t of tests) {
    if (t.status === 'passed')                                  s.passed++
    else if (t.status === 'failed' || t.status === 'timedOut')  s.failed++
    else if (t.status === 'skipped')                            s.skipped++
    else if (t.status === 'flaky')                              s.flaky++
  }
  return s
}

// ── Safe text — strip any control chars the docx writer might choke on ──
function clean(s) {
  if (s == null) return ''
  return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

function H(text, level) {
  return new Paragraph({
    heading:  level || HeadingLevel.HEADING_1,
    children: [new TextRun({ text: clean(text), bold: true })],
  })
}

function P(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align,
    children: [new TextRun({ text: clean(text), ...opts })],
  })
}

function cell(text, opts = {}) {
  return new TableCell({
    children: [P(text, opts)],
    width: { size: opts.pct || 25, type: WidthType.PERCENTAGE },
  })
}

function row(cells) {
  return new TableRow({ children: cells })
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

  const passRate = s.total ? `${((s.passed / s.total) * 100).toFixed(1)}%` : 'N/A'

  const children = []

  // Cover
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children:  [new TextRun({ text: 'Musharaka — Test Results', bold: true, size: 48 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children:  [new TextRun({ text: 'Tenant Sales Management System', size: 28 })],
    }),
    P(''),
    P(''),
    P(`Run date:    ${today()}`),
    P(`Environment: ${env}`),
    P(`Duration:    ${Math.round((report.stats?.duration || 0) / 1000)} seconds`),
    P(''),
    H('Summary', HeadingLevel.HEADING_2),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        row([cell('Metric', { bold: true, pct: 50 }), cell('Count', { bold: true, pct: 50 })]),
        row([cell('Total',     { pct: 50 }), cell(String(s.total),   { pct: 50 })]),
        row([cell('Passed',    { pct: 50 }), cell(String(s.passed),  { pct: 50 })]),
        row([cell('Failed',    { pct: 50 }), cell(String(s.failed),  { pct: 50 })]),
        row([cell('Skipped',   { pct: 50 }), cell(String(s.skipped), { pct: 50 })]),
        row([cell('Flaky',     { pct: 50 }), cell(String(s.flaky),   { pct: 50 })]),
        row([cell('Pass rate', { pct: 50 }), cell(passRate,          { pct: 50 })]),
      ],
    }),
  )

  // Group tests by file
  const bySuite = new Map()
  for (const t of tests) {
    const k = t.file || 'unknown'
    if (!bySuite.has(k)) bySuite.set(k, [])
    bySuite.get(k).push(t)
  }

  children.push(new Paragraph({ children: [new PageBreak()] }))
  children.push(H('Results by Spec File', HeadingLevel.HEADING_1))

  for (const [file, list] of bySuite) {
    const p = list.filter(t => t.status === 'passed').length
    const f = list.filter(t => ['failed', 'timedOut'].includes(t.status)).length
    const sk = list.filter(t => t.status === 'skipped').length

    children.push(H(path.basename(file), HeadingLevel.HEADING_2))
    children.push(P(`${p} passed, ${f} failed, ${sk} skipped (total ${list.length})`))
    children.push(P(''))

    const tableRows = [
      row([
        cell('Test',      { bold: true, pct: 70 }),
        cell('Status',    { bold: true, pct: 15 }),
        cell('Duration',  { bold: true, pct: 15 }),
      ]),
    ]
    for (const t of list) {
      tableRows.push(row([
        cell(t.title.slice(0, 120), { pct: 70 }),
        cell(t.status,              { pct: 15 }),
        cell(`${t.duration_ms} ms`, { pct: 15 }),
      ]))
    }
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows:  tableRows,
    }))
    children.push(P(''))
  }

  // Failure details
  const failures = tests.filter(t => ['failed', 'timedOut'].includes(t.status))
  if (failures.length) {
    children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(H('Failure Details', HeadingLevel.HEADING_1))

    for (const failure of failures) {
      children.push(H(failure.title.slice(0, 120), HeadingLevel.HEADING_2))
      children.push(P(`File:  ${path.basename(failure.file)}`))
      children.push(P(`Suite: ${failure.suite}`))
      children.push(P(''))

      const errorText = clean((failure.error || '(no error message)').toString()).split('\n').slice(0, 15).join('\n')
      children.push(P(errorText, { color: 'B91C1C' }))
      children.push(P(''))
    }
  }

  const doc = new Document({
    creator:     'Musharaka Test Suite',
    title:       'Musharaka Test Results',
    description: 'Automated test results',
    sections: [{ children }],
  })

  const filename = `Test_Results_${today()}.docx`
  const filepath = path.join(OUT_DIR, filename)
  const buf      = await Packer.toBuffer(doc)
  fs.writeFileSync(filepath, buf)

  console.log(`[OK] Wrote ${filepath}`)
  console.log(`     Total: ${s.total}  Pass: ${s.passed}  Fail: ${s.failed}  Skip: ${s.skipped}  (${passRate})`)
}

buildDoc().catch(e => {
  console.error('[ERROR]', e)
  process.exit(1)
})
