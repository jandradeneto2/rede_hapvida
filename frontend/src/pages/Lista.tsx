import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useFilters } from '../hooks/useFilters'
import { fetchPrestadores } from '../services/api'

const LIMIT = 50

export default function Lista() {
  const { filters } = useFilters()
  const [listaSearch, setListaSearch] = useState('')
  const [cursors, setCursors] = useState<(string | null)[]>([null])
  const [cursorIdx, setCursorIdx] = useState(0)

  const queryFilters = { ...filters, ...(listaSearch ? { search: listaSearch } : {}) }
  const currentCursor = cursors[cursorIdx]
  const pageNumber = cursorIdx + 1

  const { data, isLoading } = useQuery({
    queryKey: ['prestadores', queryFilters, currentCursor],
    queryFn: () => fetchPrestadores(queryFilters, currentCursor, LIMIT),
    placeholderData: (prev) => prev,
  })

  function resetCursors() {
    setCursors([null])
    setCursorIdx(0)
  }

  function goNext() {
    if (!data?.nextSearchAfter) return
    const nextIdx = cursorIdx + 1
    setCursors((prev) => {
      const updated = prev.slice(0, nextIdx)
      updated.push(data.nextSearchAfter)
      return updated
    })
    setCursorIdx(nextIdx)
  }

  function goPrev() {
    if (cursorIdx > 0) setCursorIdx((prev) => prev - 1)
  }

  const hasNext = !!data?.nextSearchAfter
  const hasPrev = cursorIdx > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Search bar */}
      <div style={{ padding: '8px 20px', background: 'var(--hap-card)', borderBottom: '1px solid var(--hap-border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--hap-blue)', textTransform: 'uppercase', letterSpacing: '.7px' }}>
          🔍 Busca livre
        </span>
        <input
          type="text"
          style={{ background: '#fff', border: '1.5px solid var(--hap-border)', padding: '5px 10px', borderRadius: 8, fontSize: 12, fontFamily: 'Nunito,sans-serif', fontWeight: 600, width: 320 }}
          placeholder="Nome, razão social, endereço..."
          value={listaSearch}
          onChange={(e) => { setListaSearch(e.target.value); resetCursors() }}
        />
        <span style={{ fontSize: 11, color: 'var(--hap-text2)', fontWeight: 600 }}>
          {data ? `${data.total.toLocaleString('pt-BR')} registros` : ''}
        </span>
        {isLoading && <span className="spinner" />}
      </div>

      <div className="table-wrap" style={{ flex: 1, overflow: 'auto' }}>
        {data && (
          <table>
            <thead>
              <tr>
                <th>Operadora</th>
                <th>UF</th>
                <th>Cidade</th>
                <th>Rede</th>
                <th>Serviço</th>
                <th>Nome Fantasia</th>
                <th>Razão Social</th>
                <th>Endereço</th>
                <th>Bairro</th>
                <th>CEP</th>
                <th>Telefones</th>
                <th>Cód. Prestador</th>
                <th>CNPJ/CPF</th>
                <th>CRM/CNES</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((r) => (
                <tr key={r.id}>
                  <td>{r.operadora}</td>
                  <td><strong>{r.uf}</strong></td>
                  <td>{r.cidade}</td>
                  <td>
                    <span className={`badge ${r.rede === 'Própria' ? 'badge-propria' : 'badge-credenciada'}`}>
                      {r.rede}
                    </span>
                  </td>
                  <td><span className="badge badge-sv">{r.servico}</span></td>
                  <td><strong>{r.nomeFantasia}</strong></td>
                  <td style={{ color: 'var(--hap-text2)' }}>{r.razaoSocial}</td>
                  <td style={{ color: 'var(--hap-text2)' }}>
                    {r.endereco}{r.complemento ? ` ${r.complemento}` : ''}
                  </td>
                  <td style={{ color: 'var(--hap-text2)' }}>{r.bairro}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.cep}</td>
                  <td style={{ color: 'var(--hap-text2)', fontSize: 11 }}>{r.telefones}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--hap-text2)' }}>{r.codigoPrestador}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.cnpjCpf}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--hap-text2)' }}>{r.crmCnes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(hasPrev || hasNext) && (
        <div className="pagination">
          <button className="page-btn" onClick={goPrev} disabled={!hasPrev}>‹</button>
          <span>Página {pageNumber}</span>
          <button className="page-btn" onClick={goNext} disabled={!hasNext}>›</button>
        </div>
      )}
    </div>
  )
}
