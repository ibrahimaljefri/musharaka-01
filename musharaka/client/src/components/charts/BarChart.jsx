import { useEffect, useRef } from 'react'
import { select } from 'd3-selection'
import { scaleBand, scaleLinear } from 'd3-scale'
import { axisLeft } from 'd3-axis'
import { max } from 'd3-array'
import 'd3-transition' // patches d3-selection with .transition()

export default function BarChart({ data = [], title = '', color = '#F59E0B', height = 300, maxItems = 20 }) {
  const svgRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!data.length || !svgRef.current || !containerRef.current) return

    const sliced = data.slice(0, maxItems)
    const isDark = document.documentElement.classList.contains('dark')
    const textColor = isDark ? '#D1D5DB' : '#374151'
    const gridColor = isDark ? '#374151' : '#E5E7EB'

    const containerWidth = containerRef.current.clientWidth || 400
    const margin = { top: 20, right: 60, bottom: 20, left: 120 }
    const width = containerWidth - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    const svg = select(svgRef.current)
    svg.selectAll('*').remove()

    svg
      .attr('width', containerWidth)
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', title)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Define gradient
    const defs = svg.append('defs')
    const gradId = `bar-grad-${title.replace(/\s/g, '-').replace(/[^\w-]/g, '')}`
    const grad = defs.append('linearGradient')
      .attr('id', gradId)
      .attr('x1', '0%').attr('x2', '100%')
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#F59E0B')
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#D97706')

    const xMax = max(sliced, d => d.value) || 1
    const x = scaleLinear().domain([0, xMax * 1.1]).range([0, width])
    const y = scaleBand().domain(sliced.map(d => d.label)).range([0, chartHeight]).padding(0.25)

    // Y axis (labels)
    const yAxis = g.append('g')
      .call(axisLeft(y).tickSize(0))
    yAxis.select('.domain').remove()
    yAxis.selectAll('text')
      .attr('fill', textColor)
      .attr('font-family', 'Tajawal, sans-serif')
      .attr('font-size', '11px')
      .attr('text-anchor', 'end')

    // Grid lines
    g.selectAll('.grid-line')
      .data(x.ticks(4))
      .enter().append('line')
      .attr('class', 'grid-line')
      .attr('x1', d => x(d)).attr('x2', d => x(d))
      .attr('y1', 0).attr('y2', chartHeight)
      .attr('stroke', gridColor)
      .attr('stroke-dasharray', '3,3')

    // Bars
    g.selectAll('.bar')
      .data(sliced)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('y', d => y(d.label))
      .attr('height', y.bandwidth())
      .attr('x', 0)
      .attr('width', 0)
      .attr('fill', `url(#${gradId})`)
      .attr('rx', 3)
      .transition()
      .duration(600)
      .attr('width', d => x(d.value))

    // Value labels
    g.selectAll('.bar-label')
      .data(sliced)
      .enter().append('text')
      .attr('class', 'bar-label')
      .attr('x', d => x(d.value) + 6)
      .attr('y', d => y(d.label) + y.bandwidth() / 2 + 4)
      .attr('fill', textColor)
      .attr('font-family', 'Tajawal, sans-serif')
      .attr('font-size', '11px')
      .text(d => d.value)

  }, [data, title, color, height, maxItems])

  useEffect(() => {
    const handleResize = () => {
      if (!svgRef.current) return
      select(svgRef.current).selectAll('*').remove()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      <svg ref={svgRef} style={{ display: 'block' }} />
    </div>
  )
}
