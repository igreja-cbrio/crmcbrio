import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import ModalFuncionario from './ModalFuncionario';
import TabTreinamentos from './TabTreinamentos';
import TabFerias from './TabFerias';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const STATUS_LABEL = { ativo: 'Ativo', inativo: 'Inativo', ferias: 'Férias', licenca: 'Licença' };
const STATUS_COLOR = { ativo: '#16a34a', inativo: '#6b7280', ferias: '#2563eb', licenca: '#d97706' };
const CONTRATO_LABEL = { clt: 'CLT', pj: 'PJ', voluntario: 'Voluntário', estagiario: 'Estagiário' };

const s = {
  page:        { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title:       { fontSize: 26, fontWeight: 700, color: '#1a1a2e', margin: 0 },
  btnPrimary:  { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  kpis:        { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 },
  kpiCard:     { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  kpiValue:    { fontSize: 32, fontWeight: 700, color: '#1a1a2e', lineHeight: 1 },
  kpiLabel:    { fontSize: 13, color: '#6b7280', marginTop: 4 },
  tabs:        { display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e5e7eb' },
  tab:         { padding: '10px 20px', fontSize: 14, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280', borderBottom: '2px solid transparent', marginBottom: -2 },
  tabActive:   { color: '#7c3aed', borderBottom: '2px solid #7c3aed' },
  toolbar:     { display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' },
  search:      { flex: 1, padding: '9px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' },
  select:      { padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff' },
  table:       { width: '100%', background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderCollapse: 'separate', borderSpacing: 0, overflow: 'hidden' },
  th:          { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, background: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  td:          { padding: '12px 16px', fontSize: 14, color: '#374151', borderBottom: '1px solid #f3f4f6' },
  badge:       { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actionBtn:   { background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13, color: '#374151' },
  empty:       { textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 14 },
};

export default function RH() {
  const { user } = useAuth();
  const [tab, setTab] = useState('funcionarios');
  const [funcionarios, setFuncionarios] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [funcionarioEdit, setFuncionarioEdit] = useState(null);

  const token = async () => {
    const { data: { session } } = await import('../../../supabaseClient').then(m => m.supabase.auth.getSession());
    return session?.access_token;
  };

  const fetchFuncionarios = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroStatus) params.set('status', filtroStatus);
      if (filtroArea)   params.set('area', filtroArea);
      const { data: { session } } = await import('../../../supabaseClient').then(m => m.supabase.auth.getSession());
      const res = await fetch(`${API}/api/rh/funcionarios?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      setFuncionarios(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filtroStatus, filtroArea]);

  const fetchKpis = useCallback(async () => {
    try {
      const { data: { session } } = await import('../../../supabaseClient').then(m => m.supabase.auth.getSession());
      const res = await fetch(`${API}/api/rh/kpis`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      setKpis(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchFuncionarios();
    fetchKpis();
  }, [fetchFuncionarios, fetchKpis]);

  const filtrados = funcionarios.filter((f) =>
    f.nome.toLowerCase().includes(search.toLowerCase()) ||
    f.cargo?.toLowerCase().includes(search.toLowerCase()) ||
    f.email?.toLowerCase().includes(search.toLowerCase())
  );

  const areas = [...new Set(funcionarios.map((f) => f.area).filter(Boolean))];

  function handleEditar(f) { setFuncionarioEdit(f); setModalAberto(true); }
  function handleNovo()    { setFuncionarioEdit(null); setModalAberto(true); }

  async function handleSalvar(dados) {
    const { data: { session } } = await import('../../../supabaseClient').then(m => m.supabase.auth.getSession());
    const url = dados.id ? `${API}/api/rh/funcionarios/${dados.id}` : `${API}/api/rh/funcionarios`;
    const method = dados.id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(dados),
    });
    if (res.ok) { setModalAberto(false); fetchFuncionarios(); fetchKpis(); }
    else { const d = await res.json(); alert(d.error); }
  }

  async function handleDesativar(id) {
    if (!confirm('Desativar este funcionário?')) return;
    const { data: { session } } = await import('../../../supabaseClient').then(m => m.supabase.auth.getSession());
    await fetch(`${API}/api/rh/funcionarios/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    fetchFuncionarios(); fetchKpis();
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>👥 Recursos Humanos</h1>
        <button style={s.btnPrimary} onClick={handleNovo}>+ Admitir Funcionário</button>
      </div>

      {/* KPIs */}
      {kpis && (
        <div style={s.kpis}>
          <div style={s.kpiCard}>
            <div style={s.kpiValue}>{kpis.total_funcionarios}</div>
            <div style={s.kpiLabel}>Total de funcionários</div>
          </div>
          <div style={s.kpiCard}>
            <div style={{ ...s.kpiValue, color: '#16a34a' }}>{kpis.ativos}</div>
            <div style={s.kpiLabel}>Ativos</div>
          </div>
          <div style={s.kpiCard}>
            <div style={{ ...s.kpiValue, color: '#2563eb' }}>{kpis.em_ferias_licenca}</div>
            <div style={s.kpiLabel}>Em férias / licença</div>
          </div>
          <div style={s.kpiCard}>
            <div style={{ ...s.kpiValue, color: '#7c3aed' }}>{kpis.admissoes_mes?.length ?? 0}</div>
            <div style={s.kpiLabel}>Admissões este mês</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={s.tabs}>
        {['funcionarios', 'treinamentos', 'ferias'].map((t) => (
          <button
            key={t}
            style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
            onClick={() => setTab(t)}
          >
            {{ funcionarios: '👤 Funcionários', treinamentos: '📚 Treinamentos', ferias: '🏖️ Férias e Licenças' }[t]}
          </button>
        ))}
      </div>

      {/* Tab: Funcionários */}
      {tab === 'funcionarios' && (
        <>
          <div style={s.toolbar}>
            <input
              style={s.search}
              placeholder="Buscar por nome, cargo ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select style={s.select} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select style={s.select} value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}>
              <option value="">Todas as áreas</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {loading ? (
            <div style={s.empty}>Carregando...</div>
          ) : filtrados.length === 0 ? (
            <div style={s.empty}>Nenhum funcionário encontrado.</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  {['Nome', 'Cargo', 'Área', 'Contrato', 'Admissão', 'Status', ''].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((f) => (
                  <tr key={f.id}>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600 }}>{f.nome}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{f.email}</div>
                    </td>
                    <td style={s.td}>{f.cargo}</td>
                    <td style={s.td}>{f.area ?? '—'}</td>
                    <td style={s.td}>{CONTRATO_LABEL[f.tipo_contrato] ?? f.tipo_contrato}</td>
                    <td style={s.td}>{f.data_admissao ? new Date(f.data_admissao).toLocaleDateString('pt-BR') : '—'}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, color: STATUS_COLOR[f.status], background: STATUS_COLOR[f.status] + '18' }}>
                        {STATUS_LABEL[f.status] ?? f.status}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={s.actionBtn} onClick={() => handleEditar(f)}>Editar</button>
                        {f.status !== 'inativo' && (
                          <button style={{ ...s.actionBtn, color: '#dc2626', borderColor: '#fecaca' }} onClick={() => handleDesativar(f.id)}>Desativar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {tab === 'treinamentos' && <TabTreinamentos />}
      {tab === 'ferias' && <TabFerias />}

      {modalAberto && (
        <ModalFuncionario
          funcionario={funcionarioEdit}
          onSalvar={handleSalvar}
          onFechar={() => setModalAberto(false)}
        />
      )}
    </div>
  );
}
