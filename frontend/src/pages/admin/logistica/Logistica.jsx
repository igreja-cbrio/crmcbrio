import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { logistica } from '../../../api';
import { supabase } from '../../../supabaseClient';

// ── Tema ────────────────────────────────────────────────────
const C = {
  bg: 'var(--cbrio-bg)', card: 'var(--cbrio-card)', primary: '#00B39D', primaryBg: '#00B39D18',
  text: 'var(--cbrio-text)', text2: 'var(--cbrio-text2)', text3: 'var(--cbrio-text3)',
  border: 'var(--cbrio-border)', green: '#10b981', greenBg: '#10b98118',
  red: '#ef4444', redBg: '#ef444418', amber: '#f59e0b', amberBg: '#f59e0b18',
  blue: '#3b82f6', blueBg: '#3b82f618', purple: '#8b5cf6', purpleBg: '#8b5cf618',
};

const URGENCIA_COLORS = {
  urgente: { c: C.red, bg: C.redBg, label: 'Urgente' },
  alta: { c: C.amber, bg: C.amberBg, label: 'Alta' },
  normal: { c: C.blue, bg: C.blueBg, label: 'Normal' },
  baixa: { c: C.text3, bg: '#73737318', label: 'Baixa' },
};

const SOLICITACAO_STATUS = {
  pendente: { c: C.amber, bg: C.amberBg, label: 'Pendente' },
  aprovado: { c: C.green, bg: C.greenBg, label: 'Aprovado' },
  rejeitado: { c: C.red, bg: C.redBg, label: 'Rejeitado' },
  em_cotacao: { c: C.blue, bg: C.blueBg, label: 'Em Cotação' },
  pedido_gerado: { c: C.primary, bg: C.primaryBg, label: 'Pedido Gerado' },
};

const PEDIDO_STATUS = {
  aguardando: { c: C.amber, bg: C.amberBg, label: 'Aguardando' },
  em_transito: { c: C.blue, bg: C.blueBg, label: 'Em Trânsito' },
  recebido: { c: C.green, bg: C.greenBg, label: 'Recebido' },
  cancelado: { c: C.red, bg: C.redBg, label: 'Cancelado' },
};

const MOV_TIPO = {
  entrada: { c: C.green, bg: C.greenBg, label: 'Entrada', icon: '📥' },
  saida: { c: C.red, bg: C.redBg, label: 'Saída', icon: '📤' },
  transferencia: { c: C.blue, bg: C.blueBg, label: 'Transferência', icon: '🔄' },
  devolucao: { c: C.amber, bg: C.amberBg, label: 'Devolução', icon: '↩️' },
  inventario: { c: C.purple, bg: C.purpleBg, label: 'Inventário', icon: '📋' },
};

const CATEGORIAS = ['Escritório', 'Tecnologia', 'Limpeza', 'Alimentação', 'Construção', 'Serviços', 'Outros'];

