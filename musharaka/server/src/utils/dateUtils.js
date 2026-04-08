function getDaysInRange(startDate, endDate) {
  const days = []
  // Parse as local noon to avoid DST and UTC offset edge cases
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  const current = new Date(sy, sm - 1, sd, 12)
  const end     = new Date(ey, em - 1, ed, 12)
  while (current <= end) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    days.push(`${y}-${m}-${d}`)
    current.setDate(current.getDate() + 1)
  }
  return days
}

function getDaysInMonth(month, year) {
  const lastDay = new Date(year, month, 0).getDate()
  const mm = String(month).padStart(2, '0')
  const start = `${year}-${mm}-01`
  const end   = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`
  return getDaysInRange(start, end)
}

module.exports = { getDaysInRange, getDaysInMonth }
