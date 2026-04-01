import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { rh } from '../../../api';

// ── Tema ────────────────────────────────────────────────────
const C = {
  bg: '#f3f4f6', card: '#fff', primary: '#7c3aed', primaryBg: '#ede9fe',
  text: '#1a1a2e', text2: '#6b7280', text3: '#9ca3af',
  border: '#e5e7eb', green: '#10b981', greenBg: '#d1fae5',
  red: '#ef4444', redBg: '#fee2e2', amber: '#f59e0b', amberBg: '#fef3c7',
  blue: '#3b82f6', blueBg: '#dbeafe', sidebar: '#1a1a2e',
};

const STATUS_COLORS = {
  ativo: { c: C.green, bg: C.greenBg, label: 'Ativo' },
  inativo: { c: C.text3, bg: '#f3f4f6', label: 'Inativo' },
  ferias: { c: C.blue, bg: C.blueBg, label: 'Férias' },
  licenca: { c: C.amber, bg: C.amberBg, label: 'Licença' },
};

const TIPO_CONTRATO = {
  clt: 'CLT', pj: 'PJ', voluntario: 'Voluntário', estagiario: 'Estagiário',
};

const TIPO_FERIAS = {
  ferias: 'Férias', licenca_medica: 'Licença Médica',
  licenca_maternidade: 'Lic. Maternidade', licenca_paternidade: 'Lic. Paternidade', outro: 'Outro',
};

const FERIAS_STATUS = {
  pendente: { c: C.amber, bg: C.amberBg, label: 'Pendente' },
  aprovado: { c: C.green, bg: C.greenBg, label: 'Aprovado' },
  rejeitado: { c: C.red, bg: C.redBg, label: 'Rejeitado' },
};

// ── Estilos ─────────────────────────────────────────────────
const styles = {
  page: { maxWidth: 1200, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.text2, marginTop: 2 },
  tabs: { display: 'flex', gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 24 },
  tab: (active) => ({
    padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none',
    color: active ? C.primary : C.text2,
    borderBottom: active ? `2px solid ${C.primary}` : '2px solid transparent',
    marginBottom: -2, transition: 'all 0.15s',
  }),
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 },
  kpi: (color) => ({
    background: C.card, borderRadius: 12, padding: '16px 20px', border: `1px solid ${C.border}`,
    borderLeft: `4px solid ${color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }),
  kpiValue: { fontSize: 28, fontWeight: 800, color: C.text },
  kpiLabel: { fontSize: 11, fontWeight: 600, color: C.text2, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  card: {
    background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden',
  },
  cardHeader: { padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: 700, color: C.text },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left', borderBottom: `1px solid ${C.border}`, background: '#fafafa' },
  td: { padding: '12px 16px', fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}` },
  badge: (color, bg) => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    color, background: bg,
  }),
  btn: (variant = 'primary') => ({
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
    transition: 'all 0.15s',
    ...(variant === 'primary' ? { background: C.primary, color: '#fff' } : {}),
    ...(variant === 'secondary' ? { background: 'transparent', color: C.primary, border: `1px solid ${C.primary}` } : {}),
    ...(variant === 'danger' ? { background: C.red, color: '#fff' } : {}),
    ...(variant === 'ghost' ? { background: 'transparent', color: C.text2, padding: '6px 12px' } : {}),
  }),
  btnSm: { padding: '4px 10px', fontSize: 11 },
  filterRow: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  input: {
    padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13,
    outline: 'none', width: '100%', transition: 'border 0.15s', background: '#fff',
  },
  select: { padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, background: '#fff', outline: 'none' },
  label: { fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 },
  formGroup: { marginBottom: 14 },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 60, zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 16, width: '95%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalHeader: { padding: '20px 24px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: C.text },
  modalBody: { padding: '16px 24px 24px' },
  modalFooter: { padding: '12px 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' },
  empty: { textAlign: 'center', padding: 40, color: C.text3, fontSize: 14 },
  clickRow: { cursor: 'pointer', transition: 'background 0.1s' },
};