// ── Estilos ─────────────────────────────────────────────────
const styles = {
  page: { maxWidth: 1200, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.text2, marginTop: 2 },
  tabs: { display: 'flex', gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 24, flexWrap: 'wrap' },
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
  card: { background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' },
  cardHeader: { padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: 700, color: C.text },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left', borderBottom: `1px solid ${C.border}`, background: 'var(--cbrio-table-header)' },
  td: { padding: '12px 16px', fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}` },
  badge: (color, bg) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color, background: bg }),
  btn: (variant = 'primary') => ({
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
    ...(variant === 'primary' ? { background: C.primary, color: '#fff' } : {}),
    ...(variant === 'secondary' ? { background: 'transparent', color: C.primary, border: `1px solid ${C.primary}` } : {}),
    ...(variant === 'danger' ? { background: C.red, color: '#fff' } : {}),
    ...(variant === 'ghost' ? { background: 'transparent', color: C.text2, padding: '6px 12px' } : {}),
    ...(variant === 'success' ? { background: C.green, color: '#fff' } : {}),
  }),
  btnSm: { padding: '4px 10px', fontSize: 11 },
  filterRow: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  input: { padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', width: '100%', transition: 'border 0.15s', background: 'var(--cbrio-input-bg)', color: 'var(--cbrio-text)' },
  select: { padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, background: 'var(--cbrio-input-bg)', color: 'var(--cbrio-text)', outline: 'none' },
  label: { fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 },
  formGroup: { marginBottom: 14 },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  overlay: { position: 'fixed', inset: 0, background: 'var(--cbrio-overlay)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 60, zIndex: 1000 },
  modal: { background: 'var(--cbrio-modal-bg)', borderRadius: 16, width: '95%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalHeader: { padding: '20px 24px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: C.text },
  modalBody: { padding: '16px 24px 24px' },
  modalFooter: { padding: '12px 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' },
  empty: { textAlign: 'center', padding: 40, color: C.text3, fontSize: 14 },
  clickRow: { cursor: 'pointer', transition: 'background 0.1s' },
};

// ── Helpers ─────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';
const fmtMoney = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

// ── Componentes auxiliares ──────────────────────────────────
function Modal({ open, onClose, title, children, footer, wide }) {
  if (!open) return null;
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, ...(wide ? { maxWidth: 720 } : {}) }} onClick={e => e.stopPropagation()}>
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
  return (<div style={styles.formGroup}>{label && <label style={styles.label}>{label}</label>}<input style={styles.input} {...props} /></div>);
}
function Select({ label, children, ...props }) {
  return (<div style={styles.formGroup}>{label && <label style={styles.label}>{label}</label>}<select style={{ ...styles.select, width: '100%' }} {...props}>{children}</select></div>);
}
function Textarea({ label, ...props }) {
  return (<div style={styles.formGroup}>{label && <label style={styles.label}>{label}</label>}<textarea style={{ ...styles.input, minHeight: 70, resize: 'vertical' }} {...props} /></div>);
}
function Badge({ status, map }) {
  const s = map[status] || { c: C.text3, bg: '#73737318', label: status || '—' };
  return <span style={styles.badge(s.c, s.bg)}>{s.label}</span>;
}

// ── TABS ────────────────────────────────────────────────────
const TABS = ['Dashboard', 'Fornecedores', 'Solicitações', 'Pedidos', 'Notas Fiscais', 'Movimentações'];

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
  const [notas, setNotas] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtros
  const [filtroFornAtivo, setFiltroFornAtivo] = useState('');
  const [filtroSolStatus, setFiltroSolStatus] = useState('');
  const [filtroPedStatus, setFiltroPedStatus] = useState('');
  const [filtroMovTipo, setFiltroMovTipo] = useState('');

  // Modals
  const [modalForn, setModalForn] = useState(null);
  const [modalSol, setModalSol] = useState(null);
  const [modalPed, setModalPed] = useState(null);
  const [modalReceber, setModalReceber] = useState(null);
  const [modalNota, setModalNota] = useState(null);
  const [modalMov, setModalMov] = useState(null);
  const [modalItens, setModalItens] = useState(null); // pedido_id
  const [saving, setSaving] = useState(false);

  // ── Fetch ──────────────────────────────────────────────
  const fetchDash = useCallback(async () => {
    try { setDash(await logistica.dashboard()); } catch (e) { console.error(e); }
  }, []);

  const fetchFornecedores = useCallback(async () => {
    setLoading(true);
    try {
      const params = filtroFornAtivo !== '' ? { ativo: filtroFornAtivo } : undefined;
      setFornecedores(await logistica.fornecedores.list(params) || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [filtroFornAtivo]);

  const fetchSolicitacoes = useCallback(async () => {
    setLoading(true);
    try {
      const params = filtroSolStatus ? { status: filtroSolStatus } : undefined;
      setSolicitacoes(await logistica.solicitacoes.list(params) || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [filtroSolStatus]);

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const params = filtroPedStatus ? { status: filtroPedStatus } : undefined;
      setPedidos(await logistica.pedidos.list(params) || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [filtroPedStatus]);

  const fetchNotas = useCallback(async () => {
    setLoading(true);
    try { setNotas(await logistica.notas.list() || []); } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  const fetchMovimentacoes = useCallback(async () => {
    setLoading(true);
    try {
      const params = filtroMovTipo ? { tipo: filtroMovTipo } : undefined;
      setMovimentacoes(await logistica.movimentacoes.list(params) || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [filtroMovTipo]);

  useEffect(() => {
    if (tab === 0) fetchDash();
    if (tab === 1) fetchFornecedores();
    if (tab === 2) fetchSolicitacoes();
    if (tab === 3) { fetchPedidos(); fetchFornecedores(); }
    if (tab === 4) { fetchNotas(); fetchFornecedores(); fetchPedidos(); }
    if (tab === 5) fetchMovimentacoes();
  }, [tab, fetchDash, fetchFornecedores, fetchSolicitacoes, fetchPedidos, fetchNotas, fetchMovimentacoes]);

  // ── Fornecedor CRUD ────────────────────────────────────
  const saveFornecedor = async () => {
    setSaving(true);
    try {
      const { id, ...rest } = modalForn;
      if (id) await logistica.fornecedores.update(id, rest);
      else await logistica.fornecedores.create(rest);
      setModalForn(null); fetchFornecedores();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const deleteFornecedor = async (id) => {
    if (!confirm('Excluir este fornecedor?')) return;
    try { await logistica.fornecedores.remove(id); fetchFornecedores(); } catch (e) { setError(e.message); }
  };

  const toggleFornecedorAtivo = async (forn) => {
    try { await logistica.fornecedores.update(forn.id, { ativo: !forn.ativo }); fetchFornecedores(); } catch (e) { setError(e.message); }
  };

  // ── Solicitação ────────────────────────────────────────
  const saveSolicitacao = async () => {
    setSaving(true);
    try {
      const { id, profiles, ...rest } = modalSol;
      if (id) await logistica.solicitacoes.atualizar(id, rest);
      else await logistica.solicitacoes.create(rest);
      setModalSol(null); fetchSolicitacoes(); fetchDash();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const atualizarStatusSolicitacao = async (id, status) => {
    try { await logistica.solicitacoes.atualizar(id, { status }); fetchSolicitacoes(); fetchDash(); } catch (e) { setError(e.message); }
  };

  // ── Pedido CRUD ────────────────────────────────────────
  const savePedido = async () => {
    setSaving(true);
    try {
      const { id, log_fornecedores, ...rest } = modalPed;
      if (id) await logistica.pedidos.update(id, rest);
      else await logistica.pedidos.create(rest);
      setModalPed(null); fetchPedidos(); fetchDash();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const deletePedido = async (id) => {
    if (!confirm('Excluir este pedido?')) return;
    try { await logistica.pedidos.remove(id); fetchPedidos(); fetchDash(); } catch (e) { setError(e.message); }
  };

  const receberPedido = async () => {
    setSaving(true);
    try {
      await logistica.pedidos.receber(modalReceber.id, modalReceber);
      setModalReceber(null); fetchPedidos(); fetchDash();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  // ── Nota Fiscal ────────────────────────────────────────
  const saveNota = async () => {
    setSaving(true);
    try {
      await logistica.notas.create(modalNota);
      setModalNota(null); fetchNotas();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const deleteNota = async (id) => {
    if (!confirm('Excluir esta nota fiscal?')) return;
    try { await logistica.notas.remove(id); fetchNotas(); } catch (e) { setError(e.message); }
  };

  // ── Movimentação ───────────────────────────────────────
  const saveMovimentacao = async () => {
    setSaving(true);
    try {
      await logistica.movimentacoes.create(modalMov);
      setModalMov(null); fetchMovimentacoes();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  // ── Field updaters ─────────────────────────────────────
  const upForn = (k, v) => setModalForn(prev => ({ ...prev, [k]: v }));
  const upSol = (k, v) => setModalSol(prev => ({ ...prev, [k]: v }));
  const upPed = (k, v) => setModalPed(prev => ({ ...prev, [k]: v }));
  const upRec = (k, v) => setModalReceber(prev => ({ ...prev, [k]: v }));
  const upNota = (k, v) => setModalNota(prev => ({ ...prev, [k]: v }));
  const upMov = (k, v) => setModalMov(prev => ({ ...prev, [k]: v }));

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>🚚 Logística</div>
          <div style={styles.subtitle}>Fornecedores, compras, pedidos, notas fiscais e movimentações</div>
        </div>
      </div>

      {error && (
        <div style={{ background: C.redBg, color: C.red, padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button style={styles.btn('ghost')} onClick={() => setError('')}>&#x2715;</button>
        </div>
      )}

      <div style={styles.tabs}>
        {TABS.map((t, i) => (
          <button key={t} style={styles.tab(tab === i)} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {tab === 0 && <DashboardTab dash={dash} />}
      {tab === 1 && (
        <FornecedoresTab data={fornecedores} loading={loading} isDiretor={isDiretor}
          filtroAtivo={filtroFornAtivo} setFiltroAtivo={setFiltroFornAtivo}
          onNew={() => setModalForn({ razao_social: '', nome_fantasia: '', cnpj: '', email: '', telefone: '', contato: '', categoria: '', ativo: true, observacoes: '' })}
          onEdit={(f) => setModalForn({ ...f })} onDelete={deleteFornecedor} onToggle={toggleFornecedorAtivo}
        />
      )}
      {tab === 2 && (
        <SolicitacoesTab data={solicitacoes} loading={loading} isDiretor={isDiretor}
          filtroStatus={filtroSolStatus} setFiltroStatus={setFiltroSolStatus}
          onNew={() => setModalSol({ titulo: '', descricao: '', justificativa: '', valor_estimado: '', urgencia: 'normal', area: '' })}
          onAprovar={(id) => atualizarStatusSolicitacao(id, 'aprovado')}
          onRejeitar={(id) => atualizarStatusSolicitacao(id, 'rejeitado')}
        />
      )}
      {tab === 3 && (
        <PedidosTab data={pedidos} loading={loading} isDiretor={isDiretor}
          filtroStatus={filtroPedStatus} setFiltroStatus={setFiltroPedStatus}
          onNew={() => setModalPed({ fornecedor_id: '', descricao: '', valor_total: '', data_prevista: '', status: 'aguardando', codigo_rastreio: '', transportadora: '' })}
          onEdit={(p) => setModalPed({ ...p })} onDelete={deletePedido}
          onReceber={(p) => setModalReceber({ id: p.id, observacoes: '', status: 'ok' })}
          onItens={(p) => setModalItens(p.id)}
          fornecedores={fornecedores}
        />
      )}
      {tab === 4 && (
        <NotasFiscaisTab data={notas} loading={loading}
          onNew={() => setModalNota({ pedido_id: '', fornecedor_id: '', numero: '', serie: '', chave_acesso: '', valor: '', data_emissao: '', storage_path: '' })}
          onDelete={deleteNota} fornecedores={fornecedores} pedidos={pedidos}
        />
      )}
      {tab === 5 && (
        <MovimentacoesTab data={movimentacoes} loading={loading}
          filtroTipo={filtroMovTipo} setFiltroTipo={setFiltroMovTipo}
          onNew={() => setModalMov({ tipo: 'entrada', codigo_barras: '', descricao: '', quantidade: 1, unidade: 'un', localizacao: '', observacoes: '' })}
          onReload={fetchMovimentacoes}
        />
      )}

      {/* ── MODAIS ─────────────────────────────────────────── */}

      {/* Fornecedor */}
      <Modal open={modalForn !== null} onClose={() => setModalForn(null)} title={modalForn?.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}
        footer={<><button style={styles.btn('secondary')} onClick={() => setModalForn(null)}>Cancelar</button><button style={styles.btn('primary')} onClick={saveFornecedor} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button></>}>
        {modalForn && (<>
          <Input label="Razão Social *" value={modalForn.razao_social || ''} onChange={e => upForn('razao_social', e.target.value)} />
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
          <Textarea label="Observações" value={modalForn.observacoes || ''} onChange={e => upForn('observacoes', e.target.value)} />
        </>)}
      </Modal>

      {/* Solicitação */}
      <Modal open={modalSol !== null} onClose={() => setModalSol(null)} title="Nova Solicitação de Compra"
        footer={<><button style={styles.btn('secondary')} onClick={() => setModalSol(null)}>Cancelar</button><button style={styles.btn('primary')} onClick={saveSolicitacao} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button></>}>
        {modalSol && (<>
          <Input label="Título *" value={modalSol.titulo || ''} onChange={e => upSol('titulo', e.target.value)} />
          <Textarea label="Descrição" value={modalSol.descricao || ''} onChange={e => upSol('descricao', e.target.value)} />
          <Textarea label="Justificativa" value={modalSol.justificativa || ''} onChange={e => upSol('justificativa', e.target.value)} />
          <div style={styles.formRow}>
            <Input label="Valor Estimado" type="number" step="0.01" value={modalSol.valor_estimado || ''} onChange={e => upSol('valor_estimado', e.target.value)} />
            <Select label="Urgência" value={modalSol.urgencia || 'normal'} onChange={e => upSol('urgencia', e.target.value)}>
              <option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option>
            </Select>
          </div>
          <Input label="Área" value={modalSol.area || ''} onChange={e => upSol('area', e.target.value)} />
        </>)}
      </Modal>

      {/* Pedido */}
      <Modal open={modalPed !== null} onClose={() => setModalPed(null)} title={modalPed?.id ? 'Editar Pedido' : 'Novo Pedido'}
        footer={<><button style={styles.btn('secondary')} onClick={() => setModalPed(null)}>Cancelar</button><button style={styles.btn('primary')} onClick={savePedido} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button></>}>
        {modalPed && (<>
          <Textarea label="Descrição *" value={modalPed.descricao || ''} onChange={e => upPed('descricao', e.target.value)} />
          <div style={styles.formRow}>
            <Input label="Valor Total" type="number" step="0.01" value={modalPed.valor_total || ''} onChange={e => upPed('valor_total', e.target.value)} />
            <Input label="Data Prevista" type="date" value={modalPed.data_prevista || ''} onChange={e => upPed('data_prevista', e.target.value)} />
          </div>
          <div style={styles.formRow}>
            <Select label="Fornecedor" value={modalPed.fornecedor_id || ''} onChange={e => upPed('fornecedor_id', e.target.value)}>
              <option value="">Selecione...</option>
              {fornecedores.filter(f => f.ativo).map(f => <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>)}
            </Select>
            <Select label="Status" value={modalPed.status || 'aguardando'} onChange={e => upPed('status', e.target.value)}>
              <option value="aguardando">Aguardando</option><option value="em_transito">Em Trânsito</option><option value="cancelado">Cancelado</option>
            </Select>
          </div>
          <div style={styles.formRow}>
            <Input label="Código Rastreio" value={modalPed.codigo_rastreio || ''} onChange={e => upPed('codigo_rastreio', e.target.value)} />
            <Input label="Transportadora" value={modalPed.transportadora || ''} onChange={e => upPed('transportadora', e.target.value)} />
          </div>
        </>)}
      </Modal>

      {/* Recebimento */}
      <Modal open={modalReceber !== null} onClose={() => setModalReceber(null)} title="Registrar Recebimento"
        footer={<><button style={styles.btn('secondary')} onClick={() => setModalReceber(null)}>Cancelar</button><button style={styles.btn('success')} onClick={receberPedido} disabled={saving}>{saving ? 'Registrando...' : 'Confirmar Recebimento'}</button></>}>
        {modalReceber && (<>
          <Select label="Status do recebimento" value={modalReceber.status || 'ok'} onChange={e => upRec('status', e.target.value)}>
            <option value="ok">OK — Tudo certo</option><option value="com_avaria">Com avaria</option><option value="incompleto">Incompleto</option>
          </Select>
          <Textarea label="Observações" value={modalReceber.observacoes || ''} onChange={e => upRec('observacoes', e.target.value)} />
        </>)}
      </Modal>

      {/* Nota Fiscal */}
      <NotaFiscalModal open={modalNota !== null} data={modalNota} onClose={() => setModalNota(null)}
        onSave={saveNota} saving={saving} fornecedores={fornecedores} pedidos={pedidos} upNota={upNota} />

      {/* Itens do Pedido */}
      <ItensPedidoModal open={modalItens !== null} pedidoId={modalItens} onClose={() => setModalItens(null)} />

      {/* Movimentação */}
      <MovimentacaoModal open={modalMov !== null} data={modalMov} onClose={() => setModalMov(null)}
        onSave={saveMovimentacao} saving={saving} upMov={upMov} />
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
    { label: 'Ped. Em Trânsito', value: dash.pedidosEmTransito ?? 0, color: C.amber },
    { label: 'Ped. Recebidos', value: dash.pedidosRecebidos ?? 0, color: C.green },
    { label: 'Valor Total Pedidos', value: fmtMoney(dash.valorTotalPedidos), color: C.primary },
  ];
  return (
    <div style={styles.kpiGrid}>
      {kpis.map(k => <div key={k.label} style={styles.kpi(k.color)}><div style={styles.kpiValue}>{k.value}</div><div style={styles.kpiLabel}>{k.label}</div></div>)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB: Fornecedores
// ═══════════════════════════════════════════════════════════
function FornecedoresTab({ data, loading, isDiretor, filtroAtivo, setFiltroAtivo, onNew, onEdit, onDelete, onToggle }) {
  return (<>
    <div style={styles.filterRow}>
      <select style={styles.select} value={filtroAtivo} onChange={e => setFiltroAtivo(e.target.value)}>
        <option value="">Todos</option><option value="true">Ativos</option><option value="false">Inativos</option>
      </select>
      {isDiretor && <button style={styles.btn('primary')} onClick={onNew}>+ Novo Fornecedor</button>}
    </div>
    <div style={styles.card}><table style={styles.table}><thead><tr>
      <th style={styles.th}>Nome</th><th style={styles.th}>CNPJ</th><th style={styles.th}>Categoria</th><th style={styles.th}>Contato</th><th style={styles.th}>Status</th>
      {isDiretor && <th style={styles.th}>Ações</th>}
    </tr></thead><tbody>
      {loading ? <tr><td style={styles.td} colSpan={6}>Carregando...</td></tr>
      : data.length === 0 ? <tr><td style={styles.td} colSpan={6}><div style={styles.empty}>Nenhum fornecedor</div></td></tr>
      : data.map(f => (
        <tr key={f.id}>
          <td style={styles.td}><div style={{ fontWeight: 600 }}>{f.nome_fantasia || f.razao_social}</div>{f.nome_fantasia && <div style={{ fontSize: 11, color: C.text3 }}>{f.razao_social}</div>}</td>
          <td style={styles.td}>{f.cnpj || '—'}</td>
          <td style={styles.td}>{f.categoria || '—'}</td>
          <td style={styles.td}><div>{f.contato || '—'}</div>{f.email && <div style={{ fontSize: 11, color: C.text3 }}>{f.email}</div>}{f.telefone && <div style={{ fontSize: 11, color: C.text3 }}>{f.telefone}</div>}</td>
          <td style={styles.td}><span style={styles.badge(f.ativo ? C.green : C.text3, f.ativo ? C.greenBg : '#73737318')}>{f.ativo ? 'Ativo' : 'Inativo'}</span></td>
          {isDiretor && <td style={styles.td}><div style={{ display: 'flex', gap: 4 }}>
            <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => onToggle(f)}>{f.ativo ? '⏸' : '▶'}</button>
            <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => onEdit(f)}>✏️</button>
            <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => onDelete(f.id)}>🗑</button>
          </div></td>}
        </tr>
      ))}
    </tbody></table></div>
  </>);
}

// ═══════════════════════════════════════════════════════════
// TAB: Solicitações
// ═══════════════════════════════════════════════════════════
function SolicitacoesTab({ data, loading, isDiretor, filtroStatus, setFiltroStatus, onNew, onAprovar, onRejeitar }) {
  return (<>
    <div style={styles.filterRow}>
      <select style={styles.select} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
        <option value="">Todos</option>
        {Object.entries(SOLICITACAO_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <button style={styles.btn('primary')} onClick={onNew}>+ Nova Solicitação</button>
    </div>
    <div style={styles.card}><table style={styles.table}><thead><tr>
      <th style={styles.th}>Título</th><th style={styles.th}>Solicitante</th><th style={styles.th}>Área</th><th style={styles.th}>Valor Est.</th><th style={styles.th}>Urgência</th><th style={styles.th}>Status</th>
      {isDiretor && <th style={styles.th}>Ações</th>}
    </tr></thead><tbody>
      {loading ? <tr><td style={styles.td} colSpan={7}>Carregando...</td></tr>
      : data.length === 0 ? <tr><td style={styles.td} colSpan={7}><div style={styles.empty}>Nenhuma solicitação</div></td></tr>
      : data.map(s => (
        <tr key={s.id}>
          <td style={{ ...styles.td, fontWeight: 600 }}>{s.titulo}</td>
          <td style={styles.td}>{s.profiles?.name || '—'}</td>
          <td style={styles.td}>{s.area || '—'}</td>
          <td style={styles.td}>{fmtMoney(s.valor_estimado)}</td>
          <td style={styles.td}><Badge status={s.urgencia} map={URGENCIA_COLORS} /></td>
          <td style={styles.td}><Badge status={s.status} map={SOLICITACAO_STATUS} /></td>
          {isDiretor && <td style={styles.td}>{s.status === 'pendente' && <div style={{ display: 'flex', gap: 4 }}>
            <button style={{ ...styles.btn('success'), ...styles.btnSm }} onClick={() => onAprovar(s.id)}>✓</button>
            <button style={{ ...styles.btn('danger'), ...styles.btnSm }} onClick={() => onRejeitar(s.id)}>✕</button>
          </div>}</td>}
        </tr>
      ))}
    </tbody></table></div>
  </>);
}

// ═══════════════════════════════════════════════════════════
// TAB: Pedidos
// ═══════════════════════════════════════════════════════════
function PedidosTab({ data, loading, isDiretor, filtroStatus, setFiltroStatus, onNew, onEdit, onDelete, onReceber, onItens, fornecedores }) {
  return (<>
    <div style={styles.filterRow}>
      <select style={styles.select} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
        <option value="">Todos</option>
        {Object.entries(PEDIDO_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      {isDiretor && <button style={styles.btn('primary')} onClick={onNew}>+ Novo Pedido</button>}
    </div>
    <div style={styles.card}><table style={styles.table}><thead><tr>
      <th style={styles.th}>Descrição</th><th style={styles.th}>Fornecedor</th><th style={styles.th}>Valor</th><th style={styles.th}>Data Prev.</th><th style={styles.th}>Rastreio</th><th style={styles.th}>Status</th><th style={styles.th}>Ações</th>
    </tr></thead><tbody>
      {loading ? <tr><td style={styles.td} colSpan={7}>Carregando...</td></tr>
      : data.length === 0 ? <tr><td style={styles.td} colSpan={7}><div style={styles.empty}>Nenhum pedido</div></td></tr>
      : data.map(p => (
        <tr key={p.id}>
          <td style={{ ...styles.td, fontWeight: 600, maxWidth: 200 }}>{p.descricao}</td>
          <td style={styles.td}>{p.log_fornecedores?.nome_fantasia || p.log_fornecedores?.razao_social || '—'}</td>
          <td style={styles.td}>{fmtMoney(p.valor_total)}</td>
          <td style={styles.td}>{fmtDate(p.data_prevista)}</td>
          <td style={styles.td}>{p.codigo_rastreio || '—'}</td>
          <td style={styles.td}><Badge status={p.status} map={PEDIDO_STATUS} /></td>
          <td style={styles.td}><div style={{ display: 'flex', gap: 4 }}>
            <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => onItens(p)} title="Itens">📦</button>
            {['aguardando', 'em_transito'].includes(p.status) && <>
              <button style={{ ...styles.btn('success'), ...styles.btnSm }} onClick={() => onReceber(p)} title="Receber">✓</button>
              <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => onEdit(p)}>✏️</button>
            </>}
            {p.status !== 'recebido' && <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => onDelete(p.id)}>🗑</button>}
          </div></td>
        </tr>
      ))}
    </tbody></table></div>
  </>);
}

// ═══════════════════════════════════════════════════════════
// TAB: Notas Fiscais
// ═══════════════════════════════════════════════════════════
function NotasFiscaisTab({ data, loading, onNew, onDelete }) {
  return (<>
    <div style={styles.filterRow}>
      <button style={styles.btn('primary')} onClick={onNew}>+ Nova Nota Fiscal</button>
    </div>
    <div style={styles.card}><table style={styles.table}><thead><tr>
      <th style={styles.th}>Número</th><th style={styles.th}>Fornecedor</th><th style={styles.th}>Pedido</th><th style={styles.th}>Valor</th><th style={styles.th}>Emissão</th><th style={styles.th}>PDF</th><th style={styles.th}>Ações</th>
    </tr></thead><tbody>
      {loading ? <tr><td style={styles.td} colSpan={7}>Carregando...</td></tr>
      : data.length === 0 ? <tr><td style={styles.td} colSpan={7}><div style={styles.empty}>Nenhuma nota fiscal</div></td></tr>
      : data.map(n => (
        <tr key={n.id}>
          <td style={{ ...styles.td, fontWeight: 600 }}>{n.numero}{n.serie ? `/${n.serie}` : ''}</td>
          <td style={styles.td}>{n.log_fornecedores?.nome_fantasia || n.log_fornecedores?.razao_social || '—'}</td>
          <td style={styles.td}>{n.log_pedidos?.descricao ? n.log_pedidos.descricao.slice(0, 30) : '—'}</td>
          <td style={styles.td}>{fmtMoney(n.valor)}</td>
          <td style={styles.td}>{fmtDate(n.data_emissao)}</td>
          <td style={styles.td}>{n.storage_path ? <a href={n.storage_path} target="_blank" rel="noopener noreferrer" style={{ color: C.primary }}>📄 Ver PDF</a> : '—'}</td>
          <td style={styles.td}><button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => onDelete(n.id)}>🗑</button></td>
        </tr>
      ))}
    </tbody></table></div>
  </>);
}

// ═══════════════════════════════════════════════════════════
// TAB: Movimentações
// ═══════════════════════════════════════════════════════════
function MovimentacoesTab({ data, loading, filtroTipo, setFiltroTipo, onNew, onReload }) {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [historico, setHistorico] = useState([]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Barcode scanner via camera
  async function startScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      // Use BarcodeDetector API if available
      if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'] });
        const detectLoop = async () => {
          if (!videoRef.current || !scanning) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              setScanResult(code);
              stopScan();
              loadHistorico(code);
              return;
            }
          } catch (e) { /* continue scanning */ }
          requestAnimationFrame(detectLoop);
        };
        requestAnimationFrame(detectLoop);
      }
    } catch (e) {
      alert('Não foi possível acessar a câmera. Verifique as permissões.');
      setScanning(false);
    }
  }

  function stopScan() {
    setScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  async function loadHistorico(codigo) {
    try { setHistorico(await logistica.movimentacoes.historico(codigo)); }
    catch (e) { console.error(e); }
  }

  function handleManualCode(e) {
    if (e.key === 'Enter' && e.target.value) {
      setScanResult(e.target.value);
      loadHistorico(e.target.value);
    }
  }

  return (<>
    <div style={styles.filterRow}>
      <select style={styles.select} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
        <option value="">Todos os tipos</option>
        {Object.entries(MOV_TIPO).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
      </select>
      <button style={styles.btn('primary')} onClick={onNew}>+ Nova Movimentação</button>
      <button style={styles.btn('secondary')} onClick={scanning ? stopScan : startScan}>
        {scanning ? '⏹ Parar Scanner' : '📷 Escanear Código'}
      </button>
    </div>

    {/* Scanner de código de barras */}
    {scanning && (
      <div style={{ ...styles.card, marginBottom: 16, padding: 16, textAlign: 'center' }}>
        <video ref={videoRef} style={{ width: '100%', maxWidth: 400, borderRadius: 12, background: '#000' }} autoPlay playsInline muted />
        <div style={{ fontSize: 13, color: C.text2, marginTop: 8 }}>Aponte a câmera para o código de barras</div>
        {!('BarcodeDetector' in window) && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: C.amber, marginBottom: 8 }}>Scanner automático não disponível neste navegador. Digite manualmente:</div>
            <input style={{ ...styles.input, maxWidth: 300, margin: '0 auto' }} placeholder="Digite o código de barras e pressione Enter"
              onKeyDown={handleManualCode} autoFocus />
          </div>
        )}
      </div>
    )}

    {/* Input manual sempre visível */}
    {!scanning && (
      <div style={{ ...styles.card, marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 20 }}>🔍</span>
          <input style={{ ...styles.input, flex: 1 }} placeholder="Digite ou escaneie o código de barras e pressione Enter"
            onKeyDown={handleManualCode} defaultValue={scanResult || ''} />
        </div>
      </div>
    )}

    {/* Resultado do scan — histórico do item */}
    {scanResult && (
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <div style={{ ...styles.cardHeader }}>
          <div>
            <div style={styles.cardTitle}>Código: {scanResult}</div>
            <div style={{ fontSize: 12, color: C.text2 }}>{historico.length} movimentação(ões) encontrada(s)</div>
          </div>
          <button style={styles.btn('ghost')} onClick={() => { setScanResult(null); setHistorico([]); }}>✕</button>
        </div>
        {historico.length > 0 ? (
          <table style={styles.table}><thead><tr>
            <th style={styles.th}>Data</th><th style={styles.th}>Tipo</th><th style={styles.th}>Descrição</th><th style={styles.th}>Qtd</th><th style={styles.th}>Local</th><th style={styles.th}>Responsável</th>
          </tr></thead><tbody>
            {historico.map(m => (
              <tr key={m.id}>
                <td style={styles.td}>{fmtDateTime(m.created_at)}</td>
                <td style={styles.td}><Badge status={m.tipo} map={MOV_TIPO} /></td>
                <td style={styles.td}>{m.descricao || '—'}</td>
                <td style={styles.td}>{m.quantidade} {m.unidade}</td>
                <td style={styles.td}>{m.localizacao || '—'}</td>
                <td style={styles.td}>{m.profiles?.name || '—'}</td>
              </tr>
            ))}
          </tbody></table>
        ) : <div style={{ padding: 20, textAlign: 'center', color: C.text3 }}>Nenhuma movimentação para este código</div>}
      </div>
    )}

    {/* Lista de movimentações recentes */}
    <div style={styles.card}><div style={styles.cardHeader}><div style={styles.cardTitle}>Movimentações Recentes</div></div>
    <table style={styles.table}><thead><tr>
      <th style={styles.th}>Data</th><th style={styles.th}>Tipo</th><th style={styles.th}>Código</th><th style={styles.th}>Descrição</th><th style={styles.th}>Qtd</th><th style={styles.th}>Local</th><th style={styles.th}>Responsável</th>
    </tr></thead><tbody>
      {loading ? <tr><td style={styles.td} colSpan={7}>Carregando...</td></tr>
      : data.length === 0 ? <tr><td style={styles.td} colSpan={7}><div style={styles.empty}>Nenhuma movimentação registrada</div></td></tr>
      : data.map(m => (
        <tr key={m.id}>
          <td style={styles.td}>{fmtDateTime(m.created_at)}</td>
          <td style={styles.td}><Badge status={m.tipo} map={MOV_TIPO} /></td>
          <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 600 }}>{m.codigo_barras}</td>
          <td style={styles.td}>{m.descricao || '—'}</td>
          <td style={styles.td}>{m.quantidade} {m.unidade}</td>
          <td style={styles.td}>{m.localizacao || '—'}</td>
          <td style={styles.td}>{m.profiles?.name || '—'}</td>
        </tr>
      ))}
    </tbody></table></div>
  </>);
}

// ═══════════════════════════════════════════════════════════
// MODAL: Nota Fiscal (com upload PDF)
// ═══════════════════════════════════════════════════════════
function NotaFiscalModal({ open, data, onClose, onSave, saving, fornecedores, pedidos, upNota }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  async function handleUploadNF(file) {
    if (!file) return;
    setUploading(true);
    try {
      const filePath = `notas-fiscais/${crypto.randomUUID()}_${file.name}`;
      const { error } = await supabase.storage.from('log-arquivos').upload(filePath, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('log-arquivos').getPublicUrl(filePath);
      upNota('storage_path', publicUrl);
    } catch (e) { alert('Erro ao enviar arquivo: ' + e.message); }
    finally { setUploading(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Nota Fiscal"
      footer={<><button style={styles.btn('secondary')} onClick={onClose}>Cancelar</button><button style={styles.btn('primary')} onClick={onSave} disabled={saving || uploading}>{saving ? 'Salvando...' : 'Salvar'}</button></>}>
      {data && (<>
        <div style={styles.formRow}>
          <Input label="Número *" value={data.numero || ''} onChange={e => upNota('numero', e.target.value)} />
          <Input label="Série" value={data.serie || ''} onChange={e => upNota('serie', e.target.value)} />
        </div>
        <div style={styles.formRow}>
          <Input label="Valor *" type="number" step="0.01" value={data.valor || ''} onChange={e => upNota('valor', e.target.value)} />
          <Input label="Data Emissão *" type="date" value={data.data_emissao || ''} onChange={e => upNota('data_emissao', e.target.value)} />
        </div>
        <div style={styles.formRow}>
          <Select label="Fornecedor" value={data.fornecedor_id || ''} onChange={e => upNota('fornecedor_id', e.target.value)}>
            <option value="">Selecione...</option>
            {fornecedores.filter(f => f.ativo).map(f => <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>)}
          </Select>
          <Select label="Pedido" value={data.pedido_id || ''} onChange={e => upNota('pedido_id', e.target.value)}>
            <option value="">Selecione...</option>
            {pedidos.map(p => <option key={p.id} value={p.id}>{p.descricao?.slice(0, 40)}</option>)}
          </Select>
        </div>
        <Input label="Chave de Acesso" value={data.chave_acesso || ''} onChange={e => upNota('chave_acesso', e.target.value)} />
        {/* Upload PDF */}
        <div style={styles.formGroup}>
          <label style={styles.label}>PDF da Nota Fiscal</label>
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleUploadNF(e.dataTransfer.files?.[0]); }}
            onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${C.border}`, borderRadius: 10, padding: 16, textAlign: 'center', cursor: 'pointer' }}
          >
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleUploadNF(e.target.files?.[0])} />
            {data.storage_path ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                <span style={{ fontSize: 20 }}>📄</span>
                <a href={data.storage_path} target="_blank" rel="noopener noreferrer" style={{ color: C.primary, fontSize: 13 }}>PDF enviado ↗</a>
                <button type="button" onClick={e => { e.stopPropagation(); upNota('storage_path', ''); }} style={{ ...styles.btn('ghost'), color: C.red, fontSize: 12 }}>Remover</button>
              </div>
            ) : uploading ? (
              <div style={{ color: C.primary, fontSize: 13 }}>Enviando...</div>
            ) : (
              <><div style={{ fontSize: 20 }}>📄</div><div style={{ fontSize: 13, color: C.text2 }}>Arraste o PDF aqui ou clique para selecionar</div></>
            )}
          </div>
        </div>
      </>)}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// MODAL: Itens do Pedido
