import { useQuery } from '@tanstack/react-query'
import { useFilters } from '../hooks/useFilters'
import { fetchAggregations } from '../services/api'
import BarChart from '../components/BarChart'
import DonutChart from '../components/DonutChart'

const HAP_BLUE = '#1539AA'
const HAP_ORANGE = '#FF8800'
const HAP_RED = '#FF222B'
const HAP_GREEN = '#00b464'
const HAP_PURPLE = '#6432c8'

interface KpiCardProps {
  label: string
  value: number | string
  sub: string
  accent: string
}

function KpiCard({ label, value, sub, accent }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <div className={`kpi-accent kpi-accent-${accent}`} />
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
      </div>
      <div className="kpi-sub">{sub}</div>
    </div>
  )
}

export default function Dashboard() {
  const { filters, setFilter } = useFilters()

  const { data, isLoading } = useQuery({
    queryKey: ['aggregations', filters],
    queryFn: () => fetchAggregations(filters),
  })

  function onFilter(field: string, value: string) {
    const map: Record<string, keyof typeof filters> = {
      operadora: 'operadora',
      uf: 'uf',
      cidade: 'cidade',
      servico: 'servico',
      grupoServico: 'grupoServico',
      especialidade: 'especialidade',
      rede: 'rede',
    }
    const key = map[field]
    if (!key) return
    setFilter(key, filters[key] === value ? '' : value)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="scroll-content">
        {isLoading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--hap-text2)' }}>
            <span className="spinner" /> Carregando...
          </div>
        )}
        {data && (
          <>
            <div className="kpi-grid">
              <KpiCard label="Prestadores" value={data.kpis.totalPrestadores} sub="CNPJ/CPF distintos" accent="blue" />
              <KpiCard label="Locais Atend." value={data.kpis.totalLocais} sub="CNPJ + Endereço" accent="orange" />
              <KpiCard label="UF" value={data.kpis.totalUfs} sub="Estados" accent="yellow" />
              <KpiCard label="Municípios" value={data.kpis.totalCidades} sub="Cidades únicas" accent="green" />
              <KpiCard label="Rede Própria" value={data.kpis.ownNetwork} sub="Prestadores" accent="blue" />
              <KpiCard label="Credenciada" value={data.kpis.accreditedNetwork} sub="Prestadores" accent="orange" />
            </div>

            <div className="charts-grid">
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Operadora</div>
                    <div className="chart-sub">Prestadores distintos — clique para filtrar</div>
                  </div>
                </div>
                <BarChart
                  items={data.porOperadora}
                  field="operadora"
                  color={HAP_BLUE}
                  scrollable
                  activeValue={filters.operadora}
                  onFilter={onFilter}
                />
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Rede</div>
                    <div className="chart-sub">Distribuição por tipo de rede</div>
                  </div>
                </div>
                <DonutChart
                  items={data.porRede}
                  field="rede"
                  activeValue={filters.rede}
                  onFilter={onFilter}
                />
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Tipo de Serviço</div>
                    <div className="chart-sub">Clique para filtrar</div>
                  </div>
                </div>
                <BarChart
                  items={data.porServico}
                  field="servico"
                  color={HAP_ORANGE}
                  scrollable
                  activeValue={filters.servico}
                  onFilter={onFilter}
                />
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">UF</div>
                    <div className="chart-sub">Estados — clique para filtrar</div>
                  </div>
                </div>
                <BarChart
                  items={data.porUf}
                  field="uf"
                  color={HAP_GREEN}
                  scrollable
                  activeValue={filters.uf}
                  onFilter={onFilter}
                />
              </div>

              <div className="chart-card chart-card-full">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">
                      Grupo de Serviço
                    </div>
                    <div className="chart-sub">Consultórios / Clínicas — clique para filtrar</div>
                  </div>
                </div>
                <BarChart
                  items={data.porGrupo}
                  field="grupoServico"
                  color="#FF4E05"
                  scrollable
                  activeValue={filters.grupoServico}
                  onFilter={onFilter}
                />
              </div>

              <div className="chart-card chart-card-full">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Especialidade</div>
                    <div className="chart-sub">Clique para filtrar</div>
                  </div>
                </div>
                <BarChart
                  items={data.porEspecialidade}
                  field="especialidade"
                  color={HAP_RED}
                  scrollable
                  activeValue={filters.especialidade}
                  onFilter={onFilter}
                />
              </div>

              <div className="chart-card chart-card-full">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">
                      Municípios
                      {filters.uf ? ` — ${filters.uf}` : ' (todas as UFs)'}
                    </div>
                    <div className="chart-sub">Clique para filtrar</div>
                  </div>
                </div>
                <BarChart
                  items={data.porCidade}
                  field="cidade"
                  color={HAP_PURPLE}
                  scrollable
                  activeValue={filters.cidade}
                  onFilter={onFilter}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
