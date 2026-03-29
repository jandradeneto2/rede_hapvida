import type { AggItem } from '../types'

const CHART_COLORS = ['#1539AA', '#FF8800', '#FF222B', '#00b464', '#6432c8', '#FF4E05', '#FFCC23', '#0090d0']

interface Props {
  items: AggItem[]
  field: string
  activeValue?: string
  onFilter: (field: string, value: string) => void
}

export default function DonutChart({ items, field, activeValue, onFilter }: Props) {
  const total = items.reduce((s, i) => s + i.count, 0)

  // r=48, strokeWidth=18 → outer edge = 48+9 = 57px < viewBox half (65), never clipped
  const r = 48
  const cx = 65
  const cy = 65
  const strokeWidth = 18
  const circumference = 2 * Math.PI * r

  let offset = 0
  const slices = items.map((item, i) => {
    const pct = item.count / total
    const dash = pct * circumference
    const gap = circumference - dash
    const slice = { item, dashArray: `${dash} ${gap}`, dashOffset: -offset, color: CHART_COLORS[i % CHART_COLORS.length] }
    offset += dash
    return slice
  })

  return (
    <div className="donut-wrap">
      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--hap-bg2)" strokeWidth={strokeWidth} />
        {slices.map((s) => (
          <circle
            key={s.item.name}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeWidth}
            strokeDasharray={s.dashArray}
            strokeDashoffset={s.dashOffset}
            style={{ transition: 'stroke-dashoffset .5s', cursor: 'pointer', transformOrigin: 'center', transform: 'rotate(-90deg)' }}
            onClick={() => onFilter(field, s.item.name)}
          />
        ))}
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={14} fontWeight={800} fill="var(--hap-blue)" fontFamily="Nunito,sans-serif">
          {total.toLocaleString('pt-BR')}
        </text>
      </svg>
      <div className="donut-legend">
        {slices.map((s) => (
          <div
            key={s.item.name}
            className="donut-legend-item"
            style={{ opacity: activeValue && activeValue !== s.item.name ? 0.5 : 1 }}
            onClick={() => onFilter(field, s.item.name)}
          >
            <div className="donut-dot" style={{ background: s.color }} />
            <span>{s.item.name}</span>
            <span style={{ color: 'var(--hap-blue)', fontWeight: 800, fontSize: 11, marginLeft: 6 }}>
              {s.item.count.toLocaleString('pt-BR')}
            </span>
            <span style={{ color: 'var(--hap-text2)', fontWeight: 500, fontSize: 11, marginLeft: 3 }}>
              ({((s.item.count / total) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
