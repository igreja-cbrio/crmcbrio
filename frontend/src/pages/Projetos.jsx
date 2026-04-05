import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { projects, users as usersApi } from '../api';

// ── Tema (CSS vars para dark/light mode) ──────────────────
const C = {
  bg: 'var(--cbrio-bg)', card: 'var(--cbrio-card)', text: 'var(--cbrio-text)',
  t2: 'var(--cbrio-text2)', t3: 'var(--cbrio-text3)', border: 'var(--cbrio-border)',
  primary: '#7c3aed', primaryBg: '#ede9fe',
  green: '#10b981', greenBg: '#d1fae5', red: '#ef4444', redBg: '#fee2e2',
  amber: '#f59e0b', amberBg: '#fef3c7', blue: '#3b82f6', blueBg: '#dbeafe',
};

const STATUS_MAP = {
  'no-prazo': { c: C.green, bg: C.greenBg, label: 'No Prazo' },
  'em-risco': { c: C.amber, bg: C.amberBg, label: 'Em Risco' },
  'atrasado': { c: C.red, bg: C.redBg, label: 'Atrasado' },
  'concluido': { c: C.blue, bg: C.blueBg, label: 'Concluido' },
};

const TASK_STATUS_MAP = {
  'pendente': { c: C.t3, bg: 'var(--cbrio-bg)', label: 'Pendente' },
  'em-andamento': { c: C.blue, bg: C.blueBg, label: 'Em Andamento' },
  'concluida': { c: C.green, bg: C.greenBg, label: 'Concluida' },
  'bloqueada': { c: C.red, bg: C.redBg, label: 'Bloqueada' },
};

const PHASE_STATUS_MAP = {
  'pendente': { c: C.t3, bg: 'var(--cbrio-bg)', label: 'Pendente' },
  'em-andamento': { c: C.blue, bg: C.blueBg, label: 'Em Andamento' },
  'concluida': { c: C.green, bg: C.greenBg, label: 'Concluida' },
  'bloqueada': { c: C.red, bg: C.redBg, label: 'Bloqueada' },
};

const PRIORITY_MAP = {
  'alta': { c: C.red, bg: C.redBg, label: 'Alta' },
  'media': { c: C.amber, bg: C.amberBg, label: 'Media' },
  'baixa': { c: C.green, bg: C.greenBg, label: 'Baixa' },
};

const COMPLEXITY_MAP = {
  'baixa': 'Baixa', 'media': 'Media', 'alta': 'Alta',
};
const IMPACT_MAP = {
  'baixo': 'Baixo', 'medio': 'Medio', 'alto': 'Alto',
};

const BUDGET_CATEGORIES = [
  { value: 'investimento', label: 'Investimento' },
  { value: 'receita', label: 'Receita' },
  { value: 'custo', label: 'Custo' },
];

const PHASE_NAMES = ['Planejamento', 'Preparacao', 'Execucao', 'Avaliacao'];

