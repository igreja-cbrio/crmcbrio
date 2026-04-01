import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { logistica } from '../../../api';

// ── Tema ────────────────────────────────────────────────────
const C = {
  bg: '#f3f4f6', card: '#fff', primary: '#7c3aed', primaryBg: '#ede9fe',
  text: '#1a1a2e', text2: '#6b7280', text3: '#9ca3af',
  border: '#e5e7eb', green: '#10b981', greenBg: '#d1fae5',
  red: '#ef4444', redBg: '#fee2e2', amber: '#f59e0b', amberBg: '#fef3c7',
  blue: '#3b82f6', blueBg: '#dbeafe',
};

const URGENCIA_COLORS = {
  urgente: { c: C.red, bg: C.redBg, label: 'Urgente' },
  alta: { c: C.amber, bg: C.amberBg, label: 'Alta' },
  normal: { c: C.blue, bg: C.blueBg, label: 'Normal' },
  baixa: { c: C.text3, bg: '#f3f4f6', label: 'Baixa' },
};

const SOLICITACAO_STATUS = {
  pendente: { c: C.amber, bg: C.amberBg, label: 'Pendente' },
  aprovado: { c: C.green, bg: C.greenBg, label: 'Aprovado' },
  rejeitado: { c: C.red, bg: C.redBg, label: 'Rejeitado' },
  em_cotacao: { c: C.blue, bg: C.blueBg, label: 'Em Cotacao' },
  pedido_gerado: { c: C.primary, bg: C.primaryBg, label: 'Pedido Gerado' },
};

const PEDIDO_STATUS = {
  aguardando: { c: C.amber, bg: C.amberBg, label: 'Aguardando' },
  em_transito: { c: C.blue, bg: C.blueBg, label: 'Em Transito' },
  recebido: { c: C.green, bg: C.greenBg, label: 'Recebido' },
  cancelado: { c: C.red, bg: C.redBg, label: 'Cancelado' },
};

const CATEGORIAS = ['Escritorio', 'Tecnologia', 'Limpeza', 'Alimentacao', 'Construcao', 'Servicos', 'Outros'];

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
    ...(variant === 'success' ? { background: C.green, color: '#fff' } : {}),
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
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
const fmtMoney = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-';

// ── Componentes auxiliares ──────────────────────────────────
function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={styles.modalTitle}>{title}</div>
          <button style={{ ...styles.btn('ghost'), fontSize: 18 }} onClick={onClose}>&#x2715;</button>
        </div>
        <div style={styles.modalBody}>{children}</div>
        {footer && <div style={styles.modalFooter}>{footer}</div>}
      </div>
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

function Textarea({ label, ...props }) {
  return (
    <div style={styles.formGroup}>
      {label && <label style={styles.label}>{label}</label>}
      <textarea style={{ ...styles.input, minHeight: 70, resize: 'vertical' }} {...props} />
    </div>
  );
}

function Badge({ status, map }) {
  const s = map[status] || { c: C.text3, bg: '#f3f4f6', label: status || '-' };
  return <span style={styles.badge(s.c, s.bg)}>{s.label}</span>;
}

