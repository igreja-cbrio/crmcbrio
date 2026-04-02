import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { events, cycles as cyclesApi } from '../../api';

// ── Tema ────────────────────────────────────────────────────
const C = {
  bg: '#0a0a0a', card: '#161616', primary: '#00B39D', primaryBg: '#00B39D18',
  text: '#e5e5e5', text2: '#a3a3a3', text3: '#737373',
  border: '#262626', green: '#10b981', greenBg: '#10b98118',
  red: '#ef4444', redBg: '#ef444418', amber: '#f59e0b', amberBg: '#f59e0b18',
  blue: '#3b82f6', blueBg: '#3b82f618',
};

const STATUS_MAP = {
  'no-prazo': { c: C.green, bg: C.greenBg, label: 'No Prazo' },
  'atencao': { c: C.amber, bg: C.amberBg, label: 'Atenção' },
  'atrasado': { c: C.red, bg: C.redBg, label: 'Atrasado' },
  'concluido': { c: C.blue, bg: C.blueBg, label: 'Concluído' },
};

const TASK_STATUS_MAP = {
  'pendente': { c: C.text3, bg: '#73737318', label: 'Pendente' },
  'em-andamento': { c: C.blue, bg: C.blueBg, label: 'Em Andamento' },
  'concluida': { c: C.green, bg: C.greenBg, label: 'Concluída' },
  'atrasada': { c: C.red, bg: C.redBg, label: 'Atrasada' },
};

const PRIORITY_MAP = {
  'alta': { c: C.red, bg: C.redBg, label: 'Alta' },
  'media': { c: C.amber, bg: C.amberBg, label: 'Média' },
  'baixa': { c: C.green, bg: C.greenBg, label: 'Baixa' },
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
  th: { padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left', borderBottom: `1px solid ${C.border}`, background: '#1e1e1e' },

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
    outline: 'none', width: '100%', transition: 'border 0.15s', background: '#1e1e1e', color: '#e5e5e5',
  },
  select: { padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, background: '#1e1e1e', color: '#e5e5e5', outline: 'none' },
  label: { fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 },
  formGroup: { marginBottom: 14 },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 60, zIndex: 1000 },
  modal: { background: '#1a1a1a', borderRadius: 16, width: '95%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalHeader: { padding: '20px 24px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: C.text },
  modalBody: { padding: '16px 24px 24px' },
  modalFooter: { padding: '12px 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' },
  empty: { textAlign: 'center', padding: 40, color: C.text3, fontSize: 14 },
  clickRow: { cursor: 'pointer', transition: 'background 0.1s' },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12, marginTop: 24 },
  taskCard: {
    background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: '14px 18px',
    marginBottom: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  subtaskRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13, color: C.text },
  commentBox: { background: '#1e1e1e', borderRadius: 8, padding: '8px 12px', marginTop: 6, fontSize: 12, color: C.text2 },
  dot: (color) => ({ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 6 }),
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', color: C.primary, fontWeight: 600, fontSize: 13, padding: 0, marginBottom: 16 },
  inlineInput: { padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, outline: 'none', flex: 1 },
  inlineBtn: { padding: '4px 10px', borderRadius: 6, border: 'none', background: C.primary, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
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
      <textarea style={{ ...styles.input, minHeight: 60, resize: 'vertical' }} {...props} />
    </div>
  );
}

function Badge({ status, map }) {
  const s = map[status] || { c: C.text3, bg: '#73737318', label: status || '—' };
  return <span style={styles.badge(s.c, s.bg)}>{s.label}</span>;
}

