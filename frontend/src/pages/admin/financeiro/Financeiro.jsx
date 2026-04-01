import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { financeiro } from '../../../api';

// ── Tema ────────────────────────────────────────────────────
const C = {
  bg: '#f3f4f6', card: '#fff', primary: '#7c3aed', primaryBg: '#ede9fe',
  text: '#1a1a2e', text2: '#6b7280', text3: '#9ca3af',
  border: '#e5e7eb', green: '#10b981', greenBg: '#d1fae5',
  red: '#ef4444', redBg: '#fee2e2', amber: '#f59e0b', amberBg: '#fef3c7',
  blue: '#3b82f6', blueBg: '#dbeafe',
};

const TIPO_CONTA = { corrente: 'Corrente', poupanca: 'Poupanca', caixa: 'Caixa', investimento: 'Investimento' };
const TIPO_TRANSACAO = { receita: 'Receita', despesa: 'Despesa', transferencia: 'Transferencia' };

const STATUS_TRANSACAO = {
  pendente: { c: C.amber, bg: C.amberBg, label: 'Pendente' },
  conciliado: { c: C.green, bg: C.greenBg, label: 'Conciliado' },
  cancelado: { c: C.text3, bg: '#f3f4f6', label: 'Cancelado' },
};

const STATUS_PAGAR = {
  pendente: { c: C.amber, bg: C.amberBg, label: 'Pendente' },
  pago: { c: C.green, bg: C.greenBg, label: 'Pago' },
  cancelado: { c: C.text3, bg: '#f3f4f6', label: 'Cancelado' },
  vencido: { c: C.red, bg: C.redBg, label: 'Vencido' },
};

const STATUS_REEMBOLSO = {
  pendente: { c: C.amber, bg: C.amberBg, label: 'Pendente' },
  aprovado: { c: C.green, bg: C.greenBg, label: 'Aprovado' },
  rejeitado: { c: C.red, bg: C.redBg, label: 'Rejeitado' },
  pago: { c: C.blue, bg: C.blueBg, label: 'Pago' },
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
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 },
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
};

// ── Helpers ─────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '\u2014';
const fmtMoney = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '\u2014';

// ── Componentes auxiliares ──────────────────────────────────
function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={styles.modalTitle}>{title}</div>
          <button style={{ ...styles.btn('ghost'), fontSize: 18 }} onClick={onClose}>{'\u2715'}</button>
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

function Badge({ status, map }) {
  const s = map[status] || { c: C.text3, bg: '#f3f4f6', label: status };
  return <span style={styles.badge(s.c, s.bg)}>{s.label}</span>;
}

