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
 * Usage:
 *   await exportNodeAsPdf(myNode, 'submission-BR-001-Feb-2026.pdf')
 */
export async function exportNodeAsPdf(node, filename = 'export.pdf') {
  if (!node) throw new Error('exportNodeAsPdf: node is required')

  const [{ default: html2canvas }, jsPDFModule] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])
  const { jsPDF } = jsPDFModule

  // 2x scale for crisp output on retina + ink-saving white background
  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  })
  const imgData = canvas.toDataURL('image/png')

  // A4 portrait. Width = 210mm. Compute height to preserve aspect ratio.
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth  = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgWidth  = pageWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  // Multi-page split if the rendered image is taller than one A4 page
  let heightLeft = imgHeight
  let position   = 0
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight

  while (heightLeft > 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }

  pdf.save(filename)
}
