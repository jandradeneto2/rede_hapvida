import { useState } from 'react'

export default function FiltroRede() {
  const [form, setForm] = useState({ rede: '', plano: '', produto: '', beneficiario: '' })
  const [status, setStatus] = useState('Aguardando busca')

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleFilter() {
    const hasAny = Object.values(form).some(Boolean)
    setStatus(hasAny ? 'Funcionalidade em desenvolvimento' : 'Preencha ao menos um campo')
  }

  function handleClear() {
    setForm({ rede: '', plano: '', produto: '', beneficiario: '' })
    setStatus('Aguardando busca')
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 24px', overflowY: 'auto', background: 'var(--hap-bg)' }}>
      <div style={{ background: 'var(--hap-card)', borderRadius: 'var(--hap-radius)', padding: '36px 40px', boxShadow: 'var(--hap-shadow)', border: '1px solid var(--hap-border)', width: '100%', maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, paddingBottom: 20, borderBottom: '2px solid var(--hap-border)' }}>
          <div style={{ width: 44, height: 44, background: 'var(--hap-blue-light)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            🔗
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--hap-blue)' }}>Filtro de Rede</div>
            <div style={{ fontSize: 12, color: 'var(--hap-text2)', marginTop: 2, fontWeight: 500 }}>
              Consulta de cobertura por rede, plano e produto
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 28 }}>
          {[
            { id: 'rede', label: 'Rede ANS', placeholder: 'Ex: SP208' },
            { id: 'plano', label: 'Plano', placeholder: 'Código ou nome do plano' },
            { id: 'produto', label: 'Produto', placeholder: 'Ex: HAPVIDA PLUS' },
            { id: 'beneficiario', label: 'Beneficiário', placeholder: 'Matrícula ou CPF' },
          ].map((f) => (
            <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--hap-blue)', textTransform: 'uppercase', letterSpacing: '.7px' }}>
                {f.label}
              </label>
              <input
                style={{ background: '#fff', border: '1.5px solid var(--hap-border)', color: 'var(--hap-text)', padding: '10px 14px', borderRadius: 'var(--hap-radius-sm)', fontSize: 13, fontFamily: "'Nunito',sans-serif", fontWeight: 600, width: '100%', transition: 'border-color .2s, box-shadow .2s', outline: 'none' }}
                placeholder={f.placeholder}
                value={form[f.id as keyof typeof form]}
                onChange={(e) => handleChange(f.id, e.target.value)}
                onFocus={(e) => { e.target.style.borderColor = 'var(--hap-blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(21,57,170,0.10)' }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--hap-border)'; e.target.style.boxShadow = 'none' }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 20, borderTop: '1px solid var(--hap-border)' }}>
          <button
            className="btn-primary"
            style={{ padding: '11px 32px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={handleFilter}
          >
            🔍 Consultar Rede
          </button>
          <button
            style={{ background: 'none', border: '1.5px solid var(--hap-border)', color: 'var(--hap-text2)', padding: '11px 20px', borderRadius: 'var(--hap-radius-sm)', cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 700, transition: 'all .2s' }}
            onClick={handleClear}
          >
            Limpar
          </button>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--hap-text2)', fontWeight: 600, padding: '8px 14px', background: 'var(--hap-bg)', borderRadius: 'var(--hap-radius-sm)', border: '1px solid var(--hap-border)' }}>
            {status}
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--hap-text2)', marginTop: 16, fontWeight: 500, lineHeight: 1.6, padding: '12px 14px', background: 'var(--hap-bg)', borderRadius: 'var(--hap-radius-sm)', borderLeft: '3px solid var(--hap-blue)' }}>
          Esta funcionalidade está em desenvolvimento. Futuramente permitirá verificar se um prestador
          específico está na rede de cobertura de um plano ou beneficiário.
        </div>
      </div>
    </div>
  )
}
