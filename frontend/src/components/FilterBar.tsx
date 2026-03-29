import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchFilterOptions, fetchSuggest, searchRedeProduto } from '../services/api'
import { useFilters } from '../hooks/useFilters'
import type { SuggestItem, TipoBuscaRedeProduto, RedeProdutoSearchResult } from '../types'

type TabId = 'beneficiario' | 'plano' | 'produto' | 'rede'

const TABS: { id: TabId; label: string; placeholder: string; hint: string }[] = [
  { id: 'beneficiario', label: 'Beneficiário', placeholder: 'Nome ou número da carteirinha', hint: 'Busque pelo nome completo ou número da carteirinha do beneficiário' },
  { id: 'plano',        label: 'Plano',        placeholder: 'Código ou nome do plano',       hint: 'Busque pelo código numérico ou nome do plano' },
  { id: 'produto',      label: 'Produto',      placeholder: 'Código ANS ou descrição',       hint: 'Busque pelo número de registro ANS ou descrição do produto' },
  { id: 'rede',         label: 'Rede',         placeholder: 'Código ou nome da rede',        hint: 'Busque pelo código ou nome comercial da rede de atendimento' },
]

function RedeProdutoDialog({ onClose }: { onClose: () => void }) {
  const { filters, setFilter } = useFilters()
  const [activeTab, setActiveTab] = useState<TabId>('beneficiario')
  const [subTipo, setSubTipo] = useState<'nome' | 'carteirinha'>('nome')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RedeProdutoSearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resolveType(): TipoBuscaRedeProduto {
    if (activeTab === 'beneficiario') return subTipo === 'nome' ? 'beneficiario-nome' : 'beneficiario-carteirinha'
    return activeTab
  }

  async function handleSearch() {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const data = await searchRedeProduto(resolveType(), q)
      setResults(data)
      if (data.length === 1 && data[0].cdTipoRedeAtendimento != null) {
        applyFilter(data[0])
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Erro ao consultar')
    } finally {
      setLoading(false)
    }
  }

  function applyFilter(row: RedeProdutoSearchResult) {
    const value = row.cdTipoRedeAtendimento != null ? String(row.cdTipoRedeAtendimento) : ''
    setFilter('redeProduto', value)
    onClose()
  }

  function handleTabChange(tab: TabId) {
    setActiveTab(tab)
    setQuery('')
    setResults(null)
    setError(null)
  }

  function handleClear() {
    setFilter('redeProduto', '')
    onClose()
  }

  const currentTab = TABS.find((t) => t.id === activeTab)!

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  }
  const boxStyle: React.CSSProperties = {
    background: 'var(--hap-card)', borderRadius: 'var(--hap-radius)',
    boxShadow: 'var(--hap-shadow)', border: '1px solid var(--hap-border)',
    width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={boxStyle} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '24px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ fontSize: 22 }}>🔗</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--hap-blue)' }}>Filtro de Rede Produto</div>
              <div style={{ fontSize: 11, color: 'var(--hap-text2)', marginTop: 2, fontWeight: 500 }}>
                Busque por beneficiário, plano, produto ou rede para aplicar o filtro
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--hap-text2)', lineHeight: 1, padding: 4 }}
            >✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--hap-border)' }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 700,
                  color: activeTab === tab.id ? 'var(--hap-blue)' : 'var(--hap-text2)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--hap-blue)' : '2px solid transparent',
                  marginBottom: -2, transition: 'all .15s',
                }}
              >{tab.label}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 28px', overflowY: 'auto', flex: 1 }}>

          {/* Beneficiario sub-tipo radio */}
          {activeTab === 'beneficiario' && (
            <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
              {(['nome', 'carteirinha'] as const).map((opt) => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: subTipo === opt ? 'var(--hap-blue)' : 'var(--hap-text2)' }}>
                  <input
                    type="radio"
                    name="subTipo"
                    value={opt}
                    checked={subTipo === opt}
                    onChange={() => { setSubTipo(opt); setResults(null); setError(null) }}
                    style={{ accentColor: 'var(--hap-blue)' }}
                  />
                  {opt === 'nome' ? 'Buscar por nome' : 'Buscar por carteirinha'}
                </label>
              ))}
            </div>
          )}

          {/* Hint */}
          <div style={{ fontSize: 11, color: 'var(--hap-text2)', marginBottom: 12, fontWeight: 500 }}>
            {currentTab.hint}
          </div>

          {/* Search input */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              style={{
                flex: 1, background: '#fff', border: '1.5px solid var(--hap-border)',
                color: 'var(--hap-text)', padding: '10px 14px', borderRadius: 'var(--hap-radius-sm)',
                fontSize: 13, fontFamily: "'Nunito',sans-serif", fontWeight: 600, outline: 'none',
                transition: 'border-color .2s, box-shadow .2s',
              }}
              placeholder={activeTab === 'beneficiario' && subTipo === 'carteirinha' ? 'Número da carteirinha (ex: 1P0N2000082007)' : currentTab.placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              onFocus={(e) => { e.target.style.borderColor = 'var(--hap-blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(21,57,170,0.10)' }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--hap-border)'; e.target.style.boxShadow = 'none' }}
              autoFocus
            />
            <button
              className="btn-primary"
              style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
              onClick={handleSearch}
              disabled={loading || !query.trim()}
            >
              {loading ? '...' : '🔍 Buscar'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(220,50,50,.08)', border: '1px solid rgba(220,50,50,.3)', borderRadius: 'var(--hap-radius-sm)', fontSize: 12, color: '#c0392b', fontWeight: 600, marginBottom: 14 }}>
              {error}
            </div>
          )}

          {/* No results */}
          {results !== null && results.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'var(--hap-text2)', fontWeight: 600 }}>
              Nenhum resultado encontrado para "{query}".
            </div>
          )}

          {/* Results table — shown when there's more than 1 result */}
          {results !== null && results.length > 1 && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--hap-text2)', fontWeight: 700, marginBottom: 10 }}>
                {results.length} resultado(s) encontrado(s) — clique para aplicar o filtro:
              </div>
              <div style={{ border: '1px solid var(--hap-border)', borderRadius: 'var(--hap-radius-sm)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--hap-bg)', borderBottom: '1.5px solid var(--hap-border)' }}>
                      <th style={thStyle}>Rede</th>
                      {activeTab === 'beneficiario' && <th style={thStyle}>Beneficiário</th>}
                      {activeTab === 'beneficiario' && <th style={thStyle}>Operadora</th>}
                      {(activeTab === 'plano' || activeTab === 'beneficiario') && <th style={thStyle}>Plano</th>}
                      {(activeTab === 'produto' || activeTab === 'rede') && <th style={thStyle}>Produto ANS</th>}
                      <th style={{ ...thStyle, width: 80, textAlign: 'center' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, i) => (
                      <tr
                        key={i}
                        style={{ borderBottom: '1px solid var(--hap-border)', transition: 'background .15s', cursor: 'pointer' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hap-bg)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                      >
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 700, color: 'var(--hap-blue)' }}>
                            {row.cdTipoRedeAtendimento ?? '—'}
                          </span>
                          {row.nmComercialRede && (
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--hap-text2)', marginTop: 1 }}>
                              {row.nmComercialRede}
                            </span>
                          )}
                        </td>
                        {activeTab === 'beneficiario' && (
                          <td style={tdStyle}>
                            <span style={{ fontWeight: 600 }}>{row.nmPessoa ?? '—'}</span>
                            {row.cdUsuario && <span style={{ display: 'block', fontSize: 11, color: 'var(--hap-text2)' }}>{row.cdUsuario}</span>}
                          </td>
                        )}
                        {activeTab === 'beneficiario' && (
                          <td style={tdStyle}>{row.operadora ?? '—'}</td>
                        )}
                        {(activeTab === 'plano' || activeTab === 'beneficiario') && (
                          <td style={tdStyle}>
                            {row.cdPlano && <span style={{ fontWeight: 600 }}>{row.cdPlano}</span>}
                            {row.nmPlano && <span style={{ display: 'block', fontSize: 11, color: 'var(--hap-text2)' }}>{row.nmPlano}</span>}
                          </td>
                        )}
                        {(activeTab === 'produto' || activeTab === 'rede') && (
                          <td style={tdStyle}>
                            {row.nuRegPlanoAns && <span style={{ fontWeight: 600 }}>{row.nuRegPlanoAns}</span>}
                            {row.dsPlanoAns && <span style={{ display: 'block', fontSize: 11, color: 'var(--hap-text2)' }}>{row.dsPlanoAns}</span>}
                          </td>
                        )}
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <button
                            className="btn-primary"
                            style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700 }}
                            onClick={() => applyFilter(row)}
                          >
                            Selecionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Single result auto-applied message */}
          {results !== null && results.length === 1 && (
            <div style={{ padding: '10px 14px', background: 'rgba(21,57,170,.07)', border: '1px solid rgba(21,57,170,.2)', borderRadius: 'var(--hap-radius-sm)', fontSize: 12, color: 'var(--hap-blue)', fontWeight: 700 }}>
              ✓ Filtro aplicado automaticamente: rede {results[0].cdTipoRedeAtendimento}
              {results[0].nmComercialRede ? ` — ${results[0].nmComercialRede}` : ''}
            </div>
          )}

          {/* Current filter indicator */}
          {filters.redeProduto && results === null && (
            <div style={{ padding: '10px 14px', background: 'rgba(21,57,170,.07)', border: '1px solid rgba(21,57,170,.2)', borderRadius: 'var(--hap-radius-sm)', fontSize: 12, color: 'var(--hap-blue)', fontWeight: 700 }}>
              Filtro atual: rede produto <strong>{filters.redeProduto}</strong>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--hap-border)', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button
            style={{ background: 'none', border: '1.5px solid var(--hap-border)', color: 'var(--hap-text2)', padding: '8px 18px', borderRadius: 'var(--hap-radius-sm)', cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 700 }}
            onClick={handleClear}
          >
            Limpar filtro
          </button>
          <button
            style={{ background: 'none', border: '1.5px solid var(--hap-border)', color: 'var(--hap-text2)', padding: '8px 18px', borderRadius: 'var(--hap-radius-sm)', cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 700 }}
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 800,
  color: 'var(--hap-blue)', textTransform: 'uppercase', letterSpacing: '.5px',
}
const tdStyle: React.CSSProperties = {
  padding: '9px 12px', fontSize: 12, color: 'var(--hap-text)', verticalAlign: 'middle',
}