// ── Helpers ─────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
const fmtMoney = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

// ── Componentes auxiliares ──────────────────────────────────
function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={styles.modalTitle}>{title}</div>
          <button style={{ ...styles.btn('ghost'), fontSize: 18 }} onClick={onClose}>✕</button>
        </div>
        <div style={styles.modalBody}>{children}</div>
        {footer && <div style={styles.modalFooter}>{footer}</div>}
      </div>
>>>>>>> f36828f2e2b110c0171d22f93891eaab788abe56
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={styles.formGroup}>
      {label && <label style={styles.label}>{label}</label>}
      <input style={styles.input} {...props} />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div style={styles.formGroup}>
      {label && <label style={styles.label}>{label}</label>}
      <select style={{ ...styles.select, width: '100%' }} {...props}>{children}</select>
    </div>
  );
}

function Badge({ status, map }) {
  const s = map[status] || { c: C.text3, bg: '#f3f4f6', label: status };
  return <span style={styles.badge(s.c, s.bg)}>{s.label}</span>;
}

// ── TABS ────────────────────────────────────────────────────
const TABS = ['Dashboard', 'Funcionários', 'Treinamentos', 'Férias/Licenças'];

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
export default function RH() {
  const { isDiretor } = useAuth();
  const [tab, setTab] = useState(0);
  const [dash, setDash] = useState(null);
  const [funcs, setFuncs] = useState([]);
  const [treinos, setTreinos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtros funcionários
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [busca, setBusca] = useState('');

  // Modais
  const [modalFunc, setModalFunc] = useState(null); // null = fechado, {} = novo, {...} = editar
  const [modalTreino, setModalTreino] = useState(null);
  const [modalFerias, setModalFerias] = useState(null);
  const [modalDetail, setModalDetail] = useState(null);
  const [modalDoc, setModalDoc] = useState(null);

  // ── Loaders ──
  const loadDash = useCallback(async () => {
    try { setDash(await rh.dashboard()); } catch (e) { console.error(e); }
  }, []);

  const loadFuncs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroStatus) params.status = filtroStatus;
      if (filtroArea) params.area = filtroArea;
      if (busca) params.busca = busca;
      setFuncs(await rh.funcionarios.list(params));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filtroStatus, filtroArea, busca]);

  const loadTreinos = useCallback(async () => {
    try { setTreinos(await rh.treinamentos.list()); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadDash(); loadFuncs(); loadTreinos(); }, []);
  useEffect(() => { loadFuncs(); }, [filtroStatus, filtroArea, busca]);

  // ── Handlers ──
  async function saveFuncionario(data) {
    try {
      if (data.id) await rh.funcionarios.update(data.id, data);
      else await rh.funcionarios.create(data);
      setModalFunc(null);
      loadFuncs(); loadDash();
    } catch (e) { alert(e.message); }
  }

  async function deleteFuncionario(id) {
    if (!confirm('Remover este funcionário?')) return;
    try { await rh.funcionarios.remove(id); loadFuncs(); loadDash(); setModalDetail(null); }
    catch (e) { alert(e.message); }
  }

  async function openDetail(id) {
    try { setModalDetail(await rh.funcionarios.get(id)); } catch (e) { alert(e.message); }
  }

  async function saveTreinamento(data) {
    try {
      if (data.id) await rh.treinamentos.update(data.id, data);
      else await rh.treinamentos.create(data);
      setModalTreino(null); loadTreinos();
    } catch (e) { alert(e.message); }
  }

  async function deleteTreinamento(id) {
    if (!confirm('Remover treinamento?')) return;
    try { await rh.treinamentos.remove(id); loadTreinos(); } catch (e) { alert(e.message); }
  }

  async function saveFerias(data) {
    try {
      await rh.ferias.create(data.funcionario_id, data);
      setModalFerias(null); loadDash();
    } catch (e) { alert(e.message); }
  }

  async function aprovarFerias(id, status) {
    try { await rh.ferias.update(id, { status }); loadDash(); } catch (e) { alert(e.message); }
  }

  async function saveDocumento(funcId, data) {
    try {
      await rh.documentos.create(funcId, data);
      setModalDoc(null);
      openDetail(funcId);
    } catch (e) { alert(e.message); }
  }

  async function deleteDocumento(docId, funcId) {
    if (!confirm('Remover documento?')) return;
    try { await rh.documentos.remove(docId); openDetail(funcId); } catch (e) { alert(e.message); }
  }

  // ── Render ──
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.title}>👥 Recursos Humanos</div>
          <div style={styles.subtitle}>Gestão de funcionários, treinamentos e férias</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {TABS.map((t, i) => (
          <button key={t} style={styles.tab(tab === i)} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {error && <div style={{ color: C.red, marginBottom: 12, fontSize: 13 }}>{error}</div>}

      {/* Tab Content */}
      {tab === 0 && <DashboardTab dash={dash} />}
      {tab === 1 && (
        <FuncionariosTab
          funcs={funcs} loading={loading} busca={busca} setBusca={setBusca}
          filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus}
          filtroArea={filtroArea} setFiltroArea={setFiltroArea}
          onNew={() => setModalFunc({})} onEdit={(f) => setModalFunc(f)} onDetail={openDetail} onDelete={deleteFuncionario}
        />
      )}
      {tab === 2 && (
        <TreinamentosTab treinos={treinos} funcs={funcs}
          onNew={() => setModalTreino({})} onEdit={(t) => setModalTreino(t)} onDelete={deleteTreinamento}
          onInscrever={async (treinoId, funcId) => { await rh.treinamentos.inscrever(treinoId, { funcionario_id: funcId }); loadTreinos(); }}
        />
      )}
      {tab === 3 && (
        <FeriasTab dash={dash} funcs={funcs}
          onNew={() => setModalFerias({})} onAprovar={aprovarFerias}
        />
      )}

      {/* Modais */}
      <FuncionarioFormModal open={!!modalFunc} data={modalFunc} onClose={() => setModalFunc(null)} onSave={saveFuncionario} />
      <TreinamentoFormModal open={!!modalTreino} data={modalTreino} onClose={() => setModalTreino(null)} onSave={saveTreinamento} />
      <FeriasFormModal open={!!modalFerias} funcs={funcs} onClose={() => setModalFerias(null)} onSave={saveFerias} />
      <FuncionarioDetailModal
        open={!!modalDetail} data={modalDetail} onClose={() => setModalDetail(null)}
        onEdit={(f) => { setModalDetail(null); setModalFunc(f); }}
        onDelete={deleteFuncionario}
        onNewDoc={(funcId) => setModalDoc({ funcionario_id: funcId })}
        onDeleteDoc={deleteDocumento}
      />
      <DocumentoFormModal open={!!modalDoc} data={modalDoc} onClose={() => setModalDoc(null)} onSave={saveDocumento} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB: DASHBOARD
// ═══════════════════════════════════════════════════════════
function DashboardTab({ dash }) {
  if (!dash) return <div style={styles.empty}>Carregando dashboard...</div>;
  return (
    <>
      {/* KPIs */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpi(C.primary)}>
          <div style={styles.kpiValue}>{dash.total}</div>
          <div style={styles.kpiLabel}>Total Funcionários</div>
        </div>
        <div style={styles.kpi(C.green)}>
          <div style={styles.kpiValue}>{dash.ativos}</div>
          <div style={styles.kpiLabel}>Ativos</div>
        </div>
        <div style={styles.kpi(C.blue)}>
          <div style={styles.kpiValue}>{dash.ferias}</div>
          <div style={styles.kpiLabel}>Em Férias</div>
        </div>
        <div style={styles.kpi(C.amber)}>
          <div style={styles.kpiValue}>{dash.licenca}</div>
          <div style={styles.kpiLabel}>Em Licença</div>
        </div>
        <div style={styles.kpi(C.text3)}>
          <div style={styles.kpiValue}>{dash.inativos}</div>
          <div style={styles.kpiLabel}>Inativos</div>
        </div>
      </div>

      {/* Por tipo de contrato */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={styles.card}>
          <div style={styles.cardHeader}><div style={styles.cardTitle}>Por Tipo de Contrato</div></div>
          <div style={{ padding: 16 }}>
            {Object.entries(dash.porContrato || {}).map(([tipo, qtd]) => (
              <div key={tipo} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13, color: C.text }}>{TIPO_CONTRATO[tipo] || tipo}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{qtd}</span>
              </div>
            ))}
            {Object.keys(dash.porContrato || {}).length === 0 && <div style={styles.empty}>Nenhum dado</div>}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}><div style={styles.cardTitle}>Por Área</div></div>
          <div style={{ padding: 16 }}>
            {Object.entries(dash.porArea || {}).map(([area, qtd]) => (
              <div key={area} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13, color: C.text }}>{area}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{qtd}</span>
              </div>
            ))}
            {Object.keys(dash.porArea || {}).length === 0 && <div style={styles.empty}>Nenhum dado</div>}
          </div>
        </div>
      </div>

      {/* Alertas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={styles.card}>
          <div style={styles.cardHeader}><div style={styles.cardTitle}>📅 Férias Próximas (30 dias)</div></div>
          <div style={{ padding: 16 }}>
            {(dash.feriasProximas || []).length === 0 && <div style={styles.empty}>Nenhuma férias agendada</div>}
            {(dash.feriasProximas || []).map(f => (
              <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13 }}>{f.rh_funcionarios?.nome || '—'}</span>
                <span style={{ fontSize: 12, color: C.text2 }}>{fmtDate(f.data_inicio)} → {fmtDate(f.data_fim)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}><div style={styles.cardTitle}>📄 Documentos Vencendo (60 dias)</div></div>
          <div style={{ padding: 16 }}>
            {(dash.docsVencendo || []).length === 0 && <div style={styles.empty}>Nenhum documento vencendo</div>}
            {(dash.docsVencendo || []).map(d => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13 }}>{d.rh_funcionarios?.nome} — {d.nome}</span>
                <span style={{ fontSize: 12, color: C.red }}>{fmtDate(d.data_expiracao)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB: FUNCIONÁRIOS
// ═══════════════════════════════════════════════════════════
function FuncionariosTab({ funcs, loading, busca, setBusca, filtroStatus, setFiltroStatus, filtroArea, setFiltroArea, onNew, onDetail, onDelete }) {
  const areas = [...new Set(funcs.map(f => f.area).filter(Boolean))];

  return (
    <>
      <div style={styles.filterRow}>
        <input
          style={{ ...styles.input, maxWidth: 280 }}
          placeholder="🔍 Buscar por nome..." value={busca}
          onChange={e => setBusca(e.target.value)}
        />
        <select style={styles.select} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select style={styles.select} value={filtroArea} onChange={e => setFiltroArea(e.target.value)}>
          <option value="">Todas as áreas</option>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div style={{ marginLeft: 'auto' }}>
          <button style={styles.btn('primary')} onClick={onNew}>+ Novo Funcionário</button>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nome</th>
                <th style={styles.th}>Cargo</th>
                <th style={styles.th}>Área</th>
                <th style={styles.th}>Contrato</th>
                <th style={styles.th}>Admissão</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: C.text3 }}>Carregando...</td></tr>}
              {!loading && funcs.length === 0 && <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: C.text3 }}>Nenhum funcionário encontrado</td></tr>}
              {funcs.map(f => (
                <tr key={f.id} style={styles.clickRow}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                  onClick={() => onDetail(f.id)}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{f.nome}</td>
                  <td style={styles.td}>{f.cargo}</td>
                  <td style={styles.td}>{f.area || '—'}</td>
                  <td style={styles.td}>{TIPO_CONTRATO[f.tipo_contrato] || f.tipo_contrato}</td>
                  <td style={styles.td}>{fmtDate(f.data_admissao)}</td>
                  <td style={styles.td}><Badge status={f.status} map={STATUS_COLORS} /></td>
                  <td style={styles.td}>
                    <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={e => { e.stopPropagation(); onDelete(f.id); }}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB: TREINAMENTOS
// ═══════════════════════════════════════════════════════════
function TreinamentosTab({ treinos, funcs, onNew, onEdit, onDelete, onInscrever }) {
  const [inscrevendo, setInscrevendo] = useState(null);
  const [funcSel, setFuncSel] = useState('');

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button style={styles.btn('primary')} onClick={onNew}>+ Novo Treinamento</button>
      </div>

      {treinos.length === 0 && <div style={styles.empty}>Nenhum treinamento cadastrado</div>}

      <div style={{ display: 'grid', gap: 16 }}>
        {treinos.map(t => (
          <div key={t.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <div style={styles.cardTitle}>{t.titulo}</div>
                <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                  {fmtDate(t.data_inicio)}{t.data_fim ? ` → ${fmtDate(t.data_fim)}` : ''}
                  {t.instrutor && ` • ${t.instrutor}`}
                  {t.obrigatorio && <span style={{ ...styles.badge(C.red, C.redBg), marginLeft: 8 }}>Obrigatório</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{ ...styles.btn('secondary'), ...styles.btnSm }} onClick={() => onEdit(t)}>✏️</button>
                <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => onDelete(t.id)}>🗑</button>
              </div>
            </div>
            {t.descricao && <div style={{ padding: '8px 20px', fontSize: 13, color: C.text2 }}>{t.descricao}</div>}

            {/* Inscritos */}
            <div style={{ padding: '8px 20px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 6, textTransform: 'uppercase' }}>
                Inscritos ({(t.rh_treinamentos_funcionarios || []).length})
              </div>
              {(t.rh_treinamentos_funcionarios || []).map(tf => (
                <div key={tf.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13 }}>{tf.rh_funcionarios?.nome || '—'}</span>
                  <Badge status={tf.status} map={{
                    inscrito: { c: C.blue, bg: C.blueBg, label: 'Inscrito' },
                    concluido: { c: C.green, bg: C.greenBg, label: 'Concluído' },
                    cancelado: { c: C.red, bg: C.redBg, label: 'Cancelado' },
                  }} />
                </div>
              ))}
              {/* Inscrever funcionário */}
              {inscrevendo === t.id ? (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                  <select style={{ ...styles.select, flex: 1 }} value={funcSel} onChange={e => setFuncSel(e.target.value)}>
                    <option value="">Selecionar funcionário</option>
                    {funcs.filter(f => f.status === 'ativo').map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                  <button style={{ ...styles.btn('primary'), ...styles.btnSm }}
                    onClick={async () => { if (funcSel) { await onInscrever(t.id, funcSel); setInscrevendo(null); setFuncSel(''); } }}>
                    OK
                  </button>
                  <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => setInscrevendo(null)}>✕</button>
                </div>
              ) : (
                <button style={{ ...styles.btn('ghost'), marginTop: 6, fontSize: 12 }} onClick={() => setInscrevendo(t.id)}>+ Inscrever funcionário</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB: FÉRIAS/LICENÇAS
// ═══════════════════════════════════════════════════════════
function FeriasTab({ dash, funcs, onNew, onAprovar }) {
  const ferias = dash?.feriasProximas || [];
  // Mostrar todas as férias (precisaria de endpoint separado, por ora usa dashboard)
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button style={styles.btn('primary')} onClick={onNew}>+ Nova Solicitação</button>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}><div style={styles.cardTitle}>Férias e Licenças</div></div>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Funcionário</th>
                <th style={styles.th}>Tipo</th>
                <th style={styles.th}>Início</th>
                <th style={styles.th}>Fim</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {ferias.length === 0 && <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: C.text3 }}>Nenhuma solicitação</td></tr>}
              {ferias.map(f => (
                <tr key={f.id}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{f.rh_funcionarios?.nome || '—'}</td>
                  <td style={styles.td}>{TIPO_FERIAS[f.tipo] || f.tipo}</td>
                  <td style={styles.td}>{fmtDate(f.data_inicio)}</td>
                  <td style={styles.td}>{fmtDate(f.data_fim)}</td>
                  <td style={styles.td}><Badge status={f.status} map={FERIAS_STATUS} /></td>
                  <td style={styles.td}>
                    {f.status === 'pendente' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button style={{ ...styles.btn('primary'), ...styles.btnSm }} onClick={() => onAprovar(f.id, 'aprovado')}>✓</button>
                        <button style={{ ...styles.btn('danger'), ...styles.btnSm }} onClick={() => onAprovar(f.id, 'rejeitado')}>✕</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// MODAIS
// ═══════════════════════════════════════════════════════════

function FuncionarioFormModal({ open, data, onClose, onSave }) {
  const [f, setF] = useState({});
  useEffect(() => { if (data) setF({ ...data }); }, [data]);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <Modal open={open} onClose={onClose}
      title={f?.id ? '✏️ Editar Funcionário' : '➕ Novo Funcionário'}
      footer={<button style={styles.btn('primary')} onClick={() => onSave(f)}>Salvar</button>}>
      <Input label="Nome *" value={f.nome || ''} onChange={e => upd('nome', e.target.value)} />
      <div style={styles.formRow}>
        <Input label="CPF" value={f.cpf || ''} onChange={e => upd('cpf', e.target.value)} />
        <Input label="Email" type="email" value={f.email || ''} onChange={e => upd('email', e.target.value)} />
      </div>
      <div style={styles.formRow}>
        <Input label="Telefone" value={f.telefone || ''} onChange={e => upd('telefone', e.target.value)} />
        <Input label="Cargo *" value={f.cargo || ''} onChange={e => upd('cargo', e.target.value)} />
      </div>
      <div style={styles.formRow}>
        <Input label="Área" value={f.area || ''} onChange={e => upd('area', e.target.value)} />
        <Select label="Tipo de Contrato" value={f.tipo_contrato || 'clt'} onChange={e => upd('tipo_contrato', e.target.value)}>
          {Object.entries(TIPO_CONTRATO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>
      <div style={styles.formRow}>
        <Input label="Data Admissão *" type="date" value={f.data_admissao || ''} onChange={e => upd('data_admissao', e.target.value)} />
        <Input label="Salário (R$)" type="number" value={f.salario || ''} onChange={e => upd('salario', e.target.value)} />
      </div>
      {f.id && (
        <div style={styles.formRow}>
          <Select label="Status" value={f.status || 'ativo'} onChange={e => upd('status', e.target.value)}>
            {Object.entries(STATUS_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <Input label="Data Demissão" type="date" value={f.data_demissao || ''} onChange={e => upd('data_demissao', e.target.value)} />
        </div>
      )}
      <div style={styles.formGroup}>
        <label style={styles.label}>Observações</label>
        <textarea style={{ ...styles.input, minHeight: 60, resize: 'vertical' }} value={f.observacoes || ''} onChange={e => upd('observacoes', e.target.value)} />
      </div>
    </Modal>
  );
}

function TreinamentoFormModal({ open, data, onClose, onSave }) {
  const [f, setF] = useState({});
  useEffect(() => { if (data) setF({ ...data }); }, [data]);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <Modal open={open} onClose={onClose}
      title={f?.id ? '✏️ Editar Treinamento' : '➕ Novo Treinamento'}
      footer={<button style={styles.btn('primary')} onClick={() => onSave(f)}>Salvar</button>}>
      <Input label="Título *" value={f.titulo || ''} onChange={e => upd('titulo', e.target.value)} />
      <div style={styles.formRow}>
        <Input label="Data Início *" type="date" value={f.data_inicio || ''} onChange={e => upd('data_inicio', e.target.value)} />
        <Input label="Data Fim" type="date" value={f.data_fim || ''} onChange={e => upd('data_fim', e.target.value)} />
      </div>
      <Input label="Instrutor" value={f.instrutor || ''} onChange={e => upd('instrutor', e.target.value)} />
      <div style={styles.formGroup}>
        <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={f.obrigatorio || false} onChange={e => upd('obrigatorio', e.target.checked)} />
          Obrigatório
        </label>
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Descrição</label>
        <textarea style={{ ...styles.input, minHeight: 60, resize: 'vertical' }} value={f.descricao || ''} onChange={e => upd('descricao', e.target.value)} />
      </div>
    </Modal>
  );
}

function FeriasFormModal({ open, funcs, onClose, onSave }) {
  const [f, setF] = useState({ tipo: 'ferias' });
  useEffect(() => { if (open) setF({ tipo: 'ferias' }); }, [open]);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <Modal open={open} onClose={onClose} title="➕ Nova Solicitação de Férias/Licença"
      footer={<button style={styles.btn('primary')} onClick={() => onSave(f)}>Solicitar</button>}>
      <Select label="Funcionário *" value={f.funcionario_id || ''} onChange={e => upd('funcionario_id', e.target.value)}>
        <option value="">Selecionar</option>
        {(funcs || []).filter(fn => fn.status === 'ativo').map(fn => <option key={fn.id} value={fn.id}>{fn.nome}</option>)}
      </Select>
      <Select label="Tipo *" value={f.tipo} onChange={e => upd('tipo', e.target.value)}>
        {Object.entries(TIPO_FERIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </Select>
      <div style={styles.formRow}>
        <Input label="Data Início *" type="date" value={f.data_inicio || ''} onChange={e => upd('data_inicio', e.target.value)} />
        <Input label="Data Fim *" type="date" value={f.data_fim || ''} onChange={e => upd('data_fim', e.target.value)} />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Observações</label>
        <textarea style={{ ...styles.input, minHeight: 60, resize: 'vertical' }} value={f.observacoes || ''} onChange={e => upd('observacoes', e.target.value)} />
      </div>
    </Modal>
  );
}

function FuncionarioDetailModal({ open, data, onClose, onEdit, onDelete, onNewDoc, onDeleteDoc }) {
  if (!data) return null;
  return (
    <Modal open={open} onClose={onClose} title={`👤 ${data.nome}`}>
      {/* Info principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 20 }}>
        <div><span style={{ fontSize: 11, color: C.text2 }}>Cargo:</span><div style={{ fontSize: 14, fontWeight: 600 }}>{data.cargo}</div></div>
        <div><span style={{ fontSize: 11, color: C.text2 }}>Área:</span><div style={{ fontSize: 14 }}>{data.area || '—'}</div></div>
        <div><span style={{ fontSize: 11, color: C.text2 }}>CPF:</span><div style={{ fontSize: 14 }}>{data.cpf || '—'}</div></div>
        <div><span style={{ fontSize: 11, color: C.text2 }}>Email:</span><div style={{ fontSize: 14 }}>{data.email || '—'}</div></div>
        <div><span style={{ fontSize: 11, color: C.text2 }}>Telefone:</span><div style={{ fontSize: 14 }}>{data.telefone || '—'}</div></div>
        <div><span style={{ fontSize: 11, color: C.text2 }}>Contrato:</span><div style={{ fontSize: 14 }}>{TIPO_CONTRATO[data.tipo_contrato]}</div></div>
        <div><span style={{ fontSize: 11, color: C.text2 }}>Admissão:</span><div style={{ fontSize: 14 }}>{fmtDate(data.data_admissao)}</div></div>
        <div><span style={{ fontSize: 11, color: C.text2 }}>Salário:</span><div style={{ fontSize: 14 }}>{fmtMoney(data.salario)}</div></div>
        <div><span style={{ fontSize: 11, color: C.text2 }}>Status:</span><div><Badge status={data.status} map={STATUS_COLORS} /></div></div>
      </div>

      {data.observacoes && (
        <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: 8, marginBottom: 16, fontSize: 13, color: C.text2 }}>{data.observacoes}</div>
      )}

      {/* Documentos */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.text2, textTransform: 'uppercase' }}>📄 Documentos ({(data.documentos || []).length})</span>
          <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => onNewDoc(data.id)}>+ Adicionar</button>
        </div>
        {(data.documentos || []).map(d => (
          <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13 }}>{d.nome} <span style={{ color: C.text3, fontSize: 11 }}>({d.tipo})</span></span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {d.data_expiracao && <span style={{ fontSize: 11, color: C.text3 }}>exp: {fmtDate(d.data_expiracao)}</span>}
              <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => onDeleteDoc(d.id, data.id)}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      {/* Treinamentos */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.text2, textTransform: 'uppercase' }}>📚 Treinamentos ({(data.treinamentos || []).length})</span>
        {(data.treinamentos || []).map(t => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13 }}>{t.rh_treinamentos?.titulo || '—'}</span>
            <Badge status={t.status} map={{
              inscrito: { c: C.blue, bg: C.blueBg, label: 'Inscrito' },
              concluido: { c: C.green, bg: C.greenBg, label: 'Concluído' },
              cancelado: { c: C.red, bg: C.redBg, label: 'Cancelado' },
            }} />
          </div>
        ))}
      </div>

      {/* Férias */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.text2, textTransform: 'uppercase' }}>🏖️ Férias/Licenças ({(data.ferias_licencas || []).length})</span>
        {(data.ferias_licencas || []).map(f => (
          <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13 }}>{TIPO_FERIAS[f.tipo]} • {fmtDate(f.data_inicio)} → {fmtDate(f.data_fim)}</span>
            <Badge status={f.status} map={FERIAS_STATUS} />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <button style={styles.btn('secondary')} onClick={() => onEdit(data)}>✏️ Editar</button>
        <button style={styles.btn('danger')} onClick={() => onDelete(data.id)}>🗑 Remover</button>
      </div>
    </Modal>
  );
}

function DocumentoFormModal({ open, data, onClose, onSave }) {
  const [f, setF] = useState({ tipo: 'contrato' });
  useEffect(() => { if (open) setF({ tipo: 'contrato' }); }, [open]);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <Modal open={open} onClose={onClose} title="📄 Novo Documento"
      footer={<button style={styles.btn('primary')} onClick={() => onSave(data?.funcionario_id, f)}>Salvar</button>}>
      <Input label="Nome do Documento *" value={f.nome || ''} onChange={e => upd('nome', e.target.value)} />
      <Select label="Tipo" value={f.tipo} onChange={e => upd('tipo', e.target.value)}>
        <option value="contrato">Contrato</option>
        <option value="ctps">CTPS</option>
        <option value="rg">RG</option>
        <option value="cpf">CPF</option>
        <option value="certificado">Certificado</option>
        <option value="outro">Outro</option>
      </Select>
      <Input label="Data de Expiração" type="date" value={f.data_expiracao || ''} onChange={e => upd('data_expiracao', e.target.value)} />
    </Modal>
  );
}
