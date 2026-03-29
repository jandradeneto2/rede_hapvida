import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: '📊 Dashboard' },
  { to: '/lista', label: '📋 Lista de Prestadores' },
  { to: '/mapa', label: '🗺 Mapa' },
  { to: '/raio', label: '📍 Raio de Distância' },
]

const navStyle: React.CSSProperties = {
  background: 'var(--hap-blue)',
  display: 'flex',
  alignItems: 'center',
  padding: '0 24px',
  height: 56,
  flexShrink: 0,
  gap: 4,
  boxShadow: '0 2px 12px rgba(21,57,170,0.3)',
}

const tabStyle: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: 8,
  cursor: 'pointer',
  color: 'rgba(255,255,255,0.75)',
  fontSize: 13,
  fontWeight: 600,
  border: 'none',
  background: 'none',
  fontFamily: "'Nunito', sans-serif",
  whiteSpace: 'nowrap',
  textDecoration: 'none',
  transition: 'all .2s',
}

export default function Nav() {
  return (
    <nav style={navStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 28 }}>
        <svg width={32} height={32} viewBox="0 0 100 100">
          <ellipse cx={50} cy={22} rx={13} ry={20} fill="#FF222B" transform="rotate(0 50 50)" />
          <ellipse cx={50} cy={22} rx={13} ry={20} fill="#FF4E05" transform="rotate(60 50 50)" />
          <ellipse cx={50} cy={22} rx={13} ry={20} fill="#FF8800" transform="rotate(120 50 50)" />
          <ellipse cx={50} cy={22} rx={13} ry={20} fill="#FF8800" transform="rotate(180 50 50)" />
          <ellipse cx={50} cy={22} rx={13} ry={20} fill="#FF8800" transform="rotate(240 50 50)" />
          <ellipse cx={50} cy={22} rx={10} ry={16} fill="#FFCC23" transform="rotate(300 50 50)" />
        </svg>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
            Rede de Atendimento
          </div>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.7)', letterSpacing: 1, textTransform: 'uppercase' }}>
            Hapvida · NDI · CCG
          </div>
        </div>
      </div>

      <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,.2)', margin: '0 8px' }} />

      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          style={({ isActive }) => ({
            ...tabStyle,
            color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
            background: isActive ? 'rgba(255,255,255,0.18)' : 'none',
            borderBottom: isActive ? '3px solid var(--hap-yellow)' : '3px solid transparent',
            borderRadius: isActive ? '8px 8px 0 0' : 8,
          })}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
