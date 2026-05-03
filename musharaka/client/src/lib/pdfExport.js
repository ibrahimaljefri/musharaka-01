/**
 * exportNodeAsPdf — render a DOM node to a PDF and trigger a download.
 *
 * Uses html2canvas to snapshot the rendered DOM (including Arabic RTL,
 * fonts, colors, layout) into a canvas, then jsPDF to embed that canvas
 * as an image and save as PDF. Result: pixel-perfect copy of what's on
 * screen, with Arabic working flawlessly. Trade-off: no selectable text
 * inside the PDF (it's an image), which is fine for sales-data export.
 *
 * Both libs are dynamically imported so they don't bloat the main bundle —
 * only loaded when a user actually clicks an export button.
 *
 * Implementation notes:
 *   - Waits for document.fonts.ready so Tajawal is available before capture
 *     (prevents Arabic falling back to a broken serif in the off-screen DOM).
 *   - Renders to JPEG (quality 0.92) instead of PNG → typically ~10× smaller
 *     final file with no perceptible quality loss for text/UI captures.
 *   - For multi-page output, slices the source canvas into per-page tiles so
 *     each PDF page only carries its own pixels (instead of embedding the
 *     full giant canvas N times with negative offsets).
 *
 * Usage:
 *   await exportNodeAsPdf(myNode, 'submission-BR-001-Feb-2026.pdf')
 */
export async function exportNodeAsPdf(node, filename = 'export.pdf') {
  if (!node) throw new Error('exportNodeAsPdf: node is required')

  // Make sure web fonts (Tajawal etc.) are fully loaded before capture
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try { await document.fonts.ready } catch { /* non-blocking */ }
  }

  const [{ default: html2canvas }, jsPDFModule] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])
  const { jsPDF } = jsPDFModule

  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  })

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidthMm  = pdf.internal.pageSize.getWidth()    // 210
  const pageHeightMm = pdf.internal.pageSize.getHeight()   // 297

  // Map: page width = full image width
  const pxPerMm    = canvas.width / pageWidthMm
  const pageHeightPx = Math.floor(pageHeightMm * pxPerMm)

  // Slice the source canvas vertically and add one tile per PDF page.
  // Each tile is an independent JPEG, so the final PDF only contains the
  // pixels actually used per page (no duplicated image bytes).
  let yPx = 0
  let pageIdx = 0
  while (yPx < canvas.height) {
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - yPx)

    const tile = document.createElement('canvas')
    tile.width  = canvas.width
    tile.height = sliceHeightPx
    const ctx = tile.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, tile.width, tile.height)
    ctx.drawImage(canvas, 0, yPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx)

    const sliceHeightMm = sliceHeightPx / pxPerMm
    const tileData = tile.toDataURL('image/jpeg', 0.92)

    if (pageIdx > 0) pdf.addPage()
    pdf.addImage(tileData, 'JPEG', 0, 0, pageWidthMm, sliceHeightMm)

    yPx += sliceHeightPx
    pageIdx += 1
  }

  pdf.save(filename)
}
