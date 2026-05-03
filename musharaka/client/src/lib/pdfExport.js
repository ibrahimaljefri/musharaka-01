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

  // Reserve a 14mm strip at the bottom of every PDF page for the footer
  // (Page X of Y + Generated timestamp). The image tile fills only the
  // top portion so it never collides with the footer text.
  const FOOTER_MARGIN_MM = 14
  const usableHeightMm = pageHeightMm - FOOTER_MARGIN_MM

  // Map: page width = full image width (canvas was rendered at width 794px
  // which corresponds to 210mm at 96dpi × scale 2)
  const pxPerMm        = canvas.width / pageWidthMm
  const usableHeightPx = Math.floor(usableHeightMm * pxPerMm)

  /**
   * Walk upward from `targetY` looking for a horizontal band of NEARLY
   * UNIFORM pixels. A row with text shows high variance (text vs. bg);
   * a row that is all whitespace, all border, or all alternating-row tint
   * shows very low variance. We cut at any low-variance row — that's
   * either a table border, an empty gap, or a bg-only line — never inside
   * a row of text. Falls back to `targetY` if nothing safe is found.
   */
  const sourceCtx = canvas.getContext('2d')
  function findSafeBreak(targetY, prevY) {
    if (targetY >= canvas.height) return canvas.height
    // Allow searching back up to half a page; require at least 200px of
    // forward progress so we never produce vanishingly small pages.
    const minY = Math.max(prevY + 200, targetY - Math.floor(usableHeightPx / 2))
    const sampleW = Math.min(canvas.width, 600)
    const sampleX = Math.floor((canvas.width - sampleW) / 2)

    // Pull the whole strip in one go — much faster than 1 row per loop tick
    const stripHeight = Math.max(1, targetY - minY)
    if (stripHeight < 1) return targetY
    const stripY = Math.max(0, targetY - stripHeight)
    const strip = sourceCtx.getImageData(sampleX, stripY, sampleW, stripHeight).data
    const rowBytes = sampleW * 4

    // Iterate rows from bottom (= targetY) upward
    for (let row = stripHeight - 1; row >= 0; row--) {
      const off = row * rowBytes
      // Compute mean absolute deviation across R/G/B in this row
      let sumR = 0, sumG = 0, sumB = 0
      for (let i = 0; i < rowBytes; i += 4) {
        sumR += strip[off + i]
        sumG += strip[off + i + 1]
        sumB += strip[off + i + 2]
      }
      const avgR = sumR / sampleW, avgG = sumG / sampleW, avgB = sumB / sampleW
      let dev = 0
      for (let i = 0; i < rowBytes; i += 4) {
        dev += Math.abs(strip[off + i]     - avgR)
        dev += Math.abs(strip[off + i + 1] - avgG)
        dev += Math.abs(strip[off + i + 2] - avgB)
      }
      const meanDev = dev / (3 * sampleW)
      // Low variance = uniform pixel row = safe to cut
      if (meanDev < 4) return stripY + row
    }
    return targetY
  }

  // Slice the source canvas vertically and add one tile per PDF page.
  let yPx = 0
  let pageIdx = 0
  while (yPx < canvas.height) {
    const naiveEnd = yPx + usableHeightPx
    const endPx = naiveEnd >= canvas.height
      ? canvas.height
      : findSafeBreak(naiveEnd, yPx)
    const sliceHeightPx = endPx - yPx
    if (sliceHeightPx <= 0) break

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

    yPx = endPx
    pageIdx += 1
  }

  // Page X of Y overlay — drawn natively by jsPDF in Latin chars (no font
  // embedding needed). Sits in the reserved 14mm bottom strip so it never
  // overlays content. Generation timestamp on the opposite side.
  const totalPages = pdf.internal.getNumberOfPages()
  const ts = new Date().toISOString().slice(0, 16).replace('T', ' ')
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(140, 140, 140)
  const footerY = pageHeightMm - 6
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i)
    pdf.text(`Page ${i} of ${totalPages}`, pageWidthMm - 12, footerY, { align: 'right' })
    pdf.text(`Generated ${ts}`, 12, footerY, { align: 'left' })
  }

  pdf.save(filename)
}
