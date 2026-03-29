import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { fetchGeo } from '../services/api'
import { useFilters } from '../hooks/useFilters'
import 'leaflet/dist/leaflet.css'

const SVC_COLORS: Record<string, string> = {
  'CONSULTORIOS/CLINICAS':                        '#1539AA',
  'MATERNIDADE':                                  '#00b464',
  'SERVICOS AUXILIARES DE DIAGNOSTICO E TERAPIA': '#FF8800',
  'HOSPITAL ELETIVO':                             '#FF222B',
  'PRONTO SOCORRO URGEN/EMERGEN':                 '#FF4E05',
}

const HAP_BLUE  = '#1539AA'
const HAP_YELLOW = '#FFCC23'

const RAIOS = [2, 5, 10, 20, 50, 100]
const BAND_STYLES = [
  { km: 2,   color: '#1539AA', fill: 'rgba(21,57,170,0.10)',  dash: undefined },
  { km: 5,   color: '#FF8800', fill: 'rgba(255,136,0,0.09)',  dash: '4 3' },
  { km: 10,  color: '#FF8800', fill: 'rgba(255,136,0,0.07)',  dash: '5 4' },
  { km: 20,  color: '#FF4E05', fill: 'rgba(255,78,5,0.05)',   dash: '6 4' },
  { km: 50,  color: '#FF222B', fill: 'rgba(255,34,43,0.04)',  dash: '7 5' },
  { km: 100, color: '#6432c8', fill: 'rgba(100,50,200,0.03)', dash: '8 5' },
]

type SearchMode = 'cep' | 'endereco' | 'gps'
interface RefPoint { lat: number; lng: number }

function refIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${HAP_YELLOW};border:3px solid ${HAP_BLUE};box-shadow:0 2px 8px rgba(0,0,0,.4);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function MapController({ refPoint }: { refPoint: RefPoint | null }) {
  const map = useMap()
  useEffect(() => {
    if (refPoint) {
      map.flyTo([refPoint.lat, refPoint.lng], 11, { duration: 1.2 })
    }
  }, [refPoint, map])
  return null
}

