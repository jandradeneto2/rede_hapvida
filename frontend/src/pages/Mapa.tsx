import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { useFilters } from '../hooks/useFilters'
import { fetchGeo } from '../services/api'
import 'leaflet/dist/leaflet.css'

const SVC_COLORS: Record<string, string> = {
  'CONSULTORIOS/CLINICAS':                        '#1539AA',
  'MATERNIDADE':                                  '#00b464',
  'SERVICOS AUXILIARES DE DIAGNOSTICO E TERAPIA': '#FF8800',
  'HOSPITAL ELETIVO':                             '#FF222B',
  'PRONTO SOCORRO URGEN/EMERGEN':                 '#FF4E05',
}

const SVC_ORDER = Object.keys(SVC_COLORS)

export default function Mapa() {
  const { filters } = useFilters()

  const { data, isLoading } = useQuery({
    queryKey: ['geo', filters],
    queryFn: () => fetchGeo(filters),
  })

  const presentServices = new Set(data?.markers.map((m) => m.servico) ?? [])
  const count = data?.markers.length ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="map-info-bar">
        <span style={{ fontWeight: 700, color: 'var(--hap-blue)' }}>Mapa da Rede</span>
        {isLoading && <span className="spinner" />}
        {data && (
          <span style={{ color: 'var(--hap-text2)' }}>
            {count.toLocaleString('pt-BR')} locais com coordenadas
          </span>
        )}
      </div>
      <div className="map-container">
        <MapContainer
          center={[-15.78, -47.93]}
          zoom={5}
          style={{ flex: 1, height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution="CartoDB"
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {data?.markers.map((m) => {
            const color = SVC_COLORS[m.servico] ?? '#1539AA'
            return (
              <CircleMarker
                key={m.id}
                center={[m.localizacao.lat, m.localizacao.lon]}
                radius={5}
                pathOptions={{ color: '#fff', fillColor: color, fillOpacity: 0.9, weight: 1.5 }}
              >
                <Popup>
                  <div style={{ fontFamily: "'Nunito',sans-serif", fontSize: 12, minWidth: 190 }}>
                    <strong style={{ color: '#1539AA' }}>{m.nomeFantasia}</strong><br />
                    <span style={{ color: '#666' }}>{m.razaoSocial}</span><br />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#888' }}>CNPJ: </span>{m.cnpjCpf}<br />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#888' }}>Serviço: </span>{m.servico}<br />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#888' }}>Rede: </span>
                    <strong>{m.rede}</strong><br />
                    {m.cidade}/{m.uf}
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>

        <div className="map-legend">
          <div className="map-legend-title">Tipo de Serviço</div>
          {SVC_ORDER.map((s) => (
            <div
              key={s}
              className="legend-item"
              style={{ opacity: data && !presentServices.has(s) ? 0.35 : 1 }}
            >
              <div className="legend-dot" style={{ background: SVC_COLORS[s] }} />
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