// ── Estilos ─────────────────────────────────────────────────
const styles = {
  page: { maxWidth: 1400, margin: '0 auto', padding: '0 24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.t2, marginTop: 2 },
  tabs: { display: 'flex', gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 24 },
  tab: (a) => ({
    padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none',
    color: a ? C.primary : C.t2, borderBottom: a ? `2px solid ${C.primary}` : '2px solid transparent',
    marginBottom: -2, transition: 'all 0.15s',
  }),
  card: { background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' },
  cardHeader: { padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: 700, color: C.text },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left', borderBottom: `1px solid ${C.border}`, background: 'var(--cbrio-table-header, #fafafa)' },
  td: { padding: '12px 16px', fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}` },
  badge: (color, bg) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color, background: bg }),
  btn: (v = 'primary') => ({
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
    ...(v === 'primary' ? { background: C.primary, color: '#fff' } : {}),
    ...(v === 'secondary' ? { background: 'transparent', color: C.primary, border: `1px solid ${C.primary}` } : {}),
    ...(v === 'danger' ? { background: C.red, color: '#fff' } : {}),
    ...(v === 'ghost' ? { background: 'transparent', color: C.t2, padding: '6px 12px' } : {}),
  }),
  btnSm: { padding: '4px 10px', fontSize: 11 },
  filterRow: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  input: { padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', width: '100%', background: 'var(--cbrio-input-bg, #fff)', color: C.text },
  select: { padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, background: 'var(--cbrio-input-bg, #fff)', color: C.text, outline: 'none' },
  label: { fontSize: 11, fontWeight: 600, color: C.t2, marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 },
  formGroup: { marginBottom: 14 },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  overlay: { position: 'fixed', inset: 0, background: 'var(--cbrio-overlay, rgba(0,0,0,0.5))', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 60, zIndex: 1000 },
  modal: { background: 'var(--cbrio-modal-bg, #fff)', borderRadius: 16, width: '95%', maxWidth: 620, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalHeader: { padding: '20px 24px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: C.text },
  modalBody: { padding: '16px 24px 24px' },
  modalFooter: { padding: '12px 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' },
  empty: { textAlign: 'center', padding: 40, color: C.t3, fontSize: 14 },
  clickRow: { cursor: 'pointer', transition: 'background 0.1s' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 },
  infoLabel: { fontSize: 11, fontWeight: 600, color: C.t3, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: 500, color: C.text, marginTop: 2 },
  progress: { height: 8, borderRadius: 4, background: C.border, overflow: 'hidden', flex: 1 },
  progressBar: (pct, color) => ({ height: '100%', borderRadius: 4, background: color || (pct >= 100 ? C.green : C.primary), width: `${Math.min(pct, 100)}%`, transition: 'width 0.3s' }),
};

// ── Helpers ─────────────────────────────────────────────────
function normDate(d) { return d ? (typeof d === 'string' ? d.slice(0, 10) : '') : ''; }
function fmtDate(d) { const s = normDate(d); if (!s) return '\u2014'; const [y, m, day] = s.split('-'); return `${day}/${m}/${y}`; }
function fmtMoney(v) { return v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '\u2014'; }

function filterByHorizon(items, days, field = 'date_end') {
  if (!days) return items;
  const limit = new Date(); limit.setDate(limit.getDate() + days);
  return items.filter(t => { const d = normDate(t[field]); if (!d) return true; return new Date(d + 'T12:00:00') <= limit; });
}

function sortByUrgency(items) {
  return [...items].sort((a, b) => {
    const pa = normDate(a.deadline || a.date_end); const pb = normDate(b.deadline || b.date_end);
    if (!pa && !pb) return 0; if (!pa) return 1; if (!pb) return -1;
    return pa.localeCompare(pb);
  });
}

function DaysCounter({ date, status }) {
  const s = normDate(date);
  if (!s || status === 'concluido' || status === 'concluida') return null;
  const diff = Math.ceil((new Date(s + 'T12:00:00') - new Date()) / 86400000);
  const color = diff < 0 ? C.red : diff <= 7 ? C.amber : C.green;
  const text = diff < 0 ? `${Math.abs(diff)}d atras` : diff === 0 ? 'Hoje' : `${diff}d`;
  return <span style={{ fontSize: 11, fontWeight: 700, color, marginLeft: 6 }}>{text}</span>;
}

// ── Componentes auxiliares ──────────────────────────────────
function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={styles.modalTitle}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: C.t3 }}>{'\u2715'}</button>
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
  const s = map[status] || { c: C.t3, bg: 'var(--cbrio-bg)', label: status || '\u2014' };
  return <span style={styles.badge(s.c, s.bg)}>{s.label}</span>;
}

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={styles.progress}><div style={styles.progressBar(pct, color)} /></div>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.t2, minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

// ── KPI Bar compacta ────────────────────────────────────────
function KpiBar({ items }) {
  return (
    <div style={{
      background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: '14px 24px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflowX: 'auto',
    }}>
      {items.map((item, i) => {
        if (!item) return <div key={i} style={{ width: 1, height: 24, background: C.border }} />;
        return (
          <div key={item.label + i} onClick={item.action}
            style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '2px 4px', borderRadius: 6, transition: 'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background = `${item.color}15`}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.t3, textTransform: 'uppercase', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── TABS ────────────────────────────────────────────────────
const TABS = ['Home', 'Lista', 'Kanban', 'Gantt'];

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
export default function Projetos() {
  const { isDiretor } = useAuth();

  // URL params drill-down
  const urlParams = new URLSearchParams(window.location.search);
  const urlStatus = urlParams.get('status') || '';
  const urlId = urlParams.get('id') || '';

  const [tab, setTab] = useState(urlStatus ? 1 : urlId ? 4 : 0);
  const [list, setList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dash, setDash] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usersList, setUsersList] = useState([]);

  // Filtros
  const [fStatus, setFStatus] = useState(urlStatus);
  const [fCategory, setFCategory] = useState('');
  const [fPriority, setFPriority] = useState('');
  const [fSearch, setFSearch] = useState('');
  const [hideDone, setHideDone] = useState(true);

  // Kanban
  const [kanbanCategory, setKanbanCategory] = useState('all');
  const [kanbanHorizon, setKanbanHorizon] = useState(0);
  const [dragId, setDragId] = useState(null);
  const [dropCol, setDropCol] = useState(null);

  // Gantt
  const [ganttExpanded, setGanttExpanded] = useState({});
  const [ganttStatusFilter, setGanttStatusFilter] = useState('');
  const [ganttCatFilter, setGanttCatFilter] = useState('');

  // Detail sub-tab
  const [detailTab, setDetailTab] = useState('info');

  // Modals
  const [modalProject, setModalProject] = useState(null);
  const [modalTask, setModalTask] = useState(null);
  const [modalRisk, setModalRisk] = useState(null);
  const [modalKpi, setModalKpi] = useState(null);
  const [modalBudget, setModalBudget] = useState(null);
  const [modalMilestone, setModalMilestone] = useState(null);

  // Subtasks & comments
  const [newSubtask, setNewSubtask] = useState({});
  const [newComment, setNewComment] = useState({});

  // Task view in detail
  const [taskView, setTaskView] = useState('lista');
  const [taskDragId, setTaskDragId] = useState(null);
  const [taskDropCol, setTaskDropCol] = useState(null);

  // Retrospectiva
  const [retroData, setRetroData] = useState(null);
  const [retroForm, setRetroForm] = useState({});

  // Sort
  const [sortCol, setSortCol] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  // ── Loaders ──
  const loadCategories = useCallback(async () => {
    try { setCategories(await projects.categories()); } catch (e) { console.error(e); }
  }, []);

  const loadDash = useCallback(async () => {
    try { setDash(await projects.dashboard()); } catch (e) { console.error(e); }
  }, []);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (fStatus) params.status = fStatus;
      if (fCategory) params.category_id = fCategory;
      if (fPriority) params.priority = fPriority;
      setList(await projects.list(params));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [fStatus, fCategory, fPriority]);

  const loadDetail = useCallback(async (id) => {
    try {
      setLoading(true);
      const p = await projects.get(id);
      setDetail(p);
      setTab(4);
      setDetailTab('info');
      // Load retrospective
      projects.getRetrospective(id).then(d => { setRetroData(d); setRetroForm(d || {}); }).catch(() => { setRetroData(null); setRetroForm({}); });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const refreshDetail = useCallback(async () => {
    if (detail?.id) {
      try {
        const p = await projects.get(detail.id);
        setDetail(p);
      } catch (e) { console.error(e); }
    }
  }, [detail?.id]);

  useEffect(() => {
    loadCategories(); loadDash(); loadList();
    usersApi.list().then(d => setUsersList(Array.isArray(d) ? d : [])).catch(() => setUsersList([]));
    if (urlId) loadDetail(urlId);
  }, []);
  useEffect(() => { loadList(); }, [fStatus, fCategory, fPriority]);

  // ── Counts ──
  const counts = { total: list.length, 'no-prazo': 0, 'em-risco': 0, 'atrasado': 0, 'concluido': 0 };
  list.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });

  const d = dash || {};

  // ── Drill-down helper ──
  const kpiDrillDown = (status) => {
    setFStatus(status || '');
    setHideDone(status !== 'concluido');
    setTab(1);
  };

  // ── KPI items ──
  const kpiItems = [
    { label: 'Total', value: d.total || counts.total, color: C.primary, action: () => kpiDrillDown('') },
    { label: 'No Prazo', value: d.by_status?.['no-prazo'] ?? counts['no-prazo'], color: C.green, action: () => kpiDrillDown('no-prazo') },
    { label: 'Em Risco', value: d.by_status?.['em-risco'] ?? counts['em-risco'], color: C.amber, action: () => kpiDrillDown('em-risco') },
    { label: 'Atrasados', value: d.by_status?.['atrasado'] ?? counts['atrasado'], color: C.red, action: () => kpiDrillDown('atrasado') },
    { label: 'Concluidos', value: d.by_status?.['concluido'] ?? counts['concluido'], color: C.blue, action: () => kpiDrillDown('concluido') },
    null,
    { label: 'Tarefas abertas', value: d.tasks_open || 0, color: C.t2, action: () => {} },
    { label: 'Tarefas atrasadas', value: d.tasks_overdue || 0, color: C.red, action: () => {} },
  ];

  // ── Category map ──
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });
  const getCatName = (id) => catMap[id]?.name || '\u2014';
  const getCatColor = (id) => catMap[id]?.color || C.t3;

  // ── CRUD handlers ──
  async function saveProject(data) {
    try {
      if (data.id) await projects.update(data.id, data);
      else await projects.create(data);
      setModalProject(null);
      loadList(); loadDash();
      if (detail && data.id === detail.id) refreshDetail();
    } catch (e) { alert(e.message); }
  }

  async function deleteProject(id) {
    if (!window.confirm('Remover este projeto?')) return;
    try {
      await projects.remove(id);
      setDetail(null); setTab(0);
      loadList(); loadDash();
    } catch (e) { alert(e.message); }
  }

  async function toggleProjectStatus(id, currentStatus) {
    const newStatus = currentStatus === 'concluido' ? 'no-prazo' : 'concluido';
    try {
      await projects.update(id, { status: newStatus });
      loadList(); loadDash();
      if (detail?.id === id) refreshDetail();
    } catch (e) { alert(e.message); }
  }

  // Phase
  async function initPhases() {
    if (!detail) return;
    try {
      for (let i = 0; i < PHASE_NAMES.length; i++) {
        await projects.createPhase(detail.id, { name: PHASE_NAMES[i], order_index: i, status: 'pendente' });
      }
      refreshDetail();
    } catch (e) { alert(e.message); }
  }

  async function updatePhaseField(phaseId, field, value) {
    try {
      await projects.updatePhase(phaseId, { [field]: value });
      refreshDetail();
    } catch (e) { alert(e.message); }
  }

  // Task
  async function saveTask(data) {
    try {
      if (data.id) await projects.updateTask(data.id, data);
      else await projects.createTask(detail.id, data);
      setModalTask(null); refreshDetail();
    } catch (e) { alert(e.message); }
  }

  async function changeTaskStatus(taskId, status) {
    try { await projects.updateTaskStatus(taskId, status); refreshDetail(); } catch (e) { alert(e.message); }
  }

  async function deleteTask(taskId) {
    if (!window.confirm('Excluir tarefa?')) return;
    try { await projects.removeTask(taskId); refreshDetail(); } catch (e) { alert(e.message); }
  }

  // Subtask
  async function addSubtask(taskId) {
    const name = (newSubtask[taskId] || '').trim();
    if (!name) return;
    try {
      await projects.createSubtask(taskId, { name });
      setNewSubtask(prev => ({ ...prev, [taskId]: '' }));
      refreshDetail();
    } catch (e) { alert(e.message); }
  }

  async function toggleSubtask(subId, done) {
    try { await projects.toggleSubtask(subId, done); refreshDetail(); } catch (e) { alert(e.message); }
  }

  async function deleteSubtask(subId) {
    try { await projects.removeSubtask(subId); refreshDetail(); } catch (e) { alert(e.message); }
  }

  // Comment
  async function addComment(taskId) {
    const text = (newComment[taskId] || '').trim();
    if (!text) return;
    try {
      await projects.addComment(taskId, text);
      setNewComment(prev => ({ ...prev, [taskId]: '' }));
      refreshDetail();
    } catch (e) { alert(e.message); }
  }

  // Milestone
  async function saveMilestone(data) {
    try {
      if (data.id) await projects.updateMilestone(data.id, data);
      else await projects.createMilestone(detail.id, data);
      setModalMilestone(null); refreshDetail();
    } catch (e) { alert(e.message); }
  }

  async function changeMilestoneStatus(mId, status) {
    try { await projects.updateMilestoneStatus(mId, status); refreshDetail(); } catch (e) { alert(e.message); }
  }

  // KPI
  async function saveKpi(data) {
    try {
      if (data.id) await projects.updateKpi(data.id, data);
      else await projects.createKpi(detail.id, data);
      setModalKpi(null); refreshDetail();
    } catch (e) { alert(e.message); }
  }

  async function deleteKpi(kpiId) {
    if (!window.confirm('Remover KPI?')) return;
    try { await projects.removeKpi(kpiId); refreshDetail(); } catch (e) { alert(e.message); }
  }

  // Risk
  async function saveRisk(data) {
    try {
      if (data.id) await projects.updateRisk(data.id, data);
      else await projects.createRisk(detail.id, data);
      setModalRisk(null); refreshDetail();
    } catch (e) { alert(e.message); }
  }

  async function deleteRisk(riskId) {
    if (!window.confirm('Remover risco?')) return;
    try { await projects.removeRisk(riskId); refreshDetail(); } catch (e) { alert(e.message); }
  }

  // Budget
  async function saveBudgetItem(data) {
    try {
      if (data.id) await projects.updateBudgetItem(data.id, data);
      else await projects.createBudgetItem(detail.id, data);
      setModalBudget(null); refreshDetail();
    } catch (e) { alert(e.message); }
  }

  async function deleteBudgetItem(itemId) {
    if (!window.confirm('Remover item?')) return;
    try { await projects.removeBudgetItem(itemId); refreshDetail(); } catch (e) { alert(e.message); }
  }

  // Retrospective
  async function saveRetrospective() {
    if (!detail) return;
    try {
      await projects.saveRetrospective(detail.id, retroForm);
      const r = await projects.getRetrospective(detail.id);
      setRetroData(r); setRetroForm(r || {});
    } catch (e) { alert(e.message); }
  }

  // Kanban project status change
  async function kanbanChangeProjectStatus(projectId, newStatus) {
    try {
      await projects.update(projectId, { status: newStatus });
      loadList(); loadDash();
    } catch (e) { alert(e.message); }
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — HOME
  // ═══════════════════════════════════════════════════════════
  function renderHome() {
    // Workload: group by leader/responsible
    const workloadMap = {};
    list.forEach(p => {
      const name = p.leader || p.responsible || 'Sem responsavel';
      if (!workloadMap[name]) workloadMap[name] = { name, tasks: 0 };
      workloadMap[name].tasks += (p.tasks_total || 0);
    });
    const workloadArr = Object.values(workloadMap).sort((a, b) => b.tasks - a.tasks).slice(0, 10);
    const maxTasks = workloadArr.length > 0 ? Math.max(...workloadArr.map(w => w.tasks), 1) : 1;

    // Projects by category
    const catCounts = {};
    list.forEach(p => {
      const catName = p.project_categories?.name || getCatName(p.category_id) || 'Sem categoria';
      const catColor = p.project_categories?.color || getCatColor(p.category_id);
      if (!catCounts[catName]) catCounts[catName] = { name: catName, color: catColor, count: 0 };
      catCounts[catName].count++;
    });
    const catArr = Object.values(catCounts).sort((a, b) => b.count - a.count);

    const budgetPlanned = Number(d.budget_planned) || 0;
    const budgetSpent = Number(d.budget_spent) || 0;
    const budgetPct = budgetPlanned > 0 ? Math.round((budgetSpent / budgetPlanned) * 100) : 0;

    return (
      <>
        {/* Compact KPI bar */}
        <KpiBar items={kpiItems} />

        {/* Budget + Workload */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          {/* Budget card */}
          <div style={{ ...styles.card, flex: '1 1 320px', minWidth: 280 }}>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>Orcamento Global</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.t2, marginBottom: 6 }}>
                <span>Gasto: {fmtMoney(budgetSpent)}</span>
                <span>Planejado: {fmtMoney(budgetPlanned)}</span>
              </div>
              <div style={{ height: 10, background: C.border, borderRadius: 5 }}>
                <div style={{ height: '100%', width: `${Math.min(budgetPct, 100)}%`, borderRadius: 5, background: budgetPct > 100 ? C.red : C.green, transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: 12, color: C.t3, marginTop: 6 }}>{budgetPct}% utilizado</div>
            </div>
          </div>

          {/* Workload bars */}
          {workloadArr.length > 0 && (
            <div style={{ ...styles.card, flex: '1 1 320px', minWidth: 280 }}>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>Carga de Trabalho</div>
                {workloadArr.map((w, i) => (
                  <div key={i} onClick={() => { setFSearch(w.name); setTab(1); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer', padding: '3px 4px', borderRadius: 6, transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: C.text, width: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</span>
                    <div style={{ flex: 1, height: 8, background: C.border, borderRadius: 4 }}>
                      <div style={{ height: '100%', width: `${Math.min((w.tasks / maxTasks) * 100, 100)}%`, borderRadius: 4, background: C.primary, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: 12, color: C.t3, fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{w.tasks} tarefas</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Projects by category */}
        {catArr.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}><span>Projetos por Categoria</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {catArr.map(cat => (
                <div key={cat.name} onClick={() => { setFCategory(''); setTab(1); }}
                  style={{ ...styles.card, padding: '16px 20px', cursor: 'pointer', borderLeft: `4px solid ${cat.color || C.primary}`, transition: 'box-shadow .15s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: cat.color || C.primary }}>{cat.count}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.t2, marginTop: 4 }}>{cat.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ height: 40 }} />
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — LISTA
  // ═══════════════════════════════════════════════════════════
  function renderList() {
    let filtered = [...list];
    if (hideDone) filtered = filtered.filter(p => p.status !== 'concluido');
    if (fSearch) {
      const q = fSearch.toLowerCase();
      filtered = filtered.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.leader || '').toLowerCase().includes(q) ||
        (p.responsible || '').toLowerCase().includes(q)
      );
    }
    // Sort
    filtered.sort((a, b) => {
      let va, vb;
      if (sortCol === 'name') { va = a.name || ''; vb = b.name || ''; }
      else if (sortCol === 'status') { va = a.status || ''; vb = b.status || ''; }
      else if (sortCol === 'priority') { va = a.priority || ''; vb = b.priority || ''; }
      else if (sortCol === 'leader') { va = a.leader || ''; vb = b.leader || ''; }
      else if (sortCol === 'deadline') {
        va = normDate(a.date_end); vb = normDate(b.date_end);
        if (!va && !vb) return 0; if (!va) return 1; if (!vb) return -1;
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      else { va = a.name || ''; vb = b.name || ''; }
      return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });

    const thClick = (col) => { if (sortCol === col) setSortAsc(!sortAsc); else { setSortCol(col); setSortAsc(true); } };

    return (
      <>
        <KpiBar items={kpiItems} />

        {/* Filters */}
        <div style={styles.filterRow}>
          <select style={styles.select} value={fStatus} onChange={e => setFStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select style={styles.select} value={fCategory} onChange={e => setFCategory(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select style={styles.select} value={fPriority} onChange={e => setFPriority(e.target.value)}>
            <option value="">Todas as prioridades</option>
            {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <input style={{ ...styles.input, width: 200 }} placeholder="Buscar..." value={fSearch} onChange={e => setFSearch(e.target.value)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.t2, cursor: 'pointer' }}>
            <input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} />
            Esconder concluidos
          </label>
        </div>

        {/* Table */}
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                {[{ key: 'name', label: 'Nome' }, { key: 'category', label: 'Categoria' }, { key: 'leader', label: 'Lider' }, { key: 'status', label: 'Status' }, { key: 'priority', label: 'Prioridade' }, { key: 'progress', label: 'Progresso' }, { key: 'deadline', label: 'Prazo' }].map(col => (
                  <th key={col.key} style={{ ...styles.th, cursor: 'pointer', userSelect: 'none' }} onClick={() => thClick(col.key)}>
                    {col.label} {sortCol === col.key ? (sortAsc ? '\u25B2' : '\u25BC') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td style={styles.td} colSpan={7}>Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td style={styles.empty} colSpan={7}>Nenhum projeto encontrado.</td></tr>
              ) : filtered.map(p => {
                const catName = p.project_categories?.name || getCatName(p.category_id);
                const catColor = p.project_categories?.color || getCatColor(p.category_id);
                const pct = p.tasks_total > 0 ? Math.round((p.tasks_done / p.tasks_total) * 100) : 0;
                return (
                  <tr key={p.id} style={styles.clickRow} onClick={() => loadDetail(p.id)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--cbrio-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{p.name}</td>
                    <td style={styles.td}><span style={styles.badge(catColor, catColor + '18')}>{catName}</span></td>
                    <td style={styles.td}>{p.leader || p.responsible || '\u2014'}</td>
                    <td style={styles.td}><Badge status={p.status} map={STATUS_MAP} /></td>
                    <td style={styles.td}><Badge status={p.priority} map={PRIORITY_MAP} /></td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}>
                        <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3 }}>
                          <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: pct >= 100 ? C.green : C.primary, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.t2 }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      {fmtDate(p.date_end)}
                      <DaysCounter date={p.date_end} status={p.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ height: 40 }} />
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — KANBAN
  // ═══════════════════════════════════════════════════════════
  function renderKanban() {
    const COLS = [
      { key: 'no-prazo', label: 'No Prazo', color: C.green },
      { key: 'em-risco', label: 'Em Risco', color: C.amber },
      { key: 'atrasado', label: 'Atrasado', color: C.red },
    ];

    // Category filter tabs
    const catCountsK = { all: 0 };
    list.forEach(p => {
      if (p.status === 'concluido') return;
      catCountsK.all++;
      const cn = p.project_categories?.name || getCatName(p.category_id) || 'Sem cat.';
      if (!catCountsK[cn]) catCountsK[cn] = 0;
      catCountsK[cn]++;
    });
    const catTabs = [{ key: 'all', label: 'Todos', count: catCountsK.all }];
    categories.forEach(c => {
      if (catCountsK[c.name]) catTabs.push({ key: c.name, label: c.name, count: catCountsK[c.name], color: c.color });
    });

    // Filter projects
    let items = list.filter(p => p.status !== 'concluido');
    if (kanbanCategory !== 'all') {
      items = items.filter(p => (p.project_categories?.name || getCatName(p.category_id)) === kanbanCategory);
    }
    if (kanbanHorizon) {
      items = filterByHorizon(items, kanbanHorizon, 'date_end');
    }

    return (
      <>
        {/* Category filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {catTabs.map(ct => (
            <button key={ct.key} onClick={() => setKanbanCategory(ct.key)} style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: kanbanCategory === ct.key ? 700 : 400, cursor: 'pointer',
              border: kanbanCategory === ct.key ? `2px solid ${ct.color || C.primary}` : `1px solid ${C.border}`,
              background: kanbanCategory === ct.key ? `${ct.color || C.primary}15` : 'transparent',
              color: kanbanCategory === ct.key ? (ct.color || C.primary) : C.t3,
            }}>
              {ct.label} <span style={{ fontSize: 10, opacity: 0.7 }}>({ct.count})</span>
            </button>
          ))}
          <span style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />
          <span style={{ fontSize: 11, color: C.t2, fontWeight: 600 }}>Horizonte:</span>
          <select value={kanbanHorizon} onChange={e => setKanbanHorizon(parseInt(e.target.value))}
            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text }}>
            <option value={30}>30 dias</option>
            <option value={60}>60 dias</option>
            <option value={0}>Sem filtro</option>
          </select>
        </div>

        {/* 3 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, minHeight: 400 }}>
          {COLS.map(col => {
            const colItems = sortByUrgency(items.filter(p => p.status === col.key));
            const isDropTarget = dropCol === col.key;
            return (
              <div key={col.key}
                onDragOver={e => { e.preventDefault(); setDropCol(col.key); }}
                onDragLeave={() => setDropCol(null)}
                onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('projectKanbanId'); if (id) kanbanChangeProjectStatus(id, col.key); setDropCol(null); setDragId(null); }}
                style={{
                  background: isDropTarget ? `${col.color}10` : C.bg, borderRadius: 12, padding: 10,
                  border: isDropTarget ? `2px dashed ${col.color}` : `1px solid ${C.border}`, transition: 'all .2s',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '0 4px' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{col.label}</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: C.card, border: `1px solid ${C.border}`, color: C.t3 }}>{colItems.length}</span>
                </div>
                {colItems.length === 0 && <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: C.t3, border: `1.5px dashed ${C.border}`, borderRadius: 8 }}>\u2014</div>}
                {colItems.map(p => {
                  const catName = p.project_categories?.name || getCatName(p.category_id);
                  const catColor = p.project_categories?.color || getCatColor(p.category_id);
                  const pct = p.tasks_total > 0 ? Math.round((p.tasks_done / p.tasks_total) * 100) : 0;
                  const isDragging = dragId === p.id;
                  return (
                    <div key={p.id} draggable
                      onDragStart={e => { e.dataTransfer.setData('projectKanbanId', p.id); setDragId(p.id); }}
                      onDragEnd={() => { setDragId(null); setDropCol(null); }}
                      onClick={() => loadDetail(p.id)}
                      style={{
                        background: C.card, borderRadius: 10, padding: '12px 14px', marginBottom: 8,
                        border: `1px solid ${C.border}`, cursor: 'grab', transition: 'all .15s',
                        opacity: isDragging ? 0.4 : 1,
                      }}
                      onMouseEnter={e => { if (!isDragging) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <span style={styles.badge(catColor, catColor + '18')}>{catName}</span>
                        <Badge status={p.priority} map={PRIORITY_MAP} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4, lineHeight: 1.3 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: C.t3, marginBottom: 8 }}>{p.leader || p.responsible || '\u2014'}</div>
                      {/* Progress bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <div style={{ flex: 1, height: 5, background: C.border, borderRadius: 3 }}>
                          <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: pct >= 100 ? C.green : C.primary, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: C.t3 }}>{p.tasks_done || 0}/{p.tasks_total || 0}</span>
                      </div>
                      {/* DaysCounter */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: C.t3 }}>{fmtDate(p.date_end)}</span>
                        <DaysCounter date={p.date_end} status={p.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div style={{ height: 40 }} />
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — GANTT
  // ═══════════════════════════════════════════════════════════
  function renderGantt() {
    const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const ST_COLORS = { 'no-prazo': C.green, 'em-risco': C.amber, 'atrasado': C.red, 'concluido': '#d1d5db' };
    const PHASE_COLORS = { 'pendente': '#9ca3af', 'em-andamento': C.blue, 'concluida': C.green, 'bloqueada': C.red };

    // Filtros do Gantt
    const statusFilters = [
      { key: 'all', label: 'Todos', color: C.primary },
      { key: 'no-prazo', label: 'No Prazo', color: C.green },
      { key: 'em-risco', label: 'Em Risco', color: C.amber },
      { key: 'atrasado', label: 'Atrasado', color: C.red },
      { key: 'concluido', label: 'Concluído', color: '#9ca3af' },
    ];

    let visibleProjects = list.filter(p => normDate(p.date_start) && normDate(p.date_end));
    // Aplicar filtro de status
    if (ganttStatusFilter && ganttStatusFilter !== 'all') {
      visibleProjects = visibleProjects.filter(p => p.status === ganttStatusFilter);
    }
    // Aplicar filtro de categoria
    if (ganttCatFilter && ganttCatFilter !== 'all') {
      visibleProjects = visibleProjects.filter(p => p.project_categories?.name === ganttCatFilter || p.category_name === ganttCatFilter);
    }

    if (list.filter(p => normDate(p.date_start) && normDate(p.date_end)).length === 0) return <div style={styles.empty}>Nenhum projeto com datas definidas.</div>;

    // Calculate timeline bounds (usar lista completa para range estável)
    const allWithDates = list.filter(p => normDate(p.date_start) && normDate(p.date_end));
    const allDates = allWithDates.flatMap(p => [p.date_start, p.date_end].filter(Boolean)).map(x => new Date(normDate(x) + 'T12:00:00'));
    const today = new Date();
    const ganttStart = new Date(Math.min(...allDates, today) - 14 * 86400000);
    const ganttEnd = new Date(Math.max(...allDates, today) + 14 * 86400000);
    ganttStart.setDate(1); ganttEnd.setDate(1); ganttEnd.setMonth(ganttEnd.getMonth() + 1);
    const totalMs = ganttEnd - ganttStart;
    const dateToPct = (dt) => Math.max(0, Math.min(100, ((new Date(dt) - ganttStart) / totalMs) * 100));
    const todayPct = dateToPct(today);

    // Month labels
    const monthLabels = [];
    const mc = new Date(ganttStart);
    while (mc < ganttEnd) { monthLabels.push({ label: MONTHS[mc.getMonth()] + (mc.getMonth() === 0 ? ' ' + mc.getFullYear() : ''), pct: dateToPct(mc) }); mc.setMonth(mc.getMonth() + 1); }

    const NW = 220; const BH = 34; const PHASE_H = 26;

    // Contagens para badges nos filtros
    const statusCounts = { 'all': allWithDates.length };
    allWithDates.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });

    return (
      <>
        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: C.t2, fontWeight: 600 }}>Status:</span>
          {statusFilters.map(f => {
            const isActive = (ganttStatusFilter || 'all') === f.key;
            return (
              <button key={f.key} onClick={() => setGanttStatusFilter(f.key === 'all' ? '' : f.key)} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: isActive ? 700 : 400, cursor: 'pointer',
                border: isActive ? `2px solid ${f.color}` : `1px solid ${C.border}`,
                background: isActive ? `${f.color}15` : 'transparent',
                color: isActive ? f.color : C.t3, transition: 'all .15s',
              }}>
                {f.label} <span style={{ fontSize: 9, opacity: 0.7 }}>({statusCounts[f.key] || 0})</span>
              </button>
            );
          })}

          <span style={{ width: 1, height: 20, background: C.border }} />

          <span style={{ fontSize: 11, color: C.t2, fontWeight: 600 }}>Categoria:</span>
          <select value={ganttCatFilter || 'all'} onChange={e => setGanttCatFilter(e.target.value === 'all' ? '' : e.target.value)}
            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text }}>
            <option value="all">Todas ({allWithDates.length})</option>
            {categories.map(c => {
              const cnt = allWithDates.filter(p => p.project_categories?.name === c.name || p.category_name === c.name).length;
              return cnt > 0 ? <option key={c.id} value={c.name}>{c.name} ({cnt})</option> : null;
            })}
          </select>
        </div>

        {/* Contagem filtrada */}
        {visibleProjects.length === 0 && <div style={styles.empty}>Nenhum projeto corresponde aos filtros selecionados.</div>}
        {visibleProjects.length > 0 && <div style={{ fontSize: 11, color: C.t3, marginBottom: 8 }}>{visibleProjects.length} projeto(s) exibido(s)</div>}

        {/* Legenda */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          {[{ l: 'No Prazo (>7d)', c: C.green }, { l: 'Urgente (≤7d)', c: C.amber }, { l: 'Atrasado', c: C.red }, { l: 'Concluído', c: '#d1d5db' }].map(x => (
            <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 10, borderRadius: 4, background: x.c }} />
              <span style={{ fontSize: 12, color: C.t2 }}>{x.l}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 2, height: 14, background: C.red }} />
            <span style={{ fontSize: 12, color: C.t2 }}>Hoje</span>
          </div>
        </div>

        <div style={{ ...styles.card, overflow: 'hidden' }}>
          <div style={{ display: 'flex' }}>
            {/* Fixed left column */}
            <div style={{ width: NW, flexShrink: 0, borderRight: `1px solid ${C.border}` }}>
              <div style={{ height: 30, borderBottom: `1px solid ${C.border}`, background: 'var(--cbrio-table-header, #fafafa)', padding: '0 12px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.t2, textTransform: 'uppercase' }}>Projeto</span>
              </div>
              {visibleProjects.map(p => {
                const isExp = ganttExpanded[p.id];
                const phases = p.phases || [];
                return (
                  <div key={p.id}>
                    <div onClick={() => setGanttExpanded(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                      style={{ height: BH, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bg}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ fontSize: 10, color: C.t3, width: 12 }}>{phases.length > 0 ? (isExp ? '\u25BC' : '\u25B6') : ''}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.name}</span>
                    </div>
                    {isExp && phases.map(ph => (
                      <div key={ph.id} style={{ height: PHASE_H, padding: '0 12px 0 30px', display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 10, color: C.t3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ph.name}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Scrollable right area */}
            <div style={{ flex: 1, overflowX: 'auto' }}>
              <div style={{ minWidth: 800, position: 'relative' }}>
                {/* Month header */}
                <div style={{ height: 30, position: 'relative', borderBottom: `1px solid ${C.border}`, background: 'var(--cbrio-table-header, #fafafa)' }}>
                  {monthLabels.map((m, i) => (
                    <div key={i} style={{ position: 'absolute', left: `${m.pct}%`, top: 0, height: '100%', borderLeft: `1px solid ${C.border}`, padding: '6px 6px', fontSize: 10, fontWeight: 600, color: C.t2, whiteSpace: 'nowrap' }}>{m.label}</div>
                  ))}
                  <div style={{ position: 'absolute', left: `${todayPct}%`, top: 0, width: 2, height: '100%', background: C.red, zIndex: 2 }} />
                  <div style={{ position: 'absolute', left: `${todayPct}%`, top: -1, transform: 'translateX(-50%)', fontSize: 10, fontWeight: 700, color: C.red, background: C.card, padding: '1px 5px', borderRadius: 4, zIndex: 3 }}>hoje</div>
                </div>

                {/* Project bars */}
                {visibleProjects.map(p => {
                  const isExp = ganttExpanded[p.id];
                  const phases = p.phases || [];
                  const si = normDate(p.date_start); const ei = normDate(p.date_end);
                  const isDone = p.status === 'concluido';
                  const endDate = ei ? new Date(ei + 'T12:00:00') : null;
                  const diff = endDate ? Math.ceil((endDate - new Date()) / 86400000) : null;
                  const barColor = isDone ? '#d1d5db' : diff !== null && diff < 0 ? C.red : diff !== null && diff <= 7 ? C.amber : C.green;
                  const daysText = isDone ? '✓' : diff === null ? '' : diff < 0 ? `${Math.abs(diff)}d atrás` : diff === 0 ? 'Hoje' : `${diff}d`;
                  let lp = 0, wp = 0;
                  if (si && ei) { lp = dateToPct(si + 'T12:00:00'); const rp = dateToPct(ei + 'T12:00:00'); wp = Math.max(rp - lp, 1); }

                  return (
                    <div key={p.id}>
                      <div style={{ position: 'relative', height: BH, borderBottom: `1px solid ${C.border}` }}>
                        {monthLabels.map((m, i) => (<div key={i} style={{ position: 'absolute', left: `${m.pct}%`, top: 0, width: 1, height: '100%', background: C.border, opacity: 0.3 }} />))}
                        <div style={{ position: 'absolute', left: `${todayPct}%`, top: 0, width: 2, height: '100%', background: C.red, zIndex: 2, opacity: 0.3 }} />
                        {si && ei && (
                          <div onClick={() => loadDetail(p.id)} title={`${p.name}\n${fmtDate(si)} → ${fmtDate(ei)}\n${daysText}`}
                            style={{ position: 'absolute', top: 4, height: BH - 8, borderRadius: 6, left: `${lp}%`, width: `${wp}%`, minWidth: 50, background: barColor, opacity: isDone ? 0.5 : 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', overflow: 'hidden', cursor: 'pointer', transition: 'opacity .15s' }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = isDone ? '0.5' : '0.9'; e.currentTarget.style.boxShadow = 'none'; }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{daysText}</span>
                          </div>
                        )}
                      </div>
                      {/* Phase sub-bars */}
                      {isExp && phases.map(ph => {
                        const psi = normDate(ph.date_start || ph.start_date); const pei = normDate(ph.date_end || ph.end_date);
                        const phDone = ph.status === 'concluida';
                        const phEnd = pei ? new Date(pei + 'T12:00:00') : null;
                        const phDiff = phEnd ? Math.ceil((phEnd - new Date()) / 86400000) : null;
                        const phColor = phDone ? '#d1d5db' : ph.status === 'bloqueada' ? C.red : phDiff !== null && phDiff < 0 ? C.red : phDiff !== null && phDiff <= 3 ? C.amber : C.blue;
                        const phDaysText = phDone ? '✓' : phDiff === null ? ph.name : phDiff < 0 ? `${Math.abs(phDiff)}d` : phDiff === 0 ? 'Hoje' : `${phDiff}d`;
                        let plp = 0, pwp = 0;
                        if (psi && pei) { plp = dateToPct(psi + 'T12:00:00'); const prp = dateToPct(pei + 'T12:00:00'); pwp = Math.max(prp - plp, 1); }
                        return (
                          <div key={ph.id} style={{ position: 'relative', height: PHASE_H, borderBottom: `1px solid ${C.border}` }}>
                            {monthLabels.map((m, i) => (<div key={i} style={{ position: 'absolute', left: `${m.pct}%`, top: 0, width: 1, height: '100%', background: C.border, opacity: 0.2 }} />))}
                            <div style={{ position: 'absolute', left: `${todayPct}%`, top: 0, width: 2, height: '100%', background: C.red, zIndex: 2, opacity: 0.2 }} />
                            {psi && pei && (
                              <div title={`${ph.name}\n${fmtDate(psi)} → ${fmtDate(pei)}\n${phDaysText}`}
                                style={{ position: 'absolute', top: 3, height: PHASE_H - 6, borderRadius: 4, left: `${plp}%`, width: `${pwp}%`, minWidth: 30, background: phColor, opacity: phDone ? 0.5 : 0.75, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', overflow: 'hidden' }}>
                                <span style={{ fontSize: 9, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>{phDaysText}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div style={{ height: 40 }} />
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — DETAIL
  // ═══════════════════════════════════════════════════════════
  function renderDetail() {
    if (!detail) return <div style={styles.empty}>Selecione um projeto.</div>;
    const p = detail;
    const phases = p.phases || [];
    const tasks = p.tasks || [];
    const milestones = p.milestones || [];
    const risks = p.risks || [];
    const kpis = p.kpis || [];
    const budgetItems = p.budget_items || [];
    const retro = p.retrospective || retroData;

    const DETAIL_TABS = ['Info', 'Fases', 'Tarefas', 'Riscos', 'Orcamento', 'Retrospectiva'];

    return (
      <>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <button onClick={() => { setDetail(null); setTab(1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.primary, fontWeight: 600, fontSize: 13, padding: 0, marginBottom: 8 }}>{'\u2190'} Voltar</button>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 8 }}>{p.name}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge status={p.status} map={STATUS_MAP} />
              <Badge status={p.priority} map={PRIORITY_MAP} />
              {p.project_categories?.name && <span style={styles.badge(p.project_categories.color || C.primary, (p.project_categories.color || C.primary) + '18')}>{p.project_categories.name}</span>}
            </div>
          </div>
          {isDiretor && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={styles.btn('secondary')} onClick={() => setModalProject(p)}>Editar</button>
              <button style={styles.btn(p.status === 'concluido' ? 'secondary' : 'primary')} onClick={() => toggleProjectStatus(p.id, p.status)}>
                {p.status === 'concluido' ? 'Reabrir' : 'Finalizar'}
              </button>
              <button style={styles.btn('danger')} onClick={() => deleteProject(p.id)}>Excluir</button>
            </div>
          )}
        </div>

        {/* Detail sub-tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 20 }}>
          {DETAIL_TABS.map(t => (
            <button key={t} style={styles.tab(detailTab === t.toLowerCase())} onClick={() => setDetailTab(t.toLowerCase())}>{t}</button>
          ))}
        </div>

        {/* ─── Info ─── */}
        {detailTab === 'info' && (
          <>
            {/* Info grid */}
            <div style={{ ...styles.card, padding: 20, marginBottom: 20 }}>
              <div style={styles.infoGrid}>
                <div><div style={styles.infoLabel}>Lider</div><div style={styles.infoValue}>{p.leader || p.responsible || '\u2014'}</div></div>
                <div><div style={styles.infoLabel}>Area</div><div style={styles.infoValue}>{p.area || '\u2014'}</div></div>
                <div><div style={styles.infoLabel}>Periodo</div><div style={styles.infoValue}>{fmtDate(p.date_start)} - {fmtDate(p.date_end)}</div></div>
                <div><div style={styles.infoLabel}>Frequencia</div><div style={styles.infoValue}>{p.frequency || '\u2014'}</div></div>
                <div><div style={styles.infoLabel}>Publico-alvo</div><div style={styles.infoValue}>{p.public_target || '\u2014'}</div></div>
                <div><div style={styles.infoLabel}>Complexidade</div><div style={styles.infoValue}>{COMPLEXITY_MAP[p.complexity] || p.complexity || '\u2014'}</div></div>
                <div><div style={styles.infoLabel}>Impacto</div><div style={styles.infoValue}>{IMPACT_MAP[p.impact] || p.impact || '\u2014'}</div></div>
                <div><div style={styles.infoLabel}>Ano</div><div style={styles.infoValue}>{p.year || '\u2014'}</div></div>
              </div>
            </div>

            {/* Ourico card */}
            <div style={{ ...styles.card, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Teste do Ourico</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { label: 'Passa no Ourico?', value: p.ourico_test },
                  { label: 'Gera Unidade?', value: p.generates_unity },
                  { label: 'Colabora com Expansao?', value: p.collaborates_expansion },
                ].map(item => {
                  const val = item.value === true || item.value === 'sim' ? 'Sim' : item.value === false || item.value === 'nao' ? 'Nao' : 'N/A';
                  const color = val === 'Sim' ? C.green : val === 'Nao' ? C.red : C.t3;
                  const bg = val === 'Sim' ? C.greenBg : val === 'Nao' ? C.redBg : 'var(--cbrio-bg)';
                  return (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: C.t2 }}>{item.label}</span>
                      <span style={styles.badge(color, bg)}>{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SWOT card */}
            {(p.swot_strengths || p.swot_weaknesses || p.swot_opportunities || p.swot_threats) && (
              <div style={{ ...styles.card, padding: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Analise SWOT</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Forcas', value: p.swot_strengths, color: C.green },
                    { label: 'Fraquezas', value: p.swot_weaknesses, color: C.red },
                    { label: 'Oportunidades', value: p.swot_opportunities, color: C.blue },
                    { label: 'Ameacas', value: p.swot_threats, color: C.amber },
                  ].map(q => (
                    <div key={q.label} style={{ borderLeft: `4px solid ${q.color}`, padding: '12px 16px', background: C.bg, borderRadius: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: q.color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{q.label}</div>
                      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{q.value || '\u2014'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* KPIs */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                <span>KPIs ({kpis.length})</span>
                {isDiretor && <button style={{ ...styles.btn('secondary'), ...styles.btnSm }} onClick={() => setModalKpi({})}>+ KPI</button>}
              </div>
              {kpis.length === 0 ? (
                <div style={styles.empty}>Nenhum KPI cadastrado.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                  {kpis.map(kpi => {
                    const current = Number(kpi.current_value) || 0;
                    const target = Number(kpi.target_value) || 1;
                    return (
                      <div key={kpi.id} style={{ ...styles.card, padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{kpi.name}</div>
                          {isDiretor && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button style={{ ...styles.btn('ghost'), ...styles.btnSm, fontSize: 10 }} onClick={() => setModalKpi(kpi)}>Editar</button>
                              <button style={{ ...styles.btn('ghost'), ...styles.btnSm, fontSize: 10, color: C.red }} onClick={() => deleteKpi(kpi.id)}>X</button>
                            </div>
                          )}
                        </div>
                        <ProgressBar value={current} max={target} />
                        <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>
                          {current}/{target} {kpi.unit || ''}
                          {kpi.instrument && <span> | {kpi.instrument}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Description & Notes */}
            {p.description && (
              <div style={{ ...styles.card, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>Descricao</div>
                <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.description}</div>
              </div>
            )}
            {p.notes && (
              <div style={{ ...styles.card, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>Notas</div>
                <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.notes}</div>
              </div>
            )}
          </>
        )}

        {/* ─── Fases ─── */}
        {detailTab === 'fases' && (
          <>
            {phases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 14, color: C.t3, marginBottom: 16 }}>Nenhuma fase cadastrada.</div>
                {isDiretor && <button style={styles.btn('primary')} onClick={initPhases}>Iniciar fases</button>}
              </div>
            ) : (
              <>
                {/* Horizontal stepper */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 24, overflowX: 'auto', padding: '12px 0' }}>
                  {phases.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map((ph, i) => {
                    const isDone = ph.status === 'concluida';
                    const isActive = ph.status === 'em-andamento';
                    const isBlocked = ph.status === 'bloqueada';
                    const circleColor = isDone ? C.green : isActive ? C.primary : isBlocked ? C.red : C.t3;
                    const circleBg = isDone ? C.greenBg : isActive ? C.primaryBg : isBlocked ? C.redBg : 'var(--cbrio-bg)';
                    return (
                      <div key={ph.id} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                          onClick={() => setGanttExpanded(prev => ({ ...prev, activePhase: ph.id }))}>
                          <div style={{
                            width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: circleBg, border: `3px solid ${circleColor}`,
                            boxShadow: isActive ? `0 0 0 4px ${C.primary}30` : 'none',
                            animation: isActive ? 'pulse 2s infinite' : 'none',
                            transition: 'all .2s',
                          }}>
                            {isDone ? (
                              <span style={{ fontSize: 18, color: C.green }}>{'\u2713'}</span>
                            ) : (
                              <span style={{ fontSize: 14, fontWeight: 700, color: circleColor }}>{i + 1}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: isActive ? C.primary : isDone ? C.green : C.t3, marginTop: 6, textAlign: 'center', maxWidth: 90 }}>
                            {ph.name || PHASE_NAMES[i] || `Fase ${i + 1}`}
                          </div>
                        </div>
                        {i < phases.length - 1 && (
                          <div style={{ width: 60, height: 3, background: isDone ? C.green : C.border, margin: '0 4px', marginBottom: 20, borderRadius: 2 }} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Phase detail cards */}
                {phases.map((ph, i) => {
                  const isExpanded = ganttExpanded.activePhase === ph.id;
                  if (!isExpanded && ganttExpanded.activePhase) return null;
                  if (!ganttExpanded.activePhase && i > 0) return null;
                  return (
                    <div key={ph.id} style={{ ...styles.card, padding: 20, marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{ph.name || PHASE_NAMES[i]}</div>
                        <Badge status={ph.status} map={PHASE_STATUS_MAP} />
                      </div>
                      <div style={styles.infoGrid}>
                        <div>
                          <div style={styles.infoLabel}>Periodo</div>
                          <div style={styles.infoValue}>{fmtDate(ph.date_start || ph.start_date)} - {fmtDate(ph.date_end || ph.end_date)}</div>
                        </div>
                        <div>
                          <div style={styles.infoLabel}>Responsavel</div>
                          <div style={styles.infoValue}>{ph.responsible || '\u2014'}</div>
                        </div>
                      </div>
                      {isDiretor && (
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
                          <label style={styles.label}>Status</label>
                          <select style={styles.select} value={ph.status} onChange={e => updatePhaseField(ph.id, 'status', e.target.value)}>
                            {Object.entries(PHASE_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </div>
                      )}
                      {isDiretor && (
                        <div style={{ marginTop: 12 }}>
                          <label style={styles.label}>Notas</label>
                          <textarea style={{ ...styles.input, minHeight: 60, resize: 'vertical' }} defaultValue={ph.notes || ''}
                            onBlur={e => updatePhaseField(ph.id, 'notes', e.target.value)} />
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Show first phase by default if none selected */}
                {!ganttExpanded.activePhase && phases.length > 0 && (() => {
                  const ph = phases[0];
                  return null; // Already rendered above
                })()}
              </>
            )}
          </>
        )}

        {/* ─── Tarefas ─── */}
        {detailTab === 'tarefas' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['lista', 'kanban'].map(v => (
                  <button key={v} onClick={() => setTaskView(v)} style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: taskView === v ? 700 : 400, cursor: 'pointer',
                    border: taskView === v ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                    background: taskView === v ? C.primaryBg : 'transparent', color: taskView === v ? C.primary : C.t3,
                  }}>{v === 'lista' ? 'Lista' : 'Kanban'}</button>
                ))}
              </div>
              {isDiretor && <button style={{ ...styles.btn('primary'), ...styles.btnSm }} onClick={() => setModalTask({})}>+ Tarefa</button>}
            </div>

            {taskView === 'lista' ? (
              /* Task list view */
              tasks.length === 0 ? <div style={styles.empty}>Nenhuma tarefa cadastrada.</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sortByUrgency(tasks).map(t => {
                    const subs = t.subtasks || [];
                    const comments = t.comments || [];
                    const subsDone = subs.filter(s => s.done).length;
                    return (
                      <div key={t.id} style={{ ...styles.card, padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{t.name}</div>
                            <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>
                              {t.responsible || '\u2014'} | {fmtDate(t.deadline)} <DaysCounter date={t.deadline} status={t.status} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <Badge status={t.priority} map={PRIORITY_MAP} />
                            {isDiretor ? (
                              <select style={{ ...styles.select, fontSize: 11, padding: '2px 6px' }} value={t.status}
                                onChange={e => changeTaskStatus(t.id, e.target.value)}>
                                {Object.entries(TASK_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                              </select>
                            ) : <Badge status={t.status} map={TASK_STATUS_MAP} />}
                            {isDiretor && (
                              <div style={{ display: 'flex', gap: 2 }}>
                                <button style={{ ...styles.btn('ghost'), ...styles.btnSm, fontSize: 10 }} onClick={() => setModalTask(t)}>Editar</button>
                                <button style={{ ...styles.btn('ghost'), ...styles.btnSm, fontSize: 10, color: C.red }} onClick={() => deleteTask(t.id)}>X</button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Subtask progress */}
                        {subs.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 11, color: C.t3, marginBottom: 4 }}>Subtarefas ({subsDone}/{subs.length})</div>
                            {subs.map(sub => (
                              <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 12, color: C.text }}>
                                <input type="checkbox" checked={!!sub.done} onChange={() => toggleSubtask(sub.id, !sub.done)} style={{ cursor: 'pointer', width: 14, height: 14, accentColor: C.primary }} />
                                <span style={sub.done ? { textDecoration: 'line-through', color: C.t3 } : {}}>{sub.name}</span>
                                {isDiretor && <button onClick={() => deleteSubtask(sub.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.red, fontSize: 10, marginLeft: 'auto' }}>{'\u2715'}</button>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add subtask */}
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          <input style={{ ...styles.input, padding: '4px 8px', fontSize: 11 }} placeholder="Nova subtarefa..."
                            value={newSubtask[t.id] || ''} onChange={e => setNewSubtask(prev => ({ ...prev, [t.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') addSubtask(t.id); }} />
                          <button style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: C.primary, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }} onClick={() => addSubtask(t.id)}>+</button>
                        </div>

                        {/* Comments */}
                        {comments.length > 0 && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                            {comments.map((c, ci) => (
                              <div key={ci} style={{ background: C.bg, borderRadius: 8, padding: '6px 10px', marginBottom: 4, fontSize: 12, color: C.t2 }}>
                                <span style={{ fontWeight: 600 }}>{c.author_name || 'Anonimo'}</span>: {c.text}
                                <span style={{ fontSize: 10, color: C.t3, marginLeft: 8 }}>{fmtDate(c.created_at)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add comment */}
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          <input style={{ ...styles.input, padding: '4px 8px', fontSize: 11 }} placeholder="Comentar..."
                            value={newComment[t.id] || ''} onChange={e => setNewComment(prev => ({ ...prev, [t.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') addComment(t.id); }} />
                          <button style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: C.primary, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }} onClick={() => addComment(t.id)}>Enviar</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Task kanban view */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, minHeight: 300 }}>
                {Object.entries(TASK_STATUS_MAP).map(([colKey, colInfo]) => {
                  const colTasks = sortByUrgency(tasks.filter(t => t.status === colKey));
                  const isTarget = taskDropCol === colKey;
                  return (
                    <div key={colKey}
                      onDragOver={e => { e.preventDefault(); setTaskDropCol(colKey); }}
                      onDragLeave={() => setTaskDropCol(null)}
                      onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('taskKanbanId'); if (id) changeTaskStatus(id, colKey); setTaskDropCol(null); setTaskDragId(null); }}
                      style={{
                        background: isTarget ? `${colInfo.c}10` : C.bg, borderRadius: 10, padding: 8,
                        border: isTarget ? `2px dashed ${colInfo.c}` : `1px solid ${C.border}`, transition: 'all .15s',
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: colInfo.c, textTransform: 'uppercase', letterSpacing: 0.4 }}>{colInfo.label}</span>
                        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: C.card, border: `1px solid ${C.border}`, color: C.t3 }}>{colTasks.length}</span>
                      </div>
                      {colTasks.length === 0 && <div style={{ padding: 12, textAlign: 'center', fontSize: 10, color: C.t3, border: `1.5px dashed ${C.border}`, borderRadius: 8 }}>{'\u2014'}</div>}
                      {colTasks.map(t => {
                        const subs = t.subtasks || [];
                        const subsDone = subs.filter(s => s.done).length;
                        const isDragging = taskDragId === t.id;
                        return (
                          <div key={t.id} draggable
                            onDragStart={e => { e.dataTransfer.setData('taskKanbanId', t.id); setTaskDragId(t.id); }}
                            onDragEnd={() => { setTaskDragId(null); setTaskDropCol(null); }}
                            style={{
                              background: C.card, borderRadius: 8, padding: '10px 12px', marginBottom: 6,
                              border: `1px solid ${C.border}`, cursor: 'grab', opacity: isDragging ? 0.4 : 1,
                              transition: 'all .15s',
                            }}
                            onMouseEnter={e => { if (!isDragging) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>{t.name}</div>
                            <div style={{ fontSize: 10, color: C.t3, marginBottom: 4 }}>{t.responsible || '\u2014'}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 10, color: C.t3 }}>{fmtDate(t.deadline)}</span>
                              <DaysCounter date={t.deadline} status={t.status} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                              <Badge status={t.priority} map={PRIORITY_MAP} />
                              {subs.length > 0 && <span style={{ fontSize: 9, color: C.t3 }}>{subsDone}/{subs.length}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ─── Riscos ─── */}
        {detailTab === 'riscos' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Riscos ({risks.length})</div>
              {isDiretor && <button style={{ ...styles.btn('primary'), ...styles.btnSm }} onClick={() => setModalRisk({})}>+ Risco</button>}
            </div>
            {risks.length === 0 ? <div style={styles.empty}>Nenhum risco cadastrado.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {risks.map(r => {
                  const score = (Number(r.probability) || 1) * (Number(r.impact) || 1);
                  const borderColor = score >= 15 ? C.red : score >= 8 ? C.amber : C.green;
                  return (
                    <div key={r.id} style={{ ...styles.card, padding: 16, borderLeft: `4px solid ${borderColor}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{r.title}</div>
                          <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>
                            Prob.: {r.probability} x Imp.: {r.impact} = <span style={{ fontWeight: 700, color: borderColor }}>Score {score}</span>
                          </div>
                        </div>
                        {isDiretor && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button style={{ ...styles.btn('ghost'), ...styles.btnSm, fontSize: 10 }} onClick={() => setModalRisk(r)}>Editar</button>
                            <button style={{ ...styles.btn('ghost'), ...styles.btnSm, fontSize: 10, color: C.red }} onClick={() => deleteRisk(r.id)}>X</button>
                          </div>
                        )}
                      </div>
                      {r.description && <div style={{ fontSize: 12, color: C.t2, marginBottom: 6 }}>{r.description}</div>}
                      {r.mitigation && (
                        <div style={{ fontSize: 12, color: C.t2, background: C.bg, padding: '8px 12px', borderRadius: 6, marginBottom: 6 }}>
                          <span style={{ fontWeight: 600 }}>Mitigacao:</span> {r.mitigation}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, color: C.t3 }}>
                        {r.owner_name && <span>Responsavel: {r.owner_name}</span>}
                        {r.status && isDiretor && (
                          <select style={{ ...styles.select, fontSize: 11, padding: '2px 6px' }} value={r.status}
                            onChange={e => saveRisk({ ...r, status: e.target.value })}>
                            <option value="aberto">Aberto</option>
                            <option value="mitigado">Mitigado</option>
                            <option value="fechado">Fechado</option>
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ─── Orcamento ─── */}
        {detailTab === 'orcamento' && (
          <>
            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Investimento', value: fmtMoney(p.budget_planned), color: C.blue },
                { label: 'Arrecadacao', value: fmtMoney(p.budget_revenue), color: C.green },
                { label: 'Custo para Igreja', value: fmtMoney(p.budget_church_cost), color: C.amber },
              ].map(item => (
                <div key={item.label} style={{ ...styles.card, padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.t3, textTransform: 'uppercase', marginBottom: 6 }}>{item.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Progress */}
            {p.budget_planned > 0 && (
              <div style={{ ...styles.card, padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.t2, marginBottom: 8 }}>
                  <span>Gasto: {fmtMoney(p.budget_spent)}</span>
                  <span>Planejado: {fmtMoney(p.budget_planned)}</span>
                </div>
                <div style={{ height: 10, background: C.border, borderRadius: 5 }}>
                  <div style={{ height: '100%', width: `${Math.min(((Number(p.budget_spent) || 0) / Number(p.budget_planned)) * 100, 100)}%`, borderRadius: 5, background: (Number(p.budget_spent) || 0) > Number(p.budget_planned) ? C.red : C.green, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 12, color: C.t3, marginTop: 6 }}>
                  {Math.round(((Number(p.budget_spent) || 0) / (Number(p.budget_planned) || 1)) * 100)}% utilizado
                </div>
              </div>
            )}

            {/* Items table */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Itens ({budgetItems.length})</div>
              {isDiretor && <button style={{ ...styles.btn('primary'), ...styles.btnSm }} onClick={() => setModalBudget({})}>+ Item</button>}
            </div>
            {budgetItems.length === 0 ? <div style={styles.empty}>Nenhum item de orcamento.</div> : (
              <div style={styles.card}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Descricao</th>
                      <th style={styles.th}>Categoria</th>
                      <th style={styles.th}>Planejado</th>
                      <th style={styles.th}>Real</th>
                      <th style={styles.th}>Data</th>
                      {isDiretor && <th style={styles.th}>Acoes</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {budgetItems.map(bi => {
                      const catLabel = BUDGET_CATEGORIES.find(c => c.value === bi.category)?.label || bi.category || '\u2014';
                      const catColor = bi.category === 'investimento' ? C.blue : bi.category === 'receita' ? C.green : C.amber;
                      return (
                        <tr key={bi.id}>
                          <td style={styles.td}>{bi.description}</td>
                          <td style={styles.td}><span style={styles.badge(catColor, catColor + '18')}>{catLabel}</span></td>
                          <td style={styles.td}>{fmtMoney(bi.planned_amount)}</td>
                          <td style={styles.td}>{fmtMoney(bi.actual_amount)}</td>
                          <td style={styles.td}>{fmtDate(bi.date)}</td>
                          {isDiretor && (
                            <td style={styles.td}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button style={{ ...styles.btn('ghost'), ...styles.btnSm, fontSize: 10 }} onClick={() => setModalBudget(bi)}>Editar</button>
                                <button style={{ ...styles.btn('ghost'), ...styles.btnSm, fontSize: 10, color: C.red }} onClick={() => deleteBudgetItem(bi.id)}>X</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ─── Retrospectiva ─── */}
        {detailTab === 'retrospectiva' && (
          <>
            {/* Rating */}
            <div style={{ ...styles.card, padding: 20, marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Avaliacao Geral</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <span key={star} onClick={() => setRetroForm(f => ({ ...f, rating: star }))}
                    style={{ fontSize: 32, cursor: 'pointer', color: star <= (retroForm.rating || 0) ? C.amber : C.t3, transition: 'color .15s' }}>
                    {'\u2605'}
                  </span>
                ))}
              </div>
              {retroForm.rating && <div style={{ fontSize: 13, color: C.t2, marginTop: 6 }}>{retroForm.rating}/5</div>}
            </div>

            {/* Textareas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ ...styles.card, padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 8 }}>O que deu certo</div>
                <textarea style={{ ...styles.input, minHeight: 80, resize: 'vertical' }}
                  value={retroForm.what_went_well || ''} onChange={e => setRetroForm(f => ({ ...f, what_went_well: e.target.value }))} />
              </div>
              <div style={{ ...styles.card, padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.amber, marginBottom: 8 }}>O que melhorar</div>
                <textarea style={{ ...styles.input, minHeight: 80, resize: 'vertical' }}
                  value={retroForm.what_to_improve || ''} onChange={e => setRetroForm(f => ({ ...f, what_to_improve: e.target.value }))} />
              </div>
              <div style={{ ...styles.card, padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.blue, marginBottom: 8 }}>Acoes</div>
                <textarea style={{ ...styles.input, minHeight: 80, resize: 'vertical' }}
                  value={retroForm.actions || ''} onChange={e => setRetroForm(f => ({ ...f, actions: e.target.value }))} />
              </div>
            </div>

            {/* Save button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button style={styles.btn('primary')} onClick={saveRetrospective}>Salvar Retrospectiva</button>
            </div>
          </>
        )}

        <div style={{ height: 40 }} />
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Projetos</div>
          <div style={styles.subtitle}>Planejamento e acompanhamento de 67 projetos estrategicos</div>
        </div>
        {isDiretor && tab !== 4 && (
          <button style={styles.btn('primary')} onClick={() => setModalProject({})}>+ Novo Projeto</button>
        )}
      </div>

      {/* Tabs (hide Detail tab from bar) */}
      {tab !== 4 && (
        <div style={styles.tabs}>
          {TABS.map((t, i) => (
            <button key={t} style={styles.tab(tab === i)} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>
      )}

      {error && <div style={{ color: C.red, marginBottom: 12, fontSize: 13 }}>{error}</div>}

      {tab === 0 && renderHome()}
      {tab === 1 && renderList()}
      {tab === 2 && renderKanban()}
      {tab === 3 && renderGantt()}
      {tab === 4 && renderDetail()}

      {/* ═══════════════════════════════════════════════════ */}
      {/* MODALS                                             */}
      {/* ═══════════════════════════════════════════════════ */}

      {/* Project Form Modal */}
      <ProjectFormModal open={!!modalProject} data={modalProject} categories={categories} onClose={() => setModalProject(null)} onSave={saveProject} isDiretor={isDiretor} />

      {/* Task Form Modal */}
      <TaskFormModal open={!!modalTask} data={modalTask} milestones={detail?.milestones || []} usersList={usersList} onClose={() => setModalTask(null)} onSave={saveTask} />

      {/* Risk Form Modal */}
      <RiskFormModal open={!!modalRisk} data={modalRisk} onClose={() => setModalRisk(null)} onSave={saveRisk} />

      {/* KPI Form Modal */}
      <KpiFormModal open={!!modalKpi} data={modalKpi} onClose={() => setModalKpi(null)} onSave={saveKpi} />

      {/* Budget Item Form Modal */}
      <BudgetItemFormModal open={!!modalBudget} data={modalBudget} onClose={() => setModalBudget(null)} onSave={saveBudgetItem} />

      {/* Milestone Form Modal */}
      <MilestoneFormModal open={!!modalMilestone} data={modalMilestone} onClose={() => setModalMilestone(null)} onSave={saveMilestone} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════

function ProjectFormModal({ open, data, categories, onClose, onSave, isDiretor }) {
  const [form, setForm] = useState({});
  useEffect(() => { if (data) setForm({ status: 'no-prazo', priority: 'media', year: new Date().getFullYear(), ...data }); }, [data]);
  if (!open || !isDiretor) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = () => {
    if (!form.name) { alert('Nome e obrigatorio'); return; }
    onSave(form);
  };
  return (
    <Modal open title={form.id ? 'Editar Projeto' : 'Novo Projeto'} onClose={onClose}
      footer={<><button style={styles.btn('ghost')} onClick={onClose}>Cancelar</button><button style={styles.btn('primary')} onClick={handleSave}>Salvar</button></>}>
      <Input label="Nome *" value={form.name || ''} onChange={e => set('name', e.target.value)} />
      <div style={styles.formRow}>
        <Select label="Categoria" value={form.category_id || ''} onChange={e => set('category_id', e.target.value)}>
          <option value="">Selecione</option>
          {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Input label="Lider" value={form.leader || ''} onChange={e => set('leader', e.target.value)} />
      </div>
      <div style={styles.formRow}>
        <Input label="Responsavel" value={form.responsible || ''} onChange={e => set('responsible', e.target.value)} />
        <Input label="Area" value={form.area || ''} onChange={e => set('area', e.target.value)} />
      </div>
      <div style={styles.formRow}>
        <Input label="Ano" type="number" value={form.year || ''} onChange={e => set('year', e.target.value)} />
        <Input label="Frequencia" value={form.frequency || ''} onChange={e => set('frequency', e.target.value)} />
      </div>
      <div style={styles.formRow}>
        <Input label="Data Inicio" type="date" value={normDate(form.date_start) || ''} onChange={e => set('date_start', e.target.value)} />
        <Input label="Data Fim" type="date" value={normDate(form.date_end) || ''} onChange={e => set('date_end', e.target.value)} />
      </div>
      <div style={styles.formRow}>
        <Input label="Publico-alvo" value={form.public_target || ''} onChange={e => set('public_target', e.target.value)} />
        <Select label="Complexidade" value={form.complexity || ''} onChange={e => set('complexity', e.target.value)}>
          <option value="">Selecione</option>
          <option value="baixa">Baixa</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
        </Select>
      </div>
      <div style={styles.formRow}>
        <Select label="Impacto" value={form.impact || ''} onChange={e => set('impact', e.target.value)}>
          <option value="">Selecione</option>
          <option value="baixo">Baixo</option>
          <option value="medio">Medio</option>
          <option value="alto">Alto</option>
        </Select>
        <Select label="Prioridade" value={form.priority || ''} onChange={e => set('priority', e.target.value)}>
          {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>
      <div style={styles.formRow}>
        <Select label="Status" value={form.status || ''} onChange={e => set('status', e.target.value)}>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select label="Ourico" value={form.ourico_test || ''} onChange={e => set('ourico_test', e.target.value)}>
          <option value="">Selecione</option>
          <option value="sim">Sim</option>
          <option value="nao">Nao</option>
        </Select>
      </div>
      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={!!form.generates_unity} onChange={e => set('generates_unity', e.target.checked)} style={{ accentColor: C.primary }} />
            Gera Unidade?
          </label>
        </div>
        <div style={styles.formGroup}>
          <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={!!form.collaborates_expansion} onChange={e => set('collaborates_expansion', e.target.checked)} style={{ accentColor: C.primary }} />
            Colabora com Expansao?
          </label>
        </div>
      </div>
      <div style={styles.formRow}>
        <Input label="Orcamento Planejado" type="number" step="0.01" value={form.budget_planned || ''} onChange={e => set('budget_planned', e.target.value)} />
        <Input label="Receita Prevista" type="number" step="0.01" value={form.budget_revenue || ''} onChange={e => set('budget_revenue', e.target.value)} />
      </div>
      <Input label="Custo para Igreja" type="number" step="0.01" value={form.budget_church_cost || ''} onChange={e => set('budget_church_cost', e.target.value)} />
      <Textarea label="Descricao" value={form.description || ''} onChange={e => set('description', e.target.value)} />
      <Textarea label="Notas" value={form.notes || ''} onChange={e => set('notes', e.target.value)} />

      {/* SWOT */}
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 12, marginBottom: 8 }}>Analise SWOT</div>
      <div style={styles.formRow}>
        <Textarea label="Forcas" value={form.swot_strengths || ''} onChange={e => set('swot_strengths', e.target.value)} />
        <Textarea label="Fraquezas" value={form.swot_weaknesses || ''} onChange={e => set('swot_weaknesses', e.target.value)} />
      </div>
      <div style={styles.formRow}>
        <Textarea label="Oportunidades" value={form.swot_opportunities || ''} onChange={e => set('swot_opportunities', e.target.value)} />
        <Textarea label="Ameacas" value={form.swot_threats || ''} onChange={e => set('swot_threats', e.target.value)} />
      </div>
    </Modal>
  );
}

function TaskFormModal({ open, data, milestones, usersList, onClose, onSave }) {
  const [form, setForm] = useState({});
  useEffect(() => { if (data) setForm({ status: 'pendente', priority: 'media', ...data }); }, [data]);
  if (!open) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = () => {
    if (!form.name) { alert('Nome e obrigatorio'); return; }
    onSave(form);
  };
  return (
    <Modal open title={form.id ? 'Editar Tarefa' : 'Nova Tarefa'} onClose={onClose}
      footer={<><button style={styles.btn('ghost')} onClick={onClose}>Cancelar</button><button style={styles.btn('primary')} onClick={handleSave}>Salvar</button></>}>
      <Input label="Nome *" value={form.name || ''} onChange={e => set('name', e.target.value)} />
      <div style={styles.formGroup}>
        <label style={styles.label}>Responsavel</label>
        <input style={styles.input} list="users-list-task" value={form.responsible || ''} onChange={e => set('responsible', e.target.value)} placeholder="Digite o nome..." />
        <datalist id="users-list-task">
          {usersList.map((u, i) => <option key={i} value={u.name || u.email} />)}
        </datalist>
      </div>
      {milestones && milestones.length > 0 && (
        <Select label="Marco" value={form.milestone_id || ''} onChange={e => set('milestone_id', e.target.value)}>
          <option value="">Nenhum</option>
          {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
      )}
      <div style={styles.formRow}>
        <Input label="Data Inicio" type="date" value={normDate(form.start_date) || ''} onChange={e => set('start_date', e.target.value)} />
        <Input label="Prazo" type="date" value={normDate(form.deadline) || ''} onChange={e => set('deadline', e.target.value)} />
      </div>
      <div style={styles.formRow}>
        <Select label="Status" value={form.status || ''} onChange={e => set('status', e.target.value)}>
          {Object.entries(TASK_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select label="Prioridade" value={form.priority || ''} onChange={e => set('priority', e.target.value)}>
          {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>
      <Textarea label="Descricao" value={form.description || ''} onChange={e => set('description', e.target.value)} />
    </Modal>
  );
}

function RiskFormModal({ open, data, onClose, onSave }) {
  const [form, setForm] = useState({});
  useEffect(() => { if (data) setForm({ probability: 1, impact: 1, ...data }); }, [data]);
  if (!open) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = () => {
    if (!form.title) { alert('Titulo e obrigatorio'); return; }
    onSave(form);
  };
  return (
    <Modal open title={form.id ? 'Editar Risco' : 'Novo Risco'} onClose={onClose}
      footer={<><button style={styles.btn('ghost')} onClick={onClose}>Cancelar</button><button style={styles.btn('primary')} onClick={handleSave}>Salvar</button></>}>
      <Input label="Titulo *" value={form.title || ''} onChange={e => set('title', e.target.value)} />
      <Textarea label="Descricao" value={form.description || ''} onChange={e => set('description', e.target.value)} />
      <div style={styles.formRow}>
        <Select label="Probabilidade (1-5)" value={form.probability || 1} onChange={e => set('probability', Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
        </Select>
        <Select label="Impacto (1-5)" value={form.impact || 1} onChange={e => set('impact', Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
        </Select>
      </div>
      <Textarea label="Mitigacao" value={form.mitigation || ''} onChange={e => set('mitigation', e.target.value)} />
      <Input label="Responsavel do Risco" value={form.owner_name || ''} onChange={e => set('owner_name', e.target.value)} />
    </Modal>
  );
}

function KpiFormModal({ open, data, onClose, onSave }) {
  const [form, setForm] = useState({});
  useEffect(() => { if (data) setForm({ ...data }); }, [data]);
  if (!open) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = () => {
    if (!form.name) { alert('Nome e obrigatorio'); return; }
    onSave(form);
  };
  return (
    <Modal open title={form.id ? 'Editar KPI' : 'Novo KPI'} onClose={onClose}
      footer={<><button style={styles.btn('ghost')} onClick={onClose}>Cancelar</button><button style={styles.btn('primary')} onClick={handleSave}>Salvar</button></>}>
      <Input label="Nome *" value={form.name || ''} onChange={e => set('name', e.target.value)} />
      <div style={styles.formRow}>
        <Input label="Valor Alvo" type="number" value={form.target_value || ''} onChange={e => set('target_value', e.target.value)} />
        <Input label="Unidade" value={form.unit || ''} onChange={e => set('unit', e.target.value)} placeholder="ex: pessoas, %" />
      </div>
      {form.id && (
        <Input label="Valor Atual" type="number" value={form.current_value || ''} onChange={e => set('current_value', e.target.value)} />
      )}
      <Input label="Instrumento de Medicao" value={form.instrument || ''} onChange={e => set('instrument', e.target.value)} />
    </Modal>
  );
}

function BudgetItemFormModal({ open, data, onClose, onSave }) {
  const [form, setForm] = useState({});
  useEffect(() => { if (data) setForm({ ...data }); }, [data]);
  if (!open) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = () => {
    if (!form.description) { alert('Descricao e obrigatoria'); return; }
    onSave(form);
  };
  return (
    <Modal open title={form.id ? 'Editar Item' : 'Novo Item de Orcamento'} onClose={onClose}
      footer={<><button style={styles.btn('ghost')} onClick={onClose}>Cancelar</button><button style={styles.btn('primary')} onClick={handleSave}>Salvar</button></>}>
      <Input label="Descricao *" value={form.description || ''} onChange={e => set('description', e.target.value)} />
      <Select label="Categoria" value={form.category || ''} onChange={e => set('category', e.target.value)}>
        <option value="">Selecione</option>
        {BUDGET_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </Select>
      <div style={styles.formRow}>
        <Input label="Valor Planejado" type="number" step="0.01" value={form.planned_amount || ''} onChange={e => set('planned_amount', e.target.value)} />
        <Input label="Valor Real" type="number" step="0.01" value={form.actual_amount || ''} onChange={e => set('actual_amount', e.target.value)} />
      </div>
      <Input label="Data" type="date" value={normDate(form.date) || ''} onChange={e => set('date', e.target.value)} />
    </Modal>
  );
}

function MilestoneFormModal({ open, data, onClose, onSave }) {
  const [form, setForm] = useState({});
  useEffect(() => { if (data) setForm({ ...data }); }, [data]);
  if (!open) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = () => {
    if (!form.name) { alert('Nome e obrigatorio'); return; }
    onSave(form);
  };
  return (
    <Modal open title={form.id ? 'Editar Marco' : 'Novo Marco'} onClose={onClose}
      footer={<><button style={styles.btn('ghost')} onClick={onClose}>Cancelar</button><button style={styles.btn('primary')} onClick={handleSave}>Salvar</button></>}>
      <Input label="Nome *" value={form.name || ''} onChange={e => set('name', e.target.value)} />
      <div style={styles.formRow}>
        <Input label="Data Inicio" type="date" value={normDate(form.date_start) || ''} onChange={e => set('date_start', e.target.value)} />
        <Input label="Data Fim" type="date" value={normDate(form.date_end) || ''} onChange={e => set('date_end', e.target.value)} />
      </div>
      <Textarea label="Descricao" value={form.description || ''} onChange={e => set('description', e.target.value)} />
    </Modal>
  );
}