export default function FilterBar() {
  const { filters, setFilter, clearFilters, activeCount } = useFilters()
  const [prestadorInput, setPrestadorInput] = useState('')
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showRedeProdutoDialog, setShowRedeProdutoDialog] = useState(false)
  const suggestTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: opts } = useQuery({
    queryKey: ['filter-options', filters.uf],
    queryFn: () => fetchFilterOptions(filters.uf || undefined),
  })

  function handleSelect(field: keyof typeof filters, value: string) {
    setFilter(field, value)
    if (field === 'uf') setFilter('cidade', '')
  }

  async function onPrestadorInput(val: string) {
    setPrestadorInput(val)
    if (!val) {
      setFilter('cnpjCpf', '')
      setFilter('search', '')
      setSuggestions([])
      return
    }
    if (suggestTimeout.current) clearTimeout(suggestTimeout.current)
    suggestTimeout.current = setTimeout(async () => {
      const results = await fetchSuggest(val)
      setSuggestions(results)
      setShowSuggestions(true)
    }, 250)
  }

  function selectSuggestion(item: SuggestItem) {
    setPrestadorInput(item.nomeFantasia)
    setFilter('cnpjCpf', item.cnpjCpf)
    setFilter('search', '')
    setSuggestions([])
    setShowSuggestions(false)
  }

  function clearPrestador() {
    setPrestadorInput('')
    setFilter('cnpjCpf', '')
    setFilter('search', '')
    setSuggestions([])
  }

  return (
    <>
      {showRedeProdutoDialog && (
        <RedeProdutoDialog onClose={() => setShowRedeProdutoDialog(false)} />
      )}
      <div className="filters-bar">
        <div className="filters-row">
          <span className="filter-label">Filtros</span>

          <select
            className="filter-select"
            value={filters.operadora}
            onChange={(e) => handleSelect('operadora', e.target.value)}
          >
            <option value="">Operadora</option>
            {opts?.operadoras.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <select
            className="filter-select"
            value={filters.uf}
            onChange={(e) => handleSelect('uf', e.target.value)}
          >
            <option value="">UF</option>
            {opts?.ufs.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <select
            className="filter-select"
            value={filters.cidade}
            onChange={(e) => handleSelect('cidade', e.target.value)}
          >
            <option value="">Cidade</option>
            {opts?.cidades.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <select
            className="filter-select"
            value={filters.servico}
            onChange={(e) => handleSelect('servico', e.target.value)}
          >
            <option value="">Serviço</option>
            {opts?.servicos.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <select
            className="filter-select"
            value={filters.grupoServico}
            onChange={(e) => handleSelect('grupoServico', e.target.value)}
          >
            <option value="">Grupo Serviço</option>
            {opts?.grupos.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <select
            className="filter-select"
            value={filters.especialidade}
            onChange={(e) => handleSelect('especialidade', e.target.value)}
          >
            <option value="">Especialidade</option>
            {opts?.especialidades.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <select
            className="filter-select"
            value={filters.rede}
            onChange={(e) => handleSelect('rede', e.target.value)}
          >
            <option value="">Rede</option>
            {opts?.redes.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <button
            className={`btn-filtro-rede${filters.redeProduto ? ' active' : ''}`}
            onClick={() => setShowRedeProdutoDialog(true)}
            title={filters.redeProduto ? `Rede Produto: ${filters.redeProduto}` : 'Filtro de Rede Produto'}
          >
            🔗 Filtro de Rede{filters.redeProduto ? ` · ${filters.redeProduto}` : ''}
          </button>

          <button className="btn-clear" onClick={() => { clearFilters(); clearPrestador() }}>
            ✕ Limpar
          </button>
        </div>

        <div className="filters-row">
          <span className="filter-label">Prestador</span>
          <div className="filter-search-wrap" style={{ position: 'relative' }}>
            <span className="filter-search-icon">🔍</span>
            <input
              className="filter-search-input"
              placeholder="Buscar por nome ou CNPJ..."
              value={prestadorInput}
              autoComplete="off"
              onChange={(e) => onPrestadorInput(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            />
            {prestadorInput && (
              <span className="filter-search-clear" onClick={clearPrestador}>✕</span>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    className="suggestion-item"
                    onMouseDown={() => selectSuggestion(s)}
                  >
                    <strong>{s.nomeFantasia}</strong>{' '}
                    <small>{s.cnpjCpf}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--hap-text2)', fontWeight: 600 }}>
            {activeCount > 0 ? `${activeCount} filtro(s) ativo(s)` : ''}
          </span>
        </div>
      </div>
    </>
  )
}
