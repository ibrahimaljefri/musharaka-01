/**
 * excelExport — lazy-loaded XLSX writer for tabular data.
 *
 * Usage:
 *   await exportRowsAsXlsx({
 *     filename:  'sales-report-2026-02.xlsx',
 *     sheetName: 'تقرير المبيعات',
 *     columns: [
 *       { key: 'sale_date',      label: 'التاريخ',       width: 14, get: r => r.sale_date },
 *       { key: 'amount',         label: 'المبلغ (ر.س)',  width: 16, get: r => Number(r.amount) },
 *     ],
 *     rows: filteredRows,
 *     totalsRow: { sale_date: 'الإجمالي', amount: total },
 *   })
 *
 * Lazy-loads the `xlsx` package so the chunk is only fetched when the user
 * actually clicks "Export". Sheet view is set to RTL for Arabic-first content.
 */

export async function exportRowsAsXlsx({ filename, sheetName = 'Report', columns, rows, totalsRow }) {
  const XLSX = await import('xlsx')

  const headers = columns.map(c => c.label)
  const data    = rows.map(r => columns.map(c => c.get ? c.get(r) : r[c.key]))

  if (totalsRow) {
    data.push(columns.map(c => totalsRow[c.key] ?? ''))
  }

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])

  // Per-column widths
  ws['!cols'] = columns.map(c => ({ wch: c.width || 16 }))

  // RTL sheet view for Arabic
  ws['!sheetView'] = { ...(ws['!sheetView'] || {}), rightToLeft: true }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31)) // 31 char sheet limit

  XLSX.writeFile(wb, filename)
}
