import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TIPO_LABEL = { ferias: '🏖️ Férias', licenca_medica: '🏥 Licença Médica', licenca_maternidade: '👶 Maternidade', licenca_paternidade: '👨‍👦 Paternidade', outro: '📋 Outro' };
const STATUS_COLOR = { pendente: '#d97706', aprovado: '#16a34a', rejeitado: '#dc2626' };

const s = {
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  btnPrim: { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  table:   { width: '100%', background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderCollapse: 'collapse', overflow: 'hidden' },
  th:      { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  td:      { padding: '12px 16px', fontSize: 14, color: '#374151', borderBottom: '1px solid #f3f4f6' },
  badge:   { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  btnAprv: { background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, marginRight: 6 },
  btnRej:  { background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  empty:   { textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 14 },
};

async function getToken() {
  const { supabase } = await import('../../../supabaseClient');
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

export default function TabFerias() {
  const [ferias, setFerias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('pendente');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [funcionarios, setFuncionarios] = useState([]);
  const [form, setForm] = useState({ funcionario_id: '', tipo: 'ferias', data_inicio: '', data_fim: '', observacoes: '' });

  async function fetchFerias() {
    setLoading(true);
    const token = await getToken();
    const params = filtroStatus ? `?status=${filtroStatus}` : '';
    const res = await fetch(`${API}/api/rh/ferias${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setFerias(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function fetchFuncionarios() {
    const token = await getToken();
    const res = await fetch(`${API}/api/rh/funcionarios?status=ativo`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setFuncionarios(Array.isArray(data) ? data : []);
  }

  useEffect(() => { fetchFerias(); }, [filtroStatus]);
  useEffect(() => { fetchFuncionarios(); }, []);

  async function handleSalvar(e) {
    e.preventDefault();
    const token = await getToken();
    const res = await fetch(`${API}/api/rh/ferias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) { setMostrarForm(false); fetchFerias(); }
    else { const d = await res.json(); alert(d.error); }
  }

  async function handleAprovar(id, status) {
    const token = await getToken();
    await fetch(`${API}/api/rh/ferias/${id}/aprovar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    fetchFerias();
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div style={s.toolbar}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['pendente', 'aprovado', 'rejeitado', ''].map((st) => (
            <button
              key={st || 'todos'}
              onClick={() => setFiltroStatus(st)}
              style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: filtroStatus === st ? '#7c3aed' : '#fff',
                color: filtroStatus === st ? '#fff' : '#6b7280',
                borderColor: filtroStatus === st ? '#7c3aed' : '#e5e7eb' }}
            >
              {st || 'Todos'}
            </button>
          ))}
        </div>
        <button style={s.btnPrim} onClick={() => setMostrarForm(!mostrarForm)}>
          {mostrarForm ? 'Cancelar' : '+ Solicitar'}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSalvar} style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Funcionário *</label>
              <select required value={form.funcionario_id} onChange={set('funcionario_id')} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}>
                <option value="">Selecione...</option>
                {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome} — {f.cargo}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5, marginTop: 12 }}>Tipo</label>
              <select value={form.tipo} onChange={set('tipo')} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}>
                {Object.entries(TIPO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {[['data_inicio','Início *',true],['data_fim','Fim *',true]].map(([k,l,r]) => (
              <div key={k}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5, marginTop: 12 }}>{l}</label>
                <input type="date" required={r} value={form[k]} onChange={set(k)} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="submit" style={s.btnPrim}>Registrar Solicitação</button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={s.empty}>Carregando...</div>
      ) : ferias.length === 0 ? (
        <div style={s.empty}>Nenhum registro encontrado.</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>{['Funcionário', 'Tipo', 'Início', 'Fim', 'Dias', 'Status', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {ferias.map((f) => {
              const dias = Math.ceil((new Date(f.data_fim) - new Date(f.data_inicio)) / 86400000);
              return (
                <tr key={f.id}>
                  <td style={s.td}><div style={{ fontWeight: 600 }}>{f.rh_funcionarios?.nome}</div><div style={{ fontSize: 12, color: '#9ca3af' }}>{f.rh_funcionarios?.cargo}</div></td>
                  <td style={s.td}>{TIPO_LABEL[f.tipo] ?? f.tipo}</td>
                  <td style={s.td}>{new Date(f.data_inicio).toLocaleDateString('pt-BR')}</td>
                  <td style={s.td}>{new Date(f.data_fim).toLocaleDateString('pt-BR')}</td>
                  <td style={s.td}>{dias}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, color: STATUS_COLOR[f.status], background: STATUS_COLOR[f.status] + '18' }}>
                      {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                    </span>
                  </td>
                  <td style={s.td}>
                    {f.status === 'pendente' && (
                      <>
                        <button style={s.btnAprv} onClick={() => handleAprovar(f.id, 'aprovado')}>Aprovar</button>
                        <button style={s.btnRej}  onClick={() => handleAprovar(f.id, 'rejeitado')}>Rejeitar</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