// ═══════════════════════════════════════════════════════════
function ItensPedidoModal({ open, pedidoId, onClose }) {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ descricao: '', quantidade: '', unidade: 'un', valor_unit: '' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (pedidoId) loadItens();
  }, [pedidoId]);

  async function loadItens() {
    setLoading(true);
    try { setItens(await logistica.pedidos.itens(pedidoId) || []); } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function addItem() {
    if (!form.descricao || !form.quantidade) { alert('Descrição e quantidade são obrigatórios'); return; }
    setAdding(true);
    try {
      await logistica.pedidos.addItem(pedidoId, form);
      setForm({ descricao: '', quantidade: '', unidade: 'un', valor_unit: '' });
      loadItens();
    } catch (e) { alert(e.message); }
    setAdding(false);
  }

  async function removeItem(id) {
    try { await logistica.pedidos.removeItem(id); loadItens(); } catch (e) { alert(e.message); }
  }

  const total = itens.reduce((s, i) => s + Number(i.valor_total || 0), 0);

  return (
    <Modal open={open} onClose={onClose} title="Itens do Pedido" wide>
      {loading ? <div style={styles.empty}>Carregando...</div> : (<>
        <table style={styles.table}><thead><tr>
          <th style={styles.th}>Descrição</th><th style={styles.th}>Qtd</th><th style={styles.th}>Un.</th><th style={styles.th}>V. Unit.</th><th style={styles.th}>V. Total</th><th style={styles.th}></th>
        </tr></thead><tbody>
          {itens.map(i => (
            <tr key={i.id}>
              <td style={styles.td}>{i.descricao}</td>
              <td style={styles.td}>{i.quantidade}</td>
              <td style={styles.td}>{i.unidade}</td>
              <td style={styles.td}>{fmtMoney(i.valor_unit)}</td>
              <td style={styles.td}>{fmtMoney(i.valor_total)}</td>
              <td style={styles.td}><button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => removeItem(i.id)}>🗑</button></td>
            </tr>
          ))}
          {itens.length > 0 && <tr><td colSpan={4} style={{ ...styles.td, textAlign: 'right', fontWeight: 700 }}>Total:</td><td style={{ ...styles.td, fontWeight: 700 }}>{fmtMoney(total)}</td><td style={styles.td}></td></tr>}
        </tbody></table>
        {itens.length === 0 && <div style={{ ...styles.empty, padding: 16 }}>Nenhum item adicionado</div>}

        {/* Add item form */}
        <div style={{ marginTop: 16, padding: 16, background: 'var(--cbrio-input-bg)', borderRadius: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Adicionar Item</div>
          <Input label="Descrição *" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Input label="Quantidade *" type="number" step="0.001" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
            <Input label="Unidade" value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))} />
            <Input label="Valor Unitário" type="number" step="0.01" value={form.valor_unit} onChange={e => setForm(f => ({ ...f, valor_unit: e.target.value }))} />
          </div>
          <button style={styles.btn('primary')} onClick={addItem} disabled={adding}>{adding ? 'Adicionando...' : 'Adicionar Item'}</button>
        </div>
      </>)}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// MODAL: Nova Movimentação (com scanner inline)