// ── TABS ────────────────────────────────────────────────────
const TABS = ['Dashboard', 'Contas', 'Transacoes', 'Contas a Pagar', 'Reembolsos'];

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
export default function Financeiro() {
  const { isDiretor } = useAuth();
  const [tab, setTab] = useState(0);
  const [dash, setDash] = useState(null);
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [transacoes, setTransacoes] = useState([]);
  const [contasPagar, setContasPagar] = useState([]);
  const [reembolsos, setReembolsos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtros transacoes
  const [filtroContaId, setFiltroContaId] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroMes, setFiltroMes] = useState('');

  // Filtro contas a pagar
  const [filtroPagarStatus, setFiltroPagarStatus] = useState('');

  // Filtro reembolsos
  const [filtroReembolsoStatus, setFiltroReembolsoStatus] = useState('');

  // Modais
  const [modalConta, setModalConta] = useState(null);
  const [modalTransacao, setModalTransacao] = useState(null);
  const [modalPagar, setModalPagar] = useState(null);
  const [modalReembolso, setModalReembolso] = useState(null);

  // ── Loaders ──
  const loadDash = useCallback(async () => {
    try { setDash(await financeiro.dashboard()); } catch (e) { console.error(e); }
  }, []);

  const loadContas = useCallback(async () => {
    try { setContas(await financeiro.contas.list()); } catch (e) { console.error(e); }
  }, []);

  const loadCategorias = useCallback(async () => {
    try { setCategorias(await financeiro.categorias.list()); } catch (e) { console.error(e); }
  }, []);

  const loadTransacoes = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroContaId) params.conta_id = filtroContaId;
      if (filtroTipo) params.tipo = filtroTipo;
      if (filtroStatus) params.status = filtroStatus;
      if (filtroMes) params.mes = filtroMes;
      setTransacoes(await financeiro.transacoes.list(params));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filtroContaId, filtroTipo, filtroStatus, filtroMes]);

  const loadContasPagar = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroPagarStatus) params.status = filtroPagarStatus;
      setContasPagar(await financeiro.contasPagar.list(params));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filtroPagarStatus]);

  const loadReembolsos = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroReembolsoStatus) params.status = filtroReembolsoStatus;
      setReembolsos(await financeiro.reembolsos.list(params));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filtroReembolsoStatus]);

  useEffect(() => { loadDash(); loadContas(); loadCategorias(); }, [loadDash, loadContas, loadCategorias]);
  useEffect(() => { if (tab === 2) loadTransacoes(); }, [tab, loadTransacoes]);
  useEffect(() => { if (tab === 3) loadContasPagar(); }, [tab, loadContasPagar]);
  useEffect(() => { if (tab === 4) loadReembolsos(); }, [tab, loadReembolsos]);

  // ── Ações ──
  const handleError = (e) => { setError(e.message); setTimeout(() => setError(''), 4000); };

  const saveConta = async (form) => {
    try {
      if (form.id) await financeiro.contas.update(form.id, form);
      else await financeiro.contas.create(form);
      setModalConta(null);
      loadContas();
      loadDash();
    } catch (e) { handleError(e); }
  };

  const deleteConta = async (id) => {
    if (!window.confirm('Deseja excluir esta conta?')) return;
    try { await financeiro.contas.remove(id); loadContas(); loadDash(); } catch (e) { handleError(e); }
  };

  const saveTransacao = async (form) => {
    try {
      if (form.id) await financeiro.transacoes.update(form.id, form);
      else await financeiro.transacoes.create(form);
      setModalTransacao(null);
      loadTransacoes();
      loadDash();
      loadContas();
    } catch (e) { handleError(e); }
  };

  const deleteTransacao = async (id) => {
    if (!window.confirm('Deseja excluir esta transacao?')) return;
    try { await financeiro.transacoes.remove(id); loadTransacoes(); loadDash(); } catch (e) { handleError(e); }
  };

  const savePagar = async (form) => {
    try {
      if (form.id) await financeiro.contasPagar.update(form.id, form);
      else await financeiro.contasPagar.create(form);
      setModalPagar(null);
      loadContasPagar();
      loadDash();
    } catch (e) { handleError(e); }
  };

  const deletePagar = async (id) => {
    if (!window.confirm('Deseja excluir esta conta a pagar?')) return;
    try { await financeiro.contasPagar.remove(id); loadContasPagar(); loadDash(); } catch (e) { handleError(e); }
  };

  const pagarConta = async (item) => {
    try {
      await financeiro.contasPagar.update(item.id, { ...item, status: 'pago', data_pagamento: new Date().toISOString().slice(0, 10) });
      loadContasPagar();
      loadDash();
    } catch (e) { handleError(e); }
  };

  const saveReembolso = async (form) => {
    try {
      await financeiro.reembolsos.create(form);
      setModalReembolso(null);
      loadReembolsos();
      loadDash();
    } catch (e) { handleError(e); }
  };

  const aprovarReembolso = async (id, status) => {
    try { await financeiro.reembolsos.aprovar(id, status); loadReembolsos(); loadDash(); } catch (e) { handleError(e); }
  };

  // ── Render helpers ──
  const renderKpi = (label, value, color, isMoney = false) => (
    <div style={styles.kpi(color)}>
      <div style={styles.kpiValue}>{isMoney ? fmtMoney(value) : (value ?? 0)}</div>
      <div style={styles.kpiLabel}>{label}</div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // TAB: DASHBOARD
  // ═══════════════════════════════════════════════════════════
  const renderDashboard = () => {
    if (!dash) return <div style={styles.empty}>Carregando...</div>;
    return (
      <div style={styles.kpiGrid}>
        {renderKpi('Saldo Total', dash.saldoTotal, C.primary, true)}
        {renderKpi('Contas Ativas', dash.contasAtivas, C.blue)}
        {renderKpi('Receitas do Mes', dash.receitasMes, C.green, true)}
        {renderKpi('Despesas do Mes', dash.despesasMes, C.red, true)}
        {renderKpi('A Pagar Pendentes', dash.contasPagarPendentes, C.amber)}
        {renderKpi('A Pagar Vencidas', dash.contasPagarVencidas, C.red)}
        {renderKpi('Valor a Pagar', dash.valorPagarPendente, C.amber, true)}
        {renderKpi('Reembolsos Pend.', dash.reembolsosPendentes, C.blue)}
        {renderKpi('Valor Reembolsos', dash.valorReembolsosPendentes, C.blue, true)}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // TAB: CONTAS
  // ═══════════════════════════════════════════════════════════
  const renderContas = () => (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>Contas Bancarias</div>
        {isDiretor && (
          <button style={styles.btn('primary')} onClick={() => setModalConta({ nome: '', banco: '', agencia: '', conta: '', tipo: 'corrente', saldo: 0, ativa: true })}>
            + Nova Conta
          </button>
        )}
      </div>
      {contas.length === 0 ? (
        <div style={styles.empty}>Nenhuma conta cadastrada.</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nome</th>
              <th style={styles.th}>Banco</th>
              <th style={styles.th}>Agencia</th>
              <th style={styles.th}>Conta</th>
              <th style={styles.th}>Tipo</th>
              <th style={styles.th}>Saldo</th>
              <th style={styles.th}>Status</th>
              {isDiretor && <th style={styles.th}>Acoes</th>}
            </tr>
          </thead>
          <tbody>
            {contas.map(c => (
              <tr key={c.id}>
                <td style={{ ...styles.td, fontWeight: 600 }}>{c.nome}</td>
                <td style={styles.td}>{c.banco || '\u2014'}</td>
                <td style={styles.td}>{c.agencia || '\u2014'}</td>
                <td style={styles.td}>{c.conta || '\u2014'}</td>
                <td style={styles.td}>{TIPO_CONTA[c.tipo] || c.tipo}</td>
                <td style={{ ...styles.td, fontWeight: 700, color: Number(c.saldo) >= 0 ? C.green : C.red }}>{fmtMoney(c.saldo)}</td>
                <td style={styles.td}>
                  <span style={styles.badge(c.ativa ? C.green : C.text3, c.ativa ? C.greenBg : '#f3f4f6')}>
                    {c.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                {isDiretor && (
                  <td style={styles.td}>
                    <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => setModalConta(c)}>Editar</button>
                    <button style={{ ...styles.btn('ghost'), ...styles.btnSm, color: C.red }} onClick={() => deleteConta(c.id)}>Excluir</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // TAB: TRANSACOES
  // ═══════════════════════════════════════════════════════════
  const renderTransacoes = () => (
    <>
      <div style={styles.filterRow}>
        <select style={styles.select} value={filtroContaId} onChange={e => setFiltroContaId(e.target.value)}>
          <option value="">Todas as contas</option>
          {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select style={styles.select} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          <option value="receita">Receita</option>
          <option value="despesa">Despesa</option>
          <option value="transferencia">Transferencia</option>
        </select>
        <select style={styles.select} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="conciliado">Conciliado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <input style={{ ...styles.select, width: 160 }} type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} />
        {isDiretor && (
          <button style={styles.btn('primary')} onClick={() => setModalTransacao({
            conta_id: '', categoria_id: '', tipo: 'despesa', descricao: '', valor: '', data_competencia: '', data_pagamento: '', status: 'pendente', referencia: '', observacoes: '',
          })}>
            + Nova Transacao
          </button>
        )}
      </div>
      <div style={styles.card}>
        {loading ? (
          <div style={styles.empty}>Carregando...</div>
        ) : transacoes.length === 0 ? (
          <div style={styles.empty}>Nenhuma transacao encontrada.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Data</th>
                <th style={styles.th}>Descricao</th>
                <th style={styles.th}>Conta</th>
                <th style={styles.th}>Categoria</th>
                <th style={styles.th}>Tipo</th>
                <th style={styles.th}>Valor</th>
                <th style={styles.th}>Status</th>
                {isDiretor && <th style={styles.th}>Acoes</th>}
              </tr>
            </thead>
            <tbody>
              {transacoes.map(t => {
                const isReceita = t.tipo === 'receita';
                const isDespesa = t.tipo === 'despesa';
                return (
                  <tr key={t.id}>
                    <td style={styles.td}>{fmtDate(t.data_competencia)}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{t.descricao}</td>
                    <td style={styles.td}>{t.fin_contas?.nome || '\u2014'}</td>
                    <td style={styles.td}>{t.fin_categorias?.nome || '\u2014'}</td>
                    <td style={styles.td}>
                      <span style={styles.badge(
                        isReceita ? C.green : isDespesa ? C.red : C.blue,
                        isReceita ? C.greenBg : isDespesa ? C.redBg : C.blueBg,
                      )}>
                        {TIPO_TRANSACAO[t.tipo] || t.tipo}
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 700, color: isReceita ? C.green : isDespesa ? C.red : C.text }}>
                      {isReceita ? '+ ' : isDespesa ? '- ' : ''}{fmtMoney(t.valor)}
                    </td>
                    <td style={styles.td}><Badge status={t.status} map={STATUS_TRANSACAO} /></td>
                    {isDiretor && (
                      <td style={styles.td}>
                        <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => setModalTransacao(t)}>Editar</button>
                        <button style={{ ...styles.btn('ghost'), ...styles.btnSm, color: C.red }} onClick={() => deleteTransacao(t.id)}>Excluir</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );

  // ═══════════════════════════════════════════════════════════
  // TAB: CONTAS A PAGAR
  // ═══════════════════════════════════════════════════════════
  const renderContasPagar = () => (
    <>
      <div style={styles.filterRow}>
        <select style={styles.select} value={filtroPagarStatus} onChange={e => setFiltroPagarStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="cancelado">Cancelado</option>
          <option value="vencido">Vencido</option>
        </select>
        {isDiretor && (
          <button style={styles.btn('primary')} onClick={() => setModalPagar({
            descricao: '', fornecedor: '', categoria_id: '', valor: '', data_vencimento: '', data_pagamento: '', conta_id: '', status: 'pendente',
          })}>
            + Nova Conta a Pagar
          </button>
        )}
      </div>
      <div style={styles.card}>
        {loading ? (
          <div style={styles.empty}>Carregando...</div>
        ) : contasPagar.length === 0 ? (
          <div style={styles.empty}>Nenhuma conta a pagar encontrada.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Descricao</th>
                <th style={styles.th}>Fornecedor</th>
                <th style={styles.th}>Valor</th>
                <th style={styles.th}>Vencimento</th>
                <th style={styles.th}>Pagamento</th>
                <th style={styles.th}>Status</th>
                {isDiretor && <th style={styles.th}>Acoes</th>}
              </tr>
            </thead>
            <tbody>
              {contasPagar.map(cp => (
                <tr key={cp.id} style={cp.status === 'vencido' ? { background: C.redBg } : {}}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{cp.descricao}</td>
                  <td style={styles.td}>{cp.fornecedor || '\u2014'}</td>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{fmtMoney(cp.valor)}</td>
                  <td style={styles.td}>{fmtDate(cp.data_vencimento)}</td>
                  <td style={styles.td}>{fmtDate(cp.data_pagamento)}</td>
                  <td style={styles.td}><Badge status={cp.status} map={STATUS_PAGAR} /></td>
                  {isDiretor && (
                    <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                      {(cp.status === 'pendente' || cp.status === 'vencido') && (
                        <button style={{ ...styles.btn('success'), ...styles.btnSm, marginRight: 4 }} onClick={() => pagarConta(cp)}>Pagar</button>
                      )}
                      <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => setModalPagar(cp)}>Editar</button>
                      <button style={{ ...styles.btn('ghost'), ...styles.btnSm, color: C.red }} onClick={() => deletePagar(cp.id)}>Excluir</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );

  // ═══════════════════════════════════════════════════════════
  // TAB: REEMBOLSOS
  // ═══════════════════════════════════════════════════════════
  const renderReembolsos = () => (
    <>
      <div style={styles.filterRow}>
        <select style={styles.select} value={filtroReembolsoStatus} onChange={e => setFiltroReembolsoStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="aprovado">Aprovado</option>
          <option value="rejeitado">Rejeitado</option>
          <option value="pago">Pago</option>
        </select>
        <button style={styles.btn('primary')} onClick={() => setModalReembolso({
          descricao: '', valor: '', data_despesa: '', categoria_id: '', observacoes: '',
        })}>
          + Novo Reembolso
        </button>
      </div>
      <div style={styles.card}>
        {loading ? (
          <div style={styles.empty}>Carregando...</div>
        ) : reembolsos.length === 0 ? (
          <div style={styles.empty}>Nenhum reembolso encontrado.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Descricao</th>
                <th style={styles.th}>Valor</th>
                <th style={styles.th}>Data Despesa</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Observacoes</th>
                {isDiretor && <th style={styles.th}>Acoes</th>}
              </tr>
            </thead>
            <tbody>
              {reembolsos.map(r => (
                <tr key={r.id}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{r.descricao}</td>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{fmtMoney(r.valor)}</td>
                  <td style={styles.td}>{fmtDate(r.data_despesa)}</td>
                  <td style={styles.td}><Badge status={r.status} map={STATUS_REEMBOLSO} /></td>
                  <td style={{ ...styles.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.observacoes || '\u2014'}</td>
                  {isDiretor && (
                    <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                      {r.status === 'pendente' && (
                        <>
                          <button style={{ ...styles.btn('success'), ...styles.btnSm, marginRight: 4 }} onClick={() => aprovarReembolso(r.id, 'aprovado')}>Aprovar</button>
                          <button style={{ ...styles.btn('danger'), ...styles.btnSm }} onClick={() => aprovarReembolso(r.id, 'rejeitado')}>Rejeitar</button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );

  // ═══════════════════════════════════════════════════════════
  // MODAIS
  // ═══════════════════════════════════════════════════════════
  const renderModalConta = () => {
    const [form, setForm] = useState(modalConta || {});
    const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
    return (
      <Modal
        open={!!modalConta}
        onClose={() => setModalConta(null)}
        title={form.id ? 'Editar Conta' : 'Nova Conta'}
        footer={
          <>
            <button style={styles.btn('secondary')} onClick={() => setModalConta(null)}>Cancelar</button>
            <button style={styles.btn('primary')} onClick={() => saveConta(form)}>Salvar</button>
          </>
        }
      >
        <Input label="Nome" value={form.nome || ''} onChange={e => upd('nome', e.target.value)} />
        <div style={styles.formRow}>
          <Input label="Banco" value={form.banco || ''} onChange={e => upd('banco', e.target.value)} />
          <Input label="Agencia" value={form.agencia || ''} onChange={e => upd('agencia', e.target.value)} />
        </div>
        <div style={styles.formRow}>
          <Input label="Conta" value={form.conta || ''} onChange={e => upd('conta', e.target.value)} />
          <Select label="Tipo" value={form.tipo || 'corrente'} onChange={e => upd('tipo', e.target.value)}>
            {Object.entries(TIPO_CONTA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        <Input label="Saldo Inicial" type="number" step="0.01" value={form.saldo ?? ''} onChange={e => upd('saldo', e.target.value)} />
        <Select label="Status" value={form.ativa === false ? 'false' : 'true'} onChange={e => upd('ativa', e.target.value === 'true')}>
          <option value="true">Ativa</option>
          <option value="false">Inativa</option>
        </Select>
      </Modal>
    );
  };

  const renderModalTransacao = () => {
    const [form, setForm] = useState(modalTransacao || {});
    const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const catsFiltradas = categorias.filter(c => !form.tipo || form.tipo === 'transferencia' || c.tipo === form.tipo);
    return (
      <Modal
        open={!!modalTransacao}
        onClose={() => setModalTransacao(null)}
        title={form.id ? 'Editar Transacao' : 'Nova Transacao'}
        footer={
          <>
            <button style={styles.btn('secondary')} onClick={() => setModalTransacao(null)}>Cancelar</button>
            <button style={styles.btn('primary')} onClick={() => saveTransacao(form)}>Salvar</button>
          </>
        }
      >
        <Input label="Descricao" value={form.descricao || ''} onChange={e => upd('descricao', e.target.value)} />
        <div style={styles.formRow}>
          <Select label="Conta" value={form.conta_id || ''} onChange={e => upd('conta_id', e.target.value)}>
            <option value="">Selecione...</option>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <Select label="Tipo" value={form.tipo || 'despesa'} onChange={e => upd('tipo', e.target.value)}>
            {Object.entries(TIPO_TRANSACAO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        <div style={styles.formRow}>
          <Select label="Categoria" value={form.categoria_id || ''} onChange={e => upd('categoria_id', e.target.value)}>
            <option value="">Selecione...</option>
            {catsFiltradas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <Input label="Valor (R$)" type="number" step="0.01" value={form.valor ?? ''} onChange={e => upd('valor', e.target.value)} />
        </div>
        <div style={styles.formRow}>
          <Input label="Data Competencia" type="date" value={form.data_competencia || ''} onChange={e => upd('data_competencia', e.target.value)} />
          <Input label="Data Pagamento" type="date" value={form.data_pagamento || ''} onChange={e => upd('data_pagamento', e.target.value)} />
        </div>
        <div style={styles.formRow}>
          <Select label="Status" value={form.status || 'pendente'} onChange={e => upd('status', e.target.value)}>
            <option value="pendente">Pendente</option>
            <option value="conciliado">Conciliado</option>
            <option value="cancelado">Cancelado</option>
          </Select>
          <Input label="Referencia" value={form.referencia || ''} onChange={e => upd('referencia', e.target.value)} />
        </div>
        <Input label="Observacoes" value={form.observacoes || ''} onChange={e => upd('observacoes', e.target.value)} />
      </Modal>
    );
  };

  const renderModalPagar = () => {
    const [form, setForm] = useState(modalPagar || {});
    const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
    return (
      <Modal
        open={!!modalPagar}
        onClose={() => setModalPagar(null)}
        title={form.id ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
        footer={
          <>
            <button style={styles.btn('secondary')} onClick={() => setModalPagar(null)}>Cancelar</button>
            <button style={styles.btn('primary')} onClick={() => savePagar(form)}>Salvar</button>
          </>
        }
      >
        <Input label="Descricao" value={form.descricao || ''} onChange={e => upd('descricao', e.target.value)} />
        <div style={styles.formRow}>
          <Input label="Fornecedor" value={form.fornecedor || ''} onChange={e => upd('fornecedor', e.target.value)} />
          <Input label="Valor (R$)" type="number" step="0.01" value={form.valor ?? ''} onChange={e => upd('valor', e.target.value)} />
        </div>
        <div style={styles.formRow}>
          <Select label="Categoria" value={form.categoria_id || ''} onChange={e => upd('categoria_id', e.target.value)}>
            <option value="">Selecione...</option>
            {categorias.filter(c => c.tipo === 'despesa').map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <Select label="Conta Pagamento" value={form.conta_id || ''} onChange={e => upd('conta_id', e.target.value)}>
            <option value="">Selecione...</option>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </div>
        <div style={styles.formRow}>
          <Input label="Data Vencimento" type="date" value={form.data_vencimento || ''} onChange={e => upd('data_vencimento', e.target.value)} />
          <Input label="Data Pagamento" type="date" value={form.data_pagamento || ''} onChange={e => upd('data_pagamento', e.target.value)} />
        </div>
        <Select label="Status" value={form.status || 'pendente'} onChange={e => upd('status', e.target.value)}>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="cancelado">Cancelado</option>
          <option value="vencido">Vencido</option>
        </Select>
      </Modal>
    );
  };

  const renderModalReembolso = () => {
    const [form, setForm] = useState(modalReembolso || {});
    const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
    return (
      <Modal
        open={!!modalReembolso}
        onClose={() => setModalReembolso(null)}
        title="Novo Reembolso"
        footer={
          <>
            <button style={styles.btn('secondary')} onClick={() => setModalReembolso(null)}>Cancelar</button>
            <button style={styles.btn('primary')} onClick={() => saveReembolso(form)}>Solicitar</button>
          </>
        }
      >
        <Input label="Descricao" value={form.descricao || ''} onChange={e => upd('descricao', e.target.value)} />
        <div style={styles.formRow}>
          <Input label="Valor (R$)" type="number" step="0.01" value={form.valor ?? ''} onChange={e => upd('valor', e.target.value)} />
          <Input label="Data da Despesa" type="date" value={form.data_despesa || ''} onChange={e => upd('data_despesa', e.target.value)} />
        </div>
        <Select label="Categoria" value={form.categoria_id || ''} onChange={e => upd('categoria_id', e.target.value)}>
          <option value="">Selecione...</option>
          {categorias.filter(c => c.tipo === 'despesa').map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
        <Input label="Observacoes" value={form.observacoes || ''} onChange={e => upd('observacoes', e.target.value)} />
      </Modal>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER PRINCIPAL
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Financeiro</div>
          <div style={styles.subtitle}>Gestao financeira da igreja</div>
        </div>
      </div>

      {error && (
        <div style={{ background: C.redBg, color: C.red, padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div style={styles.tabs}>
        {TABS.map((t, i) => (
          <button key={t} style={styles.tab(tab === i)} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {tab === 0 && renderDashboard()}
      {tab === 1 && renderContas()}
      {tab === 2 && renderTransacoes()}
      {tab === 3 && renderContasPagar()}
      {tab === 4 && renderReembolsos()}

      {modalConta && renderModalConta()}
      {modalTransacao && renderModalTransacao()}
      {modalPagar && renderModalPagar()}
      {modalReembolso && renderModalReembolso()}
    </div>
  );
}
