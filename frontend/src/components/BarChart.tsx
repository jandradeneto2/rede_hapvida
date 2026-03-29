import { useState } from 'react'
import type { AggItem } from '../types'

interface Props {
  items: AggItem[]
  field: string
  color: string
  scrollable?: boolean
  activeValue?: string
  onFilter: (field: string, value: string) => void
}

export default function BarChart({ items, field, color, scrollable, activeValue, onFilter }: Props) {
  const [sort, setSort] = useState<'qty' | 'name'>('qty')

  const sorted = items.filter(i => i.name !== '')
  if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  const max = items[0]?.count || 1

  return (
    <div>
      {scrollable && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          <button className={`sort-btn${sort === 'qty' ? ' active' : ''}`} onClick={() => setSort('qty')}>Qtd</button>
          <button className={`sort-btn${sort === 'name' ? ' active' : ''}`} onClick={() => setSort('name')}>A-Z</button>
        </div>
      )}
      <div className={scrollable ? 'bar-list bar-list-scroll' : 'bar-list'}>
        {sorted.map((item) => (
          <div
            key={item.name}
            className={`bar-item${activeValue === item.name ? ' active-filter' : ''}`}
            onClick={() => onFilter(field, item.name)}
          >
            <div className="bar-header">
              <span className="bar-name" title={item.name}>{item.name}</span>
              <span className="bar-val">{item.count.toLocaleString('pt-BR')}</span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${(item.count / max * 100).toFixed(1)}%`, background: color, opacity: 0.85 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