export default function Raio() {
  const { filters } = useFilters()
  const [mode, setMode] = useState<SearchMode>('cep')
  const [inputVal, setInputVal] = useState('')
  const [refPoint, setRefPoint] = useState<RefPoint | null>(null)
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState<'searching' | 'found' | ''>('')
  const [activeBand, setActiveBand] = useState<number | null>(null)

  const { data } = useQuery({
    queryKey: ['geo-raio', filters, refPoint],
    queryFn: () => fetchGeo(filters, refPoint?.lat, refPoint?.lng, RAIOS),
    enabled: true,
  })

  async function searchReference() {
    setStatusType('searching')
    setStatus('Buscando...')

    if (mode === 'gps') {
      if (!navigator.geolocation) { setStatus('Geolocalização não suportada.'); setStatusType(''); return }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setRefPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setStatus(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`)
          setStatusType('found')
        },
        (err) => { setStatus('Erro: ' + err.message); setStatusType('') },
      )
      return
    }

    const val = inputVal.trim()
    if (!val) { setStatus('Digite um valor.'); setStatusType(''); return }
    const q = mode === 'cep' ? val.replace(/\D/g, '') + ', Brasil' : val + ', Brasil'

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`)
      const json = await res.json()
      if (!json.length) { setStatus('Localização não encontrada.'); setStatusType(''); return }
      setRefPoint({ lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) })
      setStatus(json[0].display_name.substring(0, 65) + '...')
      setStatusType('found')
    } catch (e: any) {
      setStatus('Erro: ' + e.message)
      setStatusType('')
    }
  }

  function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const raioContagens = RAIOS.map((r, i) => {
    if (!refPoint || !data) return { km: r, count: 0 }
    const prev = RAIOS[i - 1] ?? 0
    const cnpjs = new Set<string>()
    data.markers.forEach((m) => {
      const d = haversine(refPoint.lat, refPoint.lng, m.localizacao.lat, m.localizacao.lon)
      if (d <= r && d > prev) cnpjs.add(m.cnpjCpf)
    })
    return { km: r, count: cnpjs.size }
  })

  const acima100 = (() => {
    if (!refPoint || !data) return 0
    const cnpjs = new Set<string>()
    data.markers.forEach((m) => {
      const d = haversine(refPoint.lat, refPoint.lng, m.localizacao.lat, m.localizacao.lon)
      if (d > 100) cnpjs.add(m.cnpjCpf)
    })
    return cnpjs.size
  })()

  const activeMarkers = data?.markers.filter((m) => {
    if (!refPoint || activeBand === null) return true
    const d = haversine(refPoint.lat, refPoint.lng, m.localizacao.lat, m.localizacao.lon)
    if (activeBand === 6) return d > 100
    return d <= RAIOS[activeBand]
  }) ?? []

  const presentServices = new Set(activeMarkers.map((m) => m.servico))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="radius-layout">

        {/* ── Sidebar ── */}
        <div className="radius-sidebar">
          <div className="radius-section">
            <div className="radius-section-title">Ponto de Referência</div>
            <div className="search-btn-group">
              {(['cep', 'endereco', 'gps'] as SearchMode[]).map((m) => (
                <button
                  key={m}
                  className={`search-btn${mode === m ? ' active' : ''}`}
                  onClick={() => { setMode(m); setInputVal(''); setStatus(''); setStatusType('') }}
                >
                  {m === 'cep' ? 'CEP' : m === 'endereco' ? 'Endereço' : 'GPS'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {mode !== 'gps' && (
                <input
                  className="search-input"
                  style={{ flex: 1 }}
                  placeholder={mode === 'cep' ? 'Digite o CEP...' : 'Digite o endereço...'}
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchReference()}
                />
              )}
              <button className="btn-primary" onClick={searchReference}>
                {mode === 'gps' ? 'Usar minha localização' : 'Buscar'}
              </button>
            </div>
            {status && (
              <div className="ref-info">
                {statusType && <span className={`status-dot status-dot-${statusType}`} />}
                {status}
              </div>
            )}
          </div>

          {/* KPIs por faixa */}
          <div className="radius-section">
            <div className="radius-section-title">KPIs por Faixa de Distância</div>
            <div className="radius-kpis">
              {raioContagens.map((rc, i) => (
                <div
                  key={rc.km}
                  className={`radius-kpi${activeBand === i ? ' active-band' : ''}`}
                  onClick={() => setActiveBand(activeBand === i ? null : i)}
                >
                  <div className="radius-kpi-label">0 – {rc.km} KM</div>
                  <div className="radius-kpi-val">{rc.count.toLocaleString('pt-BR')}</div>
                </div>
              ))}
              <div
                className={`radius-kpi radius-kpi-full${activeBand === 6 ? ' active-band' : ''}`}
                onClick={() => setActiveBand(activeBand === 6 ? null : 6)}
              >
                <div className="radius-kpi-label">ACIMA DE 100 KM</div>
                <div className="radius-kpi-val">{acima100.toLocaleString('pt-BR')}</div>
              </div>
            </div>
          </div>

          {/* Filtros ativos */}
          <div className="radius-section">
            <div className="radius-section-title">Filtros Ativos</div>
            {Object.entries(filters).filter(([, v]) => v).length === 0
              ? <span style={{ fontSize: 11, color: 'var(--hap-text2)' }}>Nenhum filtro ativo.</span>
              : Object.entries(filters).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ fontSize: 11, color: 'var(--hap-text)', marginBottom: 4 }}>
                    <strong style={{ color: 'var(--hap-blue)' }}>{k}:</strong> {String(v)}
                  </div>
                ))
            }
          </div>
        </div>

        {/* ── Mapa ── */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer
            center={[-15.78, -47.93]}
            zoom={5}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution="CartoDB"
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            <MapController refPoint={refPoint} />

            {refPoint && (
              <>
                {[...BAND_STYLES].reverse().map((b) => (
                  <Circle
                    key={b.km}
                    center={[refPoint.lat, refPoint.lng]}
                    radius={b.km * 1000}
                    pathOptions={{ color: b.color, fillColor: b.fill, fillOpacity: 1, weight: 1.5, dashArray: b.dash }}
                  />
                ))}
                <Marker position={[refPoint.lat, refPoint.lng]} icon={refIcon()}>
                  <Popup><strong>Ponto de Referência</strong></Popup>
                </Marker>
              </>
            )}

            {activeMarkers.map((m) => {
              const color = SVC_COLORS[m.servico] ?? HAP_BLUE
              return (
                <CircleMarker
                  key={m.id}
                  center={[m.localizacao.lat, m.localizacao.lon]}
                  radius={5}
                  pathOptions={{ color: '#fff', fillColor: color, fillOpacity: 0.9, weight: 1.5 }}
                >
                  <Popup>
                    <div style={{ fontFamily: "'Nunito',sans-serif", fontSize: 12 }}>
                      <strong style={{ color: '#1539AA' }}>{m.nomeFantasia}</strong><br />
                      {refPoint && (
                        <span style={{ fontSize: 10, color: '#888' }}>
                          {haversine(refPoint.lat, refPoint.lng, m.localizacao.lat, m.localizacao.lon).toFixed(1)} km do ponto
                        </span>
                      )}<br />
                      {m.servico}<br />
                      <strong>{m.rede}</strong><br />
                      {m.cidade}/{m.uf}
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>

          {/* Legenda sobreposta */}
          <div className="radius-map-legend">
            <div className="radius-map-legend-title">Raios de Distância</div>
            {BAND_STYLES.map((b) => (
              <div key={b.km} className="radius-map-legend-item">
                <svg width={14} height={14} style={{ flexShrink: 0 }}>
                  <circle cx={7} cy={7} r={5} fill="none" stroke={b.color} strokeWidth={2} />
                </svg>
                0 – {b.km} km
              </div>
            ))}

            <div className="radius-map-legend-title" style={{ marginTop: 10 }}>Serviço</div>
            {Object.entries(SVC_COLORS).map(([name, color]) => (
              <div
                key={name}
                className="radius-map-legend-item"
                style={{ opacity: refPoint && !presentServices.has(name) ? 0.35 : 1 }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                {name}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