// ═══════════════════════════════════════════════════════════
function MovimentacaoModal({ open, data, onClose, onSave, saving, upMov }) {
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  async function startScan() {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'] });
        const detect = async () => {
          if (!videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) { upMov('codigo_barras', barcodes[0].rawValue); stopScan(); return; }
          } catch (e) { /* continue */ }
          if (scanning) requestAnimationFrame(detect);
        };
        requestAnimationFrame(detect);
      }
    } catch (e) { alert('Não foi possível acessar a câmera'); setScanning(false); }
  }

  function stopScan() {
    setScanning(false);
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }

  useEffect(() => { if (!open) stopScan(); }, [open]);

  return (
    <Modal open={open} onClose={() => { stopScan(); onClose(); }} title="Nova Movimentação"
      footer={<><button style={styles.btn('secondary')} onClick={() => { stopScan(); onClose(); }}>Cancelar</button><button style={styles.btn('primary')} onClick={onSave} disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</button></>}>
      {data && (<>
        <Select label="Tipo *" value={data.tipo || 'entrada'} onChange={e => upMov('tipo', e.target.value)}>
          {Object.entries(MOV_TIPO).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </Select>
        <div style={styles.formGroup}>
          <label style={styles.label}>Código de Barras *</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input style={{ ...styles.input, flex: 1, fontFamily: 'monospace', fontSize: 16, fontWeight: 700 }}
              value={data.codigo_barras || ''} onChange={e => upMov('codigo_barras', e.target.value)}
              placeholder="Digite ou escaneie" />
            <button type="button" style={styles.btn(scanning ? 'danger' : 'secondary')} onClick={scanning ? stopScan : startScan}>
              {scanning ? '⏹' : '📷'}
            </button>
          </div>
        </div>
        {scanning && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <video ref={videoRef} style={{ width: '100%', maxWidth: 300, borderRadius: 10, background: '#000' }} autoPlay playsInline muted />
            <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>Aponte para o código de barras</div>
          </div>
        )}
        <Input label="Descrição" value={data.descricao || ''} onChange={e => upMov('descricao', e.target.value)} />
        <div style={styles.formRow}>
          <Input label="Quantidade" type="number" step="0.001" value={data.quantidade || ''} onChange={e => upMov('quantidade', e.target.value)} />
          <Input label="Unidade" value={data.unidade || 'un'} onChange={e => upMov('unidade', e.target.value)} />
        </div>
        <Input label="Localização" value={data.localizacao || ''} onChange={e => upMov('localizacao', e.target.value)} placeholder="Ex: Depósito A, Sala 3" />
        <Textarea label="Observações" value={data.observacoes || ''} onChange={e => upMov('observacoes', e.target.value)} />
      </>)}
    </Modal>
  );
}