// ── TABS ────────────────────────────────────────────────────
const TABS = ['Dashboard', 'Fornecedores', 'Solicitacoes', 'Pedidos'];

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
export default function Logistica() {
  const { isDiretor } = useAuth();
  const [tab, setTab] = useState(0);
  const [dash, setDash] = useState(null);
  const [fornecedores, setFornecedores] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtros
  const [filtroFornAtivo, setFiltroFornAtivo] = useState('');
  const [filtroSolStatus, setFiltroSolStatus] = useState('');
  const [filtroPedStatus, setFiltroPedStatus] = useState('');

  // Modals
  const [modalForn, setModalForn] = useState(null); // null=closed, {}=new, {id,...}=edit
  const [modalSol, setModalSol] = useState(null);
  const [modalPed, setModalPed] = useState(null);
  const [modalReceber, setModalReceber] = useState(null);
  const [saving, setSaving] = useState(false);

  // ── Fetch functions ──────────────────────────────────────
  const fetchDash = useCallback(async () => {
    try {
      const data = await logistica.dashboard();
      setDash(data);
    } catch (e) { console.error('[LOGISTICA] dashboard', e); }
  }, []);

  const fetchFornecedores = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtroFornAtivo !== '') params.ativo = filtroFornAtivo;
      const data = await logistica.fornecedores.list(Object.keys(params).length ? params : undefined);
      setFornecedores(data || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [filtroFornAtivo]);

  const fetchSolicitacoes = useCallback(async () => {
    setLoading(true);
    try {
      const params = filtroSolStatus ? { status: filtroSolStatus } : undefined;
      const data = await logistica.solicitacoes.list(params);
      setSolicitacoes(data || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [filtroSolStatus]);

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const params = filtroPedStatus ? { status: filtroPedStatus } : undefined;
      const data = await logistica.pedidos.list(params);
      setPedidos(data || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [filtroPedStatus]);

  useEffect(() => {
    if (tab === 0) fetchDash();
    if (tab === 1) fetchFornecedores();
    if (tab === 2) fetchSolicitacoes();
    if (tab === 3) fetchPedidos();
  }, [tab, fetchDash, fetchFornecedores, fetchSolicitacoes, fetchPedidos]);

  // ── Fornecedor CRUD ──────────────────────────────────────
  const saveFornecedor = async () => {
    setSaving(true);
    try {
      const { id, ...rest } = modalForn;
      if (id) {
        await logistica.fornecedores.update(id, rest);
      } else {
        await logistica.fornecedores.create(rest);
      }
      setModalForn(null);
      fetchFornecedores();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const deleteFornecedor = async (id) => {
    if (!window.confirm('Excluir este fornecedor?')) return;
    try {
      await logistica.fornecedores.remove(id);
      fetchFornecedores();
    } catch (e) { setError(e.message); }
  };

  const toggleFornecedorAtivo = async (forn) => {
    try {
      await logistica.fornecedores.update(forn.id, { ativo: !forn.ativo });
      fetchFornecedores();
    } catch (e) { setError(e.message); }
  };

  // ── Solicitacao actions ──────────────────────────────────
  const saveSolicitacao = async () => {
    setSaving(true);
    try {
      const { id, profiles, ...rest } = modalSol;
      if (id) {
        await logistica.solicitacoes.atualizar(id, rest);
      } else {
        await logistica.solicitacoes.create(rest);
      }
      setModalSol(null);
      fetchSolicitacoes();
      fetchDash();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const atualizarStatusSolicitacao = async (id, status) => {
    try {
      await logistica.solicitacoes.atualizar(id, { status });
      fetchSolicitacoes();
      fetchDash();
    } catch (e) { setError(e.message); }
  };

  // ── Pedido CRUD ──────────────────────────────────────────
  const savePedido = async () => {
    setSaving(true);
    try {
      const { id, log_fornecedores, ...rest } = modalPed;
      if (id) {
        await logistica.pedidos.update(id, rest);
      } else {
        await logistica.pedidos.create(rest);
      }
      setModalPed(null);
      fetchPedidos();
      fetchDash();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const deletePedido = async (id) => {
    if (!window.confirm('Excluir este pedido?')) return;
    try {
      await logistica.pedidos.remove(id);
      fetchPedidos();
      fetchDash();
    } catch (e) { setError(e.message); }
  };

  const receberPedido = async () => {
    setSaving(true);
    try {
      await logistica.pedidos.receber(modalReceber.id, modalReceber);
      setModalReceber(null);
      fetchPedidos();
      fetchDash();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  // ── Field updater helper ─────────────────────────────────
  const upForn = (k, v) => setModalForn(prev => ({ ...prev, [k]: v }));
  const upSol = (k, v) => setModalSol(prev => ({ ...prev, [k]: v }));
  const upPed = (k, v) => setModalPed(prev => ({ ...prev, [k]: v }));
  const upRec = (k, v) => setModalReceber(prev => ({ ...prev, [k]: v }));

  // ── Render ───────────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Logistica</div>
          <div style={styles.subtitle}>Fornecedores, solicitacoes de compra e pedidos</div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background: C.redBg, color: C.red, padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button style={styles.btn('ghost')} onClick={() => setError('')}>&#x2715;</button>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        {TABS.map((t, i) => (
          <button key={t} style={styles.tab(tab === i)} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && <DashboardTab dash={dash} />}
      {tab === 1 && (
        <FornecedoresTab
          data={fornecedores} loading={loading} isDiretor={isDiretor}
          filtroAtivo={filtroFornAtivo} setFiltroAtivo={setFiltroFornAtivo}
          onNew={() => setModalForn({ razao_social: '', nome_fantasia: '', cnpj: '', email: '', telefone: '', contato: '', categoria: '', ativo: true, observacoes: '' })}
          onEdit={(f) => setModalForn({ ...f })}
          onDelete={deleteFornecedor}
          onToggle={toggleFornecedorAtivo}
        />
      )}
      {tab === 2 && (
        <SolicitacoesTab
          data={solicitacoes} loading={loading} isDiretor={isDiretor}
          filtroStatus={filtroSolStatus} setFiltroStatus={setFiltroSolStatus}
          onNew={() => setModalSol({ titulo: '', descricao: '', justificativa: '', valor_estimado: '', urgencia: 'normal', area: '' })}
          onAprovar={(id) => atualizarStatusSolicitacao(id, 'aprovado')}
          onRejeitar={(id) => atualizarStatusSolicitacao(id, 'rejeitado')}
        />
      )}
      {tab === 3 && (
        <PedidosTab
          data={pedidos} loading={loading} isDiretor={isDiretor}
          filtroStatus={filtroPedStatus} setFiltroStatus={setFiltroPedStatus}
          onNew={() => setModalPed({ solicitacao_id: '', fornecedor_id: '', descricao: '', valor_total: '', data_prevista: '', status: 'aguardando', codigo_rastreio: '', transportadora: '' })}
          onEdit={(p) => setModalPed({ ...p })}
          onDelete={deletePedido}
          onReceber={(p) => setModalReceber({ id: p.id, observacoes: '' })}
          fornecedores={fornecedores}
          solicitacoes={solicitacoes}
        />
      )}

      {/* ── Modal Fornecedor ────────────────────────────────── */}
      <Modal
        open={modalForn !== null}
        onClose={() => setModalForn(null)}
        title={modalForn?.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}
        footer={
          <>
            <button style={styles.btn('secondary')} onClick={() => setModalForn(null)}>Cancelar</button>
            <button style={styles.btn('primary')} onClick={saveFornecedor} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        {modalForn && (
          <>
            <Input label="Razao Social *" value={modalForn.razao_social || ''} onChange={e => upForn('razao_social', e.target.value)} />
            <Input label="Nome Fantasia" value={modalForn.nome_fantasia || ''} onChange={e => upForn('nome_fantasia', e.target.value)} />
            <div style={styles.formRow}>
              <Input label="CNPJ" value={modalForn.cnpj || ''} onChange={e => upForn('cnpj', e.target.value)} />
              <Input label="Telefone" value={modalForn.telefone || ''} onChange={e => upForn('telefone', e.target.value)} />
            </div>
            <div style={styles.formRow}>
              <Input label="E-mail" value={modalForn.email || ''} onChange={e => upForn('email', e.target.value)} />
              <Input label="Contato" value={modalForn.contato || ''} onChange={e => upForn('contato', e.target.value)} />
            </div>
            <Select label="Categoria" value={modalForn.categoria || ''} onChange={e => upForn('categoria', e.target.value)}>
              <option value="">Selecione...</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Textarea label="Observacoes" value={modalForn.observacoes || ''} onChange={e => upForn('observacoes', e.target.value)} />
          </>
        )}
      </Modal>

      {/* ── Modal Solicitacao ───────────────────────────────── */}
      <Modal
        open={modalSol !== null}
        onClose={() => setModalSol(null)}
        title="Nova Solicitacao de Compra"
        footer={
          <>
            <button style={styles.btn('secondary')} onClick={() => setModalSol(null)}>Cancelar</button>
            <button style={styles.btn('primary')} onClick={saveSolicitacao} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        {modalSol && (
          <>
            <Input label="Titulo *" value={modalSol.titulo || ''} onChange={e => upSol('titulo', e.target.value)} />
            <Textarea label="Descricao" value={modalSol.descricao || ''} onChange={e => upSol('descricao', e.target.value)} />
            <Textarea label="Justificativa" value={modalSol.justificativa || ''} onChange={e => upSol('justificativa', e.target.value)} />
            <div style={styles.formRow}>
              <Input label="Valor Estimado" type="number" step="0.01" value={modalSol.valor_estimado || ''} onChange={e => upSol('valor_estimado', e.target.value)} />
              <Select label="Urgencia" value={modalSol.urgencia || 'normal'} onChange={e => upSol('urgencia', e.target.value)}>
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </Select>
            </div>
            <Input label="Area" value={modalSol.area || ''} onChange={e => upSol('area', e.target.value)} />
          </>
        )}
      </Modal>

      {/* ── Modal Pedido ────────────────────────────────────── */}
      <Modal
        open={modalPed !== null}
        onClose={() => setModalPed(null)}
        title={modalPed?.id ? 'Editar Pedido' : 'Novo Pedido'}
        footer={
          <>
            <button style={styles.btn('secondary')} onClick={() => setModalPed(null)}>Cancelar</button>
            <button style={styles.btn('primary')} onClick={savePedido} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        {modalPed && (
          <>
            <Textarea label="Descricao *" value={modalPed.descricao || ''} onChange={e => upPed('descricao', e.target.value)} />
            <div style={styles.formRow}>
              <Input label="Valor Total" type="number" step="0.01" value={modalPed.valor_total || ''} onChange={e => upPed('valor_total', e.target.value)} />
              <Input label="Data Prevista" type="date" value={modalPed.data_prevista || ''} onChange={e => upPed('data_prevista', e.target.value)} />
            </div>
            <div style={styles.formRow}>
              <Select label="Fornecedor" value={modalPed.fornecedor_id || ''} onChange={e => upPed('fornecedor_id', e.target.value)}>
                <option value="">Selecione...</option>
                {fornecedores.filter(f => f.ativo).map(f => (
                  <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>
                ))}
              </Select>
              <Select label="Status" value={modalPed.status || 'aguardando'} onChange={e => upPed('status', e.target.value)}>
                <option value="aguardando">Aguardando</option>
                <option value="em_transito">Em Transito</option>
                <option value="cancelado">Cancelado</option>
              </Select>
            </div>
            <div style={styles.formRow}>
              <Input label="Codigo Rastreio" value={modalPed.codigo_rastreio || ''} onChange={e => upPed('codigo_rastreio', e.target.value)} />
              <Input label="Transportadora" value={modalPed.transportadora || ''} onChange={e => upPed('transportadora', e.target.value)} />
            </div>
          </>
        )}
      </Modal>

      {/* ── Modal Recebimento ───────────────────────────────── */}
      <Modal
        open={modalReceber !== null}
        onClose={() => setModalReceber(null)}
        title="Registrar Recebimento"
        footer={
          <>
            <button style={styles.btn('secondary')} onClick={() => setModalReceber(null)}>Cancelar</button>
            <button style={styles.btn('success')} onClick={receberPedido} disabled={saving}>
              {saving ? 'Registrando...' : 'Confirmar Recebimento'}
            </button>
          </>
        }
      >
        {modalReceber && (
          <Textarea label="Observacoes do recebimento" value={modalReceber.observacoes || ''} onChange={e => upRec('observacoes', e.target.value)} />
        )}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB: Dashboard
// ═══════════════════════════════════════════════════════════
function DashboardTab({ dash }) {
  if (!dash) return <div style={styles.empty}>Carregando dashboard...</div>;

  const kpis = [
    { label: 'Fornecedores Ativos', value: dash.fornecedoresAtivos ?? 0, color: C.primary },
    { label: 'Solic. Pendentes', value: dash.solicitacoesPendentes ?? 0, color: C.amber },
    { label: 'Solic. Aprovadas', value: dash.solicitacoesAprovadas ?? 0, color: C.green },
    { label: 'Ped. Aguardando', value: dash.pedidosAguardando ?? 0, color: C.blue },
    { label: 'Ped. Em Transito', value: dash.pedidosEmTransito ?? 0, color: C.amber },
    { label: 'Ped. Recebidos', value: dash.pedidosRecebidos ?? 0, color: C.green },
    { label: 'Valor Total Pedidos', value: fmtMoney(dash.valorTotalPedidos), color: C.primary },
  ];

  return (
    <div style={styles.kpiGrid}>
      {kpis.map((k) => (
        <div key={k.label} style={styles.kpi(k.color)}>
          <div style={styles.kpiValue}>{k.value}</div>
          <div style={styles.kpiLabel}>{k.label}</div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB: Fornecedores
// ═══════════════════════════════════════════════════════════
function FornecedoresTab({ data, loading, isDiretor, filtroAtivo, setFiltroAtivo, onNew, onEdit, onDelete, onToggle }) {
  return (
    <>
      <div style={styles.filterRow}>
        <select style={styles.select} value={filtroAtivo} onChange={e => setFiltroAtivo(e.target.value)}>
          <option value="">Todos</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        {isDiretor && (
          <button style={styles.btn('primary')} onClick={onNew}>+ Novo Fornecedor</button>
        )}
      </div>
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nome</th>
              <th style={styles.th}>CNPJ</th>
              <th style={styles.th}>Categoria</th>
              <th style={styles.th}>Contato</th>
              <th style={styles.th}>Status</th>
              {isDiretor && <th style={styles.th}>Acoes</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={styles.td} colSpan={isDiretor ? 6 : 5}>Carregando...</td></tr>
            ) : data.length === 0 ? (
              <tr><td style={styles.td} colSpan={isDiretor ? 6 : 5}><div style={styles.empty}>Nenhum fornecedor encontrado</div></td></tr>
            ) : data.map(f => (
              <tr key={f.id} style={styles.clickRow}>
                <td style={styles.td}>
                  <div style={{ fontWeight: 600 }}>{f.nome_fantasia || f.razao_social}</div>
                  {f.nome_fantasia && <div style={{ fontSize: 11, color: C.text3 }}>{f.razao_social}</div>}
                </td>
                <td style={styles.td}>{f.cnpj || '-'}</td>
                <td style={styles.td}>{f.categoria || '-'}</td>
                <td style={styles.td}>
                  <div>{f.contato || '-'}</div>
                  {f.email && <div style={{ fontSize: 11, color: C.text3 }}>{f.email}</div>}
                  {f.telefone && <div style={{ fontSize: 11, color: C.text3 }}>{f.telefone}</div>}
                </td>
                <td style={styles.td}>
                  <span style={styles.badge(f.ativo ? C.green : C.text3, f.ativo ? C.greenBg : '#f3f4f6')}>
                    {f.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                {isDiretor && (
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => onToggle(f)}>
                        {f.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => onEdit(f)}>Editar</button>
                      <button style={{ ...styles.btn('ghost'), ...styles.btnSm, color: C.red }} onClick={() => onDelete(f.id)}>Excluir</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB: Solicitacoes
// ═══════════════════════════════════════════════════════════
function SolicitacoesTab({ data, loading, isDiretor, filtroStatus, setFiltroStatus, onNew, onAprovar, onRejeitar }) {
  return (
    <>
      <div style={styles.filterRow}>
        <select style={styles.select} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="aprovado">Aprovado</option>
          <option value="rejeitado">Rejeitado</option>
          <option value="em_cotacao">Em Cotacao</option>
          <option value="pedido_gerado">Pedido Gerado</option>
        </select>
        {isDiretor && (
          <button style={styles.btn('primary')} onClick={onNew}>+ Nova Solicitacao</button>
        )}
      </div>
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Titulo</th>
              <th style={styles.th}>Solicitante</th>
              <th style={styles.th}>Area</th>
              <th style={styles.th}>Valor Est.</th>
              <th style={styles.th}>Urgencia</th>
              <th style={styles.th}>Status</th>
              {isDiretor && <th style={styles.th}>Acoes</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={styles.td} colSpan={isDiretor ? 7 : 6}>Carregando...</td></tr>
            ) : data.length === 0 ? (
              <tr><td style={styles.td} colSpan={isDiretor ? 7 : 6}><div style={styles.empty}>Nenhuma solicitacao encontrada</div></td></tr>
            ) : data.map(s => (
              <tr key={s.id}>
                <td style={styles.td}>
                  <div style={{ fontWeight: 600 }}>{s.titulo}</div>
                  {s.descricao && <div style={{ fontSize: 11, color: C.text3, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.descricao}</div>}
                </td>
                <td style={styles.td}>{s.profiles?.name || '-'}</td>
                <td style={styles.td}>{s.area || '-'}</td>
                <td style={styles.td}>{fmtMoney(s.valor_estimado)}</td>
                <td style={styles.td}><Badge status={s.urgencia} map={URGENCIA_COLORS} /></td>
                <td style={styles.td}><Badge status={s.status} map={SOLICITACAO_STATUS} /></td>
                {isDiretor && (
                  <td style={styles.td}>
                    {s.status === 'pendente' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button style={{ ...styles.btn('success'), ...styles.btnSm }} onClick={() => onAprovar(s.id)}>Aprovar</button>
                        <button style={{ ...styles.btn('danger'), ...styles.btnSm }} onClick={() => onRejeitar(s.id)}>Rejeitar</button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB: Pedidos
// ═══════════════════════════════════════════════════════════
function PedidosTab({ data, loading, isDiretor, filtroStatus, setFiltroStatus, onNew, onEdit, onDelete, onReceber }) {
  return (
    <>
      <div style={styles.filterRow}>
        <select style={styles.select} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="aguardando">Aguardando</option>
          <option value="em_transito">Em Transito</option>
          <option value="recebido">Recebido</option>
          <option value="cancelado">Cancelado</option>
        </select>
        {isDiretor && (
          <button style={styles.btn('primary')} onClick={onNew}>+ Novo Pedido</button>
        )}
      </div>
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Descricao</th>
              <th style={styles.th}>Fornecedor</th>
              <th style={styles.th}>Valor</th>
              <th style={styles.th}>Data Prevista</th>
              <th style={styles.th}>Rastreio</th>
              <th style={styles.th}>Status</th>
              {isDiretor && <th style={styles.th}>Acoes</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={styles.td} colSpan={isDiretor ? 7 : 6}>Carregando...</td></tr>
            ) : data.length === 0 ? (
              <tr><td style={styles.td} colSpan={isDiretor ? 7 : 6}><div style={styles.empty}>Nenhum pedido encontrado</div></td></tr>
            ) : data.map(p => {
              const fornNome = p.log_fornecedores?.nome_fantasia || p.log_fornecedores?.razao_social || '-';
              return (
                <tr key={p.id}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 600, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descricao}</div>
                    {p.transportadora && <div style={{ fontSize: 11, color: C.text3 }}>{p.transportadora}</div>}
                  </td>
                  <td style={styles.td}>{fornNome}</td>
                  <td style={styles.td}>{fmtMoney(p.valor_total)}</td>
                  <td style={styles.td}>{fmtDate(p.data_prevista)}</td>
                  <td style={styles.td}>
                    {p.codigo_rastreio ? (
                      <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{p.codigo_rastreio}</span>
                    ) : '-'}
                  </td>
                  <td style={styles.td}><Badge status={p.status} map={PEDIDO_STATUS} /></td>
                  {isDiretor && (
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(p.status === 'aguardando' || p.status === 'em_transito') && (
                          <button style={{ ...styles.btn('success'), ...styles.btnSm }} onClick={() => onReceber(p)}>Receber</button>
                        )}
                        {p.status !== 'recebido' && (
                          <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => onEdit(p)}>Editar</button>
                        )}
                        {p.status !== 'recebido' && (
                          <button style={{ ...styles.btn('ghost'), ...styles.btnSm, color: C.red }} onClick={() => onDelete(p.id)}>Excluir</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