// ── TABS ────────────────────────────────────────────────────
const TABS = ['Lista', 'Detalhes'];

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
export default function Eventos() {
  const { isDiretor } = useAuth();
  const [tab, setTab] = useState(0);
  const [eventList, setEventList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dash, setDash] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  // Modais
  const [modalEvent, setModalEvent] = useState(null);
  const [modalTask, setModalTask] = useState(null);

  // Inline inputs
  const [newSubtask, setNewSubtask] = useState({});
  const [newComment, setNewComment] = useState({});

  // ── Loaders ──
  const loadCategories = useCallback(async () => {
    try { setCategories(await events.categories()); } catch (e) { console.error(e); }
  }, []);

  const loadDash = useCallback(async () => {
    try { setDash(await events.dashboard()); } catch (e) { console.error(e); }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroStatus) params.status = filtroStatus;
      if (filtroCategoria) params.category_id = filtroCategoria;
      setEventList(await events.list(params));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filtroStatus, filtroCategoria]);

  const loadDetail = useCallback(async (id) => {
    try {
      setLoading(true);
      const ev = await events.get(id);
      setSelectedEvent(ev);
      setTab(1);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const refreshDetail = useCallback(async () => {
    if (selectedEvent?.id) {
      try {
        setSelectedEvent(await events.get(selectedEvent.id));
      } catch (e) { console.error(e); }
    }
  }, [selectedEvent?.id]);

  useEffect(() => { loadCategories(); loadDash(); loadEvents(); }, []);
  useEffect(() => { loadEvents(); }, [filtroStatus, filtroCategoria]);

  // ── Event CRUD ──
  async function saveEvent(data) {
    try {
      if (data.id) {
        await events.update(data.id, data);
      } else {
        await events.create(data);
      }
      setModalEvent(null);
      loadEvents();
      loadDash();
      if (data.id && selectedEvent?.id === data.id) refreshDetail();
    } catch (e) { setError(e.message); }
  }

  async function deleteEvent(id) {
    if (!window.confirm('Excluir este evento?')) return;
    try {
      await events.remove(id);
      setSelectedEvent(null);
      setTab(0);
      loadEvents();
      loadDash();
    } catch (e) { setError(e.message); }
  }

  // ── Task CRUD ──
  async function saveTask(data) {
    try {
      if (data.id) {
        await events.updateTask(data.id, data);
      } else {
        await events.createTask(selectedEvent.id, data);
      }
      setModalTask(null);
      refreshDetail();
    } catch (e) { setError(e.message); }
  }

  async function deleteTask(taskId) {
    if (!window.confirm('Excluir esta tarefa?')) return;
    try {
      await events.removeTask(taskId);
      refreshDetail();
    } catch (e) { setError(e.message); }
  }

  async function changeTaskStatus(taskId, status) {
    try {
      await events.updateTaskStatus(taskId, status);
      refreshDetail();
    } catch (e) { setError(e.message); }
  }

  // ── Subtask ──
  async function addSubtask(taskId) {
    const name = (newSubtask[taskId] || '').trim();
    if (!name) return;
    try {
      await events.createSubtask(taskId, { name });
      setNewSubtask(prev => ({ ...prev, [taskId]: '' }));
      refreshDetail();
    } catch (e) { setError(e.message); }
  }

  async function toggleSubtask(subId, done) {
    try {
      await events.toggleSubtask(subId, done);
      refreshDetail();
    } catch (e) { setError(e.message); }
  }

  async function deleteSubtask(subId) {
    try {
      await events.removeSubtask(subId);
      refreshDetail();
    } catch (e) { setError(e.message); }
  }

  // ── Comment ──
  async function addComment(taskId) {
    const text = (newComment[taskId] || '').trim();
    if (!text) return;
    try {
      await events.addComment(taskId, text);
      setNewComment(prev => ({ ...prev, [taskId]: '' }));
      refreshDetail();
    } catch (e) { setError(e.message); }
  }

  // ── Category helpers ──
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });
  const getCatColor = (catId) => catMap[catId]?.color || C.text3;
  const getCatName = (catId) => catMap[catId]?.name || '—';

  // ── Dashboard KPIs ──
  const kpis = dash ? [
    { label: 'Total', value: dash.total || 0, color: C.primary },
    { label: 'No Prazo', value: dash.no_prazo || 0, color: C.green },
    { label: 'Atenção', value: dash.atencao || 0, color: C.amber },
    { label: 'Atrasados', value: dash.atrasado || 0, color: C.red },
    { label: 'Concluídos', value: dash.concluido || 0, color: C.blue },
  ] : [];

  // ═══════════════════════════════════════════════════════════
  // RENDER — LISTA
  // ═══════════════════════════════════════════════════════════
  function renderList() {
    return (
      <>
        {/* KPIs */}
        {kpis.length > 0 && (
          <div style={styles.kpiGrid}>
            {kpis.map(k => (
              <div key={k.label} style={styles.kpi(k.color)}>
                <div style={styles.kpiValue}>{k.value}</div>
                <div style={styles.kpiLabel}>{k.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div style={styles.filterRow}>
          <select style={styles.select} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select style={styles.select} value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Tabela */}
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nome</th>
                <th style={styles.th}>Data</th>
                <th style={styles.th}>Categoria</th>
                <th style={styles.th}>Responsável</th>
                <th style={styles.th}>Orçamento</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {eventList.length === 0 && (
                <tr><td colSpan={6} style={styles.empty}>
                  {loading ? 'Carregando...' : 'Nenhum evento encontrado.'}
                </td></tr>
              )}
              {eventList.map(ev => (
                <tr key={ev.id} style={styles.clickRow}
                  onClick={() => loadDetail(ev.id)}
                  onMouseEnter={e => e.currentTarget.style.background = '#1e1e1e'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ ...styles.td, fontWeight: 600 }}>{ev.name}</td>
                  <td style={styles.td}>{fmtDate(ev.date)}</td>
                  <td style={styles.td}>
                    <span style={styles.dot(getCatColor(ev.category_id))} />
                    {getCatName(ev.category_id)}
                  </td>
                  <td style={styles.td}>{ev.responsible || '—'}</td>
                  <td style={styles.td}>{fmtMoney(ev.budget_planned)}</td>
                  <td style={styles.td}><Badge status={ev.status} map={STATUS_MAP} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — DETALHES
  // ═══════════════════════════════════════════════════════════
  function renderDetail() {
    if (!selectedEvent) return <div style={styles.empty}>Selecione um evento na lista.</div>;
    const ev = selectedEvent;
    const taskList = ev.tasks || [];
    const occurrences = ev.occurrences || [];
    const meetingsList = ev.meetings || [];

    return (
      <>
        <button style={styles.backBtn} onClick={() => { setTab(0); setSelectedEvent(null); }}>
          ← Voltar para lista
        </button>

        {/* Info card */}
        <div style={{ ...styles.card, marginBottom: 20 }}>
          <div style={styles.cardHeader}>
            <div>
              <div style={styles.cardTitle}>{ev.name}</div>
              <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                <span style={styles.dot(getCatColor(ev.category_id))} />
                {getCatName(ev.category_id)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Badge status={ev.status} map={STATUS_MAP} />
              {isDiretor && (
                <>
                  <button style={{ ...styles.btn('secondary'), ...styles.btnSm }} onClick={() => setModalEvent(ev)}>Editar</button>
                  <button style={{ ...styles.btn('danger'), ...styles.btnSm }} onClick={() => deleteEvent(ev.id)}>Excluir</button>
                </>
              )}
            </div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={styles.formRow}>
              <div><span style={styles.label}>Data</span><div style={{ fontSize: 13, marginTop: 2 }}>{fmtDate(ev.date)}</div></div>
              <div><span style={styles.label}>Local</span><div style={{ fontSize: 13, marginTop: 2 }}>{ev.location || '—'}</div></div>
            </div>
            <div style={{ ...styles.formRow, marginTop: 12 }}>
              <div><span style={styles.label}>Responsável</span><div style={{ fontSize: 13, marginTop: 2 }}>{ev.responsible || '—'}</div></div>
              <div><span style={styles.label}>Público esperado</span><div style={{ fontSize: 13, marginTop: 2 }}>{ev.expected_attendance || '—'}</div></div>
            </div>
            <div style={{ ...styles.formRow, marginTop: 12 }}>
              <div><span style={styles.label}>Orçamento Previsto</span><div style={{ fontSize: 13, marginTop: 2 }}>{fmtMoney(ev.budget_planned)}</div></div>
              <div><span style={styles.label}>Orçamento Gasto</span><div style={{ fontSize: 13, marginTop: 2 }}>{fmtMoney(ev.budget_spent)}</div></div>
            </div>
            {ev.description && (
              <div style={{ marginTop: 12 }}>
                <span style={styles.label}>Descrição</span>
                <div style={{ fontSize: 13, marginTop: 2, color: C.text2 }}>{ev.description}</div>
              </div>
            )}
            {ev.notes && (
              <div style={{ marginTop: 12 }}>
                <span style={styles.label}>Observações</span>
                <div style={{ fontSize: 13, marginTop: 2, color: C.text2 }}>{ev.notes}</div>
              </div>
            )}
            {ev.lessons_learned && (
              <div style={{ marginTop: 12 }}>
                <span style={styles.label}>Lições Aprendidas</span>
                <div style={{ fontSize: 13, marginTop: 2, color: C.text2 }}>{ev.lessons_learned}</div>
              </div>
            )}
          </div>
        </div>

        {/* Ocorrências */}
        {occurrences.length > 0 && (
          <>
            <div style={styles.sectionTitle}>Ocorrências ({occurrences.length})</div>
            <div style={styles.card}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Data</th>
                    <th style={styles.th}>Público Real</th>
                    <th style={styles.th}>Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {occurrences.map(occ => (
                    <tr key={occ.id}>
                      <td style={styles.td}>{fmtDate(occ.date)}</td>
                      <td style={styles.td}>{occ.actual_attendance ?? '—'}</td>
                      <td style={styles.td}>{occ.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Tarefas */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
          <div style={{ ...styles.sectionTitle, margin: 0 }}>Tarefas ({taskList.length})</div>
          {isDiretor && (
            <button style={{ ...styles.btn('primary'), ...styles.btnSm }} onClick={() => setModalTask({})}>+ Tarefa</button>
          )}
        </div>

        {taskList.length === 0 && <div style={styles.empty}>Nenhuma tarefa cadastrada.</div>}
        {taskList.map(task => (
          <div key={task.id} style={styles.taskCard}>
            {/* Task header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>
                  {task.is_milestone && <span style={{ color: C.amber, marginRight: 4 }}>★</span>}
                  {task.name}
                </div>
                <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                  {task.responsible && <span style={{ marginRight: 12 }}>{task.responsible}</span>}
                  {task.area && <span style={{ marginRight: 12 }}>• {task.area}</span>}
                  {task.deadline && <span>• Prazo: {fmtDate(task.deadline)}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                {task.priority && <Badge status={task.priority} map={PRIORITY_MAP} />}
                <Badge status={task.status} map={TASK_STATUS_MAP} />
                {isDiretor && (
                  <>
                    <select
                      style={{ ...styles.select, padding: '2px 6px', fontSize: 11 }}
                      value={task.status}
                      onChange={e => changeTaskStatus(task.id, e.target.value)}
                    >
                      {Object.entries(TASK_STATUS_MAP).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                    <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => setModalTask(task)}>Editar</button>
                    <button style={{ ...styles.btn('ghost'), ...styles.btnSm, color: C.red }} onClick={() => deleteTask(task.id)}>✕</button>
                  </>
                )}
              </div>
            </div>

            {task.description && (
              <div style={{ fontSize: 12, color: C.text2, marginTop: 6 }}>{task.description}</div>
            )}

            {/* Subtasks */}
            {(task.subtasks || []).length > 0 && (
              <div style={{ marginTop: 10, paddingLeft: 4 }}>
                {task.subtasks.map(sub => (
                  <div key={sub.id} style={styles.subtaskRow}>
                    <input
                      type="checkbox"
                      checked={!!sub.done}
                      onChange={() => toggleSubtask(sub.id, !sub.done)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={sub.done ? { textDecoration: 'line-through', color: C.text3 } : {}}>
                      {sub.name}
                    </span>
                    {isDiretor && (
                      <button
                        style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', fontSize: 11, padding: '0 4px' }}
                        onClick={() => deleteSubtask(sub.id)}
                      >✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add subtask inline */}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input
                style={styles.inlineInput}
                placeholder="Nova subtarefa..."
                value={newSubtask[task.id] || ''}
                onChange={e => setNewSubtask(prev => ({ ...prev, [task.id]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addSubtask(task.id)}
              />
              <button style={styles.inlineBtn} onClick={() => addSubtask(task.id)}>+</button>
            </div>

            {/* Comments */}
            {(task.comments || []).length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 4 }}>Comentários</div>
                {task.comments.map(c => (
                  <div key={c.id} style={styles.commentBox}>
                    <div style={{ fontWeight: 600, fontSize: 11, color: C.text }}>{c.author || 'Anônimo'}</div>
                    <div style={{ marginTop: 2 }}>{c.text}</div>
                    <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{c.created_at ? new Date(c.created_at).toLocaleString('pt-BR') : ''}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Add comment inline */}
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input
                style={styles.inlineInput}
                placeholder="Adicionar comentário..."
                value={newComment[task.id] || ''}
                onChange={e => setNewComment(prev => ({ ...prev, [task.id]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addComment(task.id)}
              />
              <button style={styles.inlineBtn} onClick={() => addComment(task.id)}>Enviar</button>
            </div>
          </div>
        ))}

        {/* Reuniões */}
        {meetingsList.length > 0 && (
          <>
            <div style={styles.sectionTitle}>Reuniões ({meetingsList.length})</div>
            <div style={styles.card}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Data</th>
                    <th style={styles.th}>Título</th>
                    <th style={styles.th}>Pendências</th>
                  </tr>
                </thead>
                <tbody>
                  {meetingsList.map(m => (
                    <tr key={m.id}>
                      <td style={styles.td}>{fmtDate(m.date)}</td>
                      <td style={styles.td}>{m.title || '—'}</td>
                      <td style={styles.td}>
                        {(m.pendencies || []).length === 0 ? '—' : (
                          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                            {m.pendencies.map(p => (
                              <li key={p.id} style={p.done ? { textDecoration: 'line-through', color: C.text3 } : {}}>
                                {p.text} {p.responsible ? `(${p.responsible})` : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // MODAL — EVENTO
  // ═══════════════════════════════════════════════════════════
  function renderEventModal() {
    const isEdit = modalEvent && modalEvent.id;
    return (
      <Modal
        open={!!modalEvent}
        onClose={() => setModalEvent(null)}
        title={isEdit ? 'Editar Evento' : 'Novo Evento'}
        footer={
          <>
            <button style={styles.btn('ghost')} onClick={() => setModalEvent(null)}>Cancelar</button>
            <button style={styles.btn('primary')} onClick={() => {
              const f = document.getElementById('event-form');
              const fd = new FormData(f);
              const data = Object.fromEntries(fd.entries());
              if (data.budget_planned) data.budget_planned = parseFloat(data.budget_planned);
              if (data.budget_spent) data.budget_spent = parseFloat(data.budget_spent);
              if (data.expected_attendance) data.expected_attendance = parseInt(data.expected_attendance);
              if (data.actual_attendance) data.actual_attendance = parseInt(data.actual_attendance);
              if (isEdit) data.id = modalEvent.id;
              saveEvent(data);
            }}>Salvar</button>
          </>
        }
      >
        <form id="event-form" onSubmit={e => e.preventDefault()}>
          <Input label="Nome" name="name" defaultValue={modalEvent?.name || ''} required />
          <div style={styles.formRow}>
            <Input label="Data" name="date" type="date" defaultValue={modalEvent?.date || ''} />
            <Select label="Categoria" name="category_id" defaultValue={modalEvent?.category_id || ''}>
              <option value="">Selecione...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div style={styles.formRow}>
            <Input label="Local" name="location" defaultValue={modalEvent?.location || ''} />
            <Input label="Responsável" name="responsible" defaultValue={modalEvent?.responsible || ''} />
          </div>
          <div style={styles.formRow}>
            <Input label="Orçamento Previsto" name="budget_planned" type="number" step="0.01" defaultValue={modalEvent?.budget_planned || ''} />
            {isEdit && <Input label="Orçamento Gasto" name="budget_spent" type="number" step="0.01" defaultValue={modalEvent?.budget_spent || ''} />}
          </div>
          <div style={styles.formRow}>
            <Input label="Público Esperado" name="expected_attendance" type="number" defaultValue={modalEvent?.expected_attendance || ''} />
            {isEdit && <Input label="Público Real" name="actual_attendance" type="number" defaultValue={modalEvent?.actual_attendance || ''} />}
          </div>
          <Select label="Recorrência" name="recurrence" defaultValue={modalEvent?.recurrence || ''}>
            <option value="">Nenhuma</option>
            <option value="semanal">Semanal</option>
            <option value="quinzenal">Quinzenal</option>
            <option value="mensal">Mensal</option>
            <option value="anual">Anual</option>
          </Select>
          {isEdit && (
            <Select label="Status" name="status" defaultValue={modalEvent?.status || 'no-prazo'}>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          )}
          <Textarea label="Descrição" name="description" defaultValue={modalEvent?.description || ''} />
          <Textarea label="Observações" name="notes" defaultValue={modalEvent?.notes || ''} />
          {isEdit && <Textarea label="Lições Aprendidas" name="lessons_learned" defaultValue={modalEvent?.lessons_learned || ''} />}
        </form>
      </Modal>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // MODAL — TAREFA
  // ═══════════════════════════════════════════════════════════
  function renderTaskModal() {
    const isEdit = modalTask && modalTask.id;
    return (
      <Modal
        open={!!modalTask}
        onClose={() => setModalTask(null)}
        title={isEdit ? 'Editar Tarefa' : 'Nova Tarefa'}
        footer={
          <>
            <button style={styles.btn('ghost')} onClick={() => setModalTask(null)}>Cancelar</button>
            <button style={styles.btn('primary')} onClick={() => {
              const f = document.getElementById('task-form');
              const fd = new FormData(f);
              const data = Object.fromEntries(fd.entries());
              data.is_milestone = data.is_milestone === 'true';
              if (isEdit) data.id = modalTask.id;
              saveTask(data);
            }}>Salvar</button>
          </>
        }
      >
        <form id="task-form" onSubmit={e => e.preventDefault()}>
          <Input label="Nome" name="name" defaultValue={modalTask?.name || ''} required />
          <div style={styles.formRow}>
            <Input label="Responsável" name="responsible" defaultValue={modalTask?.responsible || ''} />
            <Input label="Área" name="area" defaultValue={modalTask?.area || ''} />
          </div>
          <div style={styles.formRow}>
            <Input label="Data Início" name="start_date" type="date" defaultValue={modalTask?.start_date || ''} />
            <Input label="Prazo" name="deadline" type="date" defaultValue={modalTask?.deadline || ''} />
          </div>
          <div style={styles.formRow}>
            <Select label="Status" name="status" defaultValue={modalTask?.status || 'pendente'}>
              {Object.entries(TASK_STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
            <Select label="Prioridade" name="priority" defaultValue={modalTask?.priority || 'media'}>
              {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </div>
          <Select label="Marco (Milestone)" name="is_milestone" defaultValue={modalTask?.is_milestone ? 'true' : 'false'}>
            <option value="false">Não</option>
            <option value="true">Sim</option>
          </Select>
          <Textarea label="Descrição" name="description" defaultValue={modalTask?.description || ''} />
        </form>
      </Modal>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER PRINCIPAL
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Eventos</div>
          <div style={styles.subtitle}>Gestão de eventos da igreja</div>
        </div>
        {isDiretor && tab === 0 && (
          <button style={styles.btn('primary')} onClick={() => setModalEvent({})}>+ Novo Evento</button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ ...styles.badge(C.red, C.redBg), padding: '8px 14px', marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button style={{ ...styles.btn('ghost'), ...styles.btnSm, color: C.red }} onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button style={styles.tab(tab === 0)} onClick={() => setTab(0)}>Lista</button>
        {selectedEvent && <button style={styles.tab(tab === 1)} onClick={() => setTab(1)}>Detalhes</button>}
      </div>

      {/* Content */}
      {tab === 0 && renderList()}
      {tab === 1 && renderDetail()}

      {/* Modals */}
      {renderEventModal()}
      {renderTaskModal()}
    </div>
  );
}
