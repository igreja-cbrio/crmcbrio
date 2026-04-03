import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { events, meetings, cycles as cyclesApi, occurrences as occApi, tasks as tasksApi, dashboard as dashApi, risks as risksApi, retrospective as retroApi, history as historyApi } from '../../api';
import CycleView from './components/CycleView';
import BudgetPanel from './components/BudgetPanel';

// ── Tema ────────────────────────────────────────────────────
const C = {
  bg: '#f3f4f6', card: '#fff', primary: '#7c3aed', primaryBg: '#ede9fe',
  text: '#1a1a2e', text2: '#6b7280', text3: '#9ca3af',
  border: '#e5e7eb', green: '#10b981', greenBg: '#d1fae5',
  red: '#ef4444', redBg: '#fee2e2', amber: '#f59e0b', amberBg: '#fef3c7',
  blue: '#3b82f6', blueBg: '#dbeafe',
};

const STATUS_MAP = {
  'no-prazo': { c: C.green, bg: C.greenBg, label: 'No Prazo' },
  'atencao': { c: C.amber, bg: C.amberBg, label: 'Atenção' },
  'atrasado': { c: C.red, bg: C.redBg, label: 'Atrasado' },
  'concluido': { c: C.blue, bg: C.blueBg, label: 'Concluído' },
};

const TASK_STATUS_MAP = {
  'pendente': { c: C.text3, bg: '#f3f4f6', label: 'Pendente' },
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
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 },
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
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 60, zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 16, width: '95%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
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
  commentBox: { background: '#fafafa', borderRadius: 8, padding: '8px 12px', marginTop: 6, fontSize: 12, color: C.text2 },
  dot: (color) => ({ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 6 }),
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', color: C.primary, fontWeight: 600, fontSize: 13, padding: 0, marginBottom: 16 },
  inlineInput: { padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, outline: 'none', flex: 1 },
  inlineBtn: { padding: '4px 10px', borderRadius: 6, border: 'none', background: C.primary, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
};

// ── Helpers ─────────────────────────────────────────────────
function normDate(d) { return d ? (typeof d === 'string' ? d.slice(0, 10) : '') : ''; }
const fmtDate = (d) => { const s = normDate(d); if (!s) return '—'; const [y, m, day] = s.split('-'); return `${day}/${m}/${y}`; };
const fmtMoney = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
function sortByUrgency(tasks) {
  return [...tasks].sort((a, b) => {
    const pa = normDate(a.prazo || a.deadline); const pb = normDate(b.prazo || b.deadline);
    if (!pa && !pb) return 0; if (!pa) return 1; if (!pb) return -1;
    return pa.localeCompare(pb);
  });
}

function DaysCounter({ date, status }) {
  const s = normDate(date);
  if (!s || status === 'concluido') return null;
  const diff = Math.ceil((new Date(s + 'T12:00:00') - new Date()) / 86400000);
  const color = diff < 0 ? C.red : diff <= 7 ? C.amber : C.green;
  const text = diff < 0 ? `${Math.abs(diff)}d atrás` : diff === 0 ? 'Hoje' : `${diff}d`;
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
  const s = map[status] || { c: C.text3, bg: '#f3f4f6', label: status || '—' };
  return <span style={styles.badge(s.c, s.bg)}>{s.label}</span>;
}

// ── Calendário interativo ───────────────────────────────────
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEK_DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function BigCalendar({ eventsByDate, onSelectDate, selectedDate }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => setViewMonth(new Date(year, month - 1, 1))} style={{ ...styles.btn('ghost'), fontSize: 16 }}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{MONTH_NAMES[month]} {year}</span>
        <button onClick={() => setViewMonth(new Date(year, month + 1, 1))} style={{ ...styles.btn('ghost'), fontSize: 16 }}>›</button>
      </div>
      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${C.border}` }}>
        {WEEK_DAYS.map(d => (
          <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase' }}>{d}</div>
        ))}
      </div>
      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((d, i) => {
          if (!d) return <div key={`e${i}`} style={{ minHeight: 80, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }} />;
          const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const evs = eventsByDate[ds] || [];
          const isToday = ds === today;
          const isSelected = ds === selectedDate;
          return (
            <div key={d} onClick={() => onSelectDate(ds)} style={{
              minHeight: 80, padding: '4px 6px', cursor: 'pointer', borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
              background: isSelected ? C.primaryBg : isToday ? '#fafafa' : '#fff',
              transition: 'background 0.1s',
            }}>
              <div style={{
                fontSize: 12, fontWeight: isToday ? 800 : 400, marginBottom: 4,
                color: isToday ? '#fff' : C.text,
                ...(isToday ? { background: C.primary, borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}),
              }}>
                {d}
              </div>
              {evs.slice(0, 3).map((ev, j) => {
                const st = STATUS_MAP[ev.status];
                return (
                  <div key={j} style={{
                    fontSize: 10, padding: '1px 4px', marginBottom: 2, borderRadius: 4, overflow: 'hidden',
                    whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    background: ev.category_color ? `${ev.category_color}20` : C.primaryBg,
                    color: ev.category_color || C.primary,
                    borderLeft: `3px solid ${st?.c || C.text3}`,
                  }}>
                    {ev.name}
                  </div>
                );
              })}
              {evs.length > 3 && <div style={{ fontSize: 9, color: C.text3, fontWeight: 600 }}>+{evs.length - 3} mais</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── KPI Cards (estilo unificado) ─────────────────────────────
const EV_STAT_SVGS = [
  <svg key="e0" style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '67%', pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 300 200" fill="none"><circle cx="220" cy="100" r="90" fill="#fff" fillOpacity="0.08" /><circle cx="260" cy="60" r="60" fill="#fff" fillOpacity="0.10" /></svg>,
  <svg key="e1" style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '67%', pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 300 200" fill="none"><circle cx="200" cy="140" r="100" fill="#fff" fillOpacity="0.07" /><circle cx="270" cy="40" r="50" fill="#fff" fillOpacity="0.09" /></svg>,
  <svg key="e2" style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '67%', pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 300 200" fill="none"><circle cx="240" cy="80" r="80" fill="#fff" fillOpacity="0.08" /><circle cx="280" cy="150" r="55" fill="#fff" fillOpacity="0.10" /></svg>,
  <svg key="e3" style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '67%', pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 300 200" fill="none"><circle cx="210" cy="120" r="95" fill="#fff" fillOpacity="0.07" /><circle cx="265" cy="50" r="45" fill="#fff" fillOpacity="0.10" /></svg>,
  <svg key="e4" style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '67%', pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 300 200" fill="none"><circle cx="230" cy="90" r="85" fill="#fff" fillOpacity="0.08" /><circle cx="270" cy="160" r="50" fill="#fff" fillOpacity="0.09" /></svg>,
  <svg key="e5" style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '67%', pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 300 200" fill="none"><circle cx="200" cy="100" r="90" fill="#fff" fillOpacity="0.07" /><circle cx="260" cy="40" r="60" fill="#fff" fillOpacity="0.10" /></svg>,
  <svg key="e6" style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '67%', pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 300 200" fill="none"><circle cx="220" cy="110" r="88" fill="#fff" fillOpacity="0.08" /><circle cx="275" cy="55" r="52" fill="#fff" fillOpacity="0.09" /></svg>,
];

function EvStatCard({ label, value, bg, svg }) {
  return (
    <div
      style={{ position: 'relative', overflow: 'hidden', background: bg, borderRadius: 12, padding: '20px 24px', color: '#fff', minHeight: 100, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {svg}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>{value}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
export default function Eventos() {
  const { profile, user } = useAuth();
  const userRole = profile?.role || '';
  const userArea = profile?.area || '';
  const userId = user?.id || '';
  const isPMO = ['diretor', 'admin'].includes(userRole);
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

  // PMO KPIs + workload
  const [pmoKpis, setPmoKpis] = useState(null);
  const [workload, setWorkload] = useState([]);

  // Lista melhorias
  const [hideDone, setHideDone] = useState(true);
  const [sortCol, setSortCol] = useState('date');
  const [sortAsc, setSortAsc] = useState(true);

  // Card expandido (clicável)
  const [expandedCard, setExpandedCard] = useState(null); // 'task-id', 'meeting-id', 'risk-id'

  // Riscos, retrospectiva, histórico do evento selecionado
  const [eventRisks, setEventRisks] = useState([]);
  const [retroData, setRetroData] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);
  const [showRetroForm, setShowRetroForm] = useState(false);
  const [showRiskForm, setShowRiskForm] = useState(false);

  // Kanban
  const [kanbanTasks, setKanbanTasks] = useState([]);
  const [kanbanFilter, setKanbanFilter] = useState('');
  const [kanbanLoading, setKanbanLoading] = useState(false);

  // Home / Calendário
  const [selectedDate, setSelectedDate] = useState(null);

  // Ocorrência expandida
  const [expandedOcc, setExpandedOcc] = useState(null);  // { ...occurrence, tasks, meetings }
  const [occTaskName, setOccTaskName] = useState('');
  const [occMeetingTitle, setOccMeetingTitle] = useState('');
  const [occMeetingDate, setOccMeetingDate] = useState('');

  // Ciclo criativo
  const [hasCycle, setHasCycle] = useState(false);
  const [detailTab, setDetailTab] = useState('info');

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
      setTab(4);
      setExpandedOcc(null);
      setExpandedCard(null);
      // Carregar riscos, retrospectiva, histórico
      risksApi.list(id).then(d => setEventRisks(d)).catch(() => setEventRisks([]));
      retroApi.get(id).then(d => setRetroData(d)).catch(() => setRetroData(null));
      historyApi.list(id).then(d => setAuditHistory(d)).catch(() => setAuditHistory([]));
      // Verificar se tem ciclo criativo
      try {
        const cycleData = await cyclesApi.get(id);
        setHasCycle(!!cycleData?.cycle);
        setDetailTab('tarefas');
      } catch {
        setHasCycle(false);
        setDetailTab('tarefas');
      }
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

  useEffect(() => {
    loadCategories(); loadDash(); loadEvents();
    dashApi.pmo().then(d => setPmoKpis(d)).catch(() => {});
    dashApi.workload().then(d => setWorkload(d)).catch(() => {});
  }, []);
  useEffect(() => { loadEvents(); }, [filtroStatus, filtroCategoria]);

  // ── Event CRUD ──
  async function saveEvent(data) {
    try {
      const ativarCiclo = data.ativar_ciclo === 'true';
      delete data.ativar_ciclo;

      if (data.id) {
        await events.update(data.id, data);
        // Ativar ciclo no editar se marcado e evento ainda não tem
        if (ativarCiclo && !hasCycle) {
          try { await cyclesApi.activate(data.id); setHasCycle(true); } catch(e) { console.error('Erro ao ativar ciclo:', e.message); }
        }
      } else {
        const created = await events.create(data);
        if (ativarCiclo && created?.id) {
          try { await cyclesApi.activate(created.id); } catch(e) { console.error('Erro ao ativar ciclo:', e.message); }
        }
      }
      setModalEvent(null);
      loadEvents();
      loadDash();
      if (data.id && selectedEvent?.id === data.id) refreshDetail();
    } catch (e) { setError(e.message); }
  }

  async function toggleEventStatus(id, currentStatus) {
    const newStatus = currentStatus === 'concluido' ? 'reabrir' : 'concluido';
    const label = newStatus === 'concluido' ? 'finalizar' : 'reabrir';
    if (!window.confirm(`Deseja ${label} este evento?`)) return;
    try {
      await events.updateStatus(id, newStatus);
      loadEvents();
      if (selectedEvent?.id === id) refreshDetail();
    } catch (e) { setError(e.message); }
  }

  async function deleteEvent(id) {
    if (!window.confirm('Excluir este evento?')) return;
    try {
      await events.remove(id);
      setSelectedEvent(null);
      setTab(1);
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
      setExpandedCard(null);
      refreshDetail();
    } catch (e) { setError(e.message); }
  }

  async function deleteTask(taskId) {
    if (!window.confirm('Excluir esta tarefa?')) return;
    try {
      await events.removeTask(taskId);
      setExpandedCard(null);
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

  // ── Occurrence helpers ──
  async function loadOccurrence(occId) {
    try {
      const data = await occApi.get(occId);
      setExpandedOcc(data);
    } catch (e) { console.error(e); }
  }

  async function addOccTask(occId) {
    if (!occTaskName.trim()) return;
    try {
      await occApi.createTask(occId, { name: occTaskName });
      setOccTaskName('');
      loadOccurrence(occId);
    } catch (e) { setError(e.message); }
  }

  async function changeOccTaskStatus(taskId, status, occId) {
    try { await occApi.updateTaskStatus(taskId, status); loadOccurrence(occId); }
    catch (e) { setError(e.message); }
  }

  async function deleteOccTask(taskId, occId) {
    try { await occApi.removeTask(taskId); loadOccurrence(occId); }
    catch (e) { setError(e.message); }
  }

  async function addOccMeeting(occId) {
    if (!occMeetingTitle.trim() || !occMeetingDate) return;
    try {
      await occApi.createMeeting(occId, { title: occMeetingTitle, date: occMeetingDate });
      setOccMeetingTitle(''); setOccMeetingDate('');
      loadOccurrence(occId);
    } catch (e) { setError(e.message); }
  }

  async function toggleOccPendency(pId, done, occId) {
    try { await occApi.togglePendency(pId, !done); loadOccurrence(occId); }
    catch (e) { setError(e.message); }
  }

  // ── Category helpers ──
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });
  const getCatColor = (catId) => catMap[catId]?.color || C.text3;
  const getCatName = (catId) => catMap[catId]?.name || '—';

  // ── EventsByDate (para calendário) ──
  const eventsByDate = {};
  eventList.forEach(ev => {
    const d = normDate(ev.date);
    if (d) { if (!eventsByDate[d]) eventsByDate[d] = []; eventsByDate[d].push(ev); }
    (ev.occurrence_dates || []).forEach(od => {
      const odn = normDate(od);
      if (odn && odn !== d) { if (!eventsByDate[odn]) eventsByDate[odn] = []; eventsByDate[odn].push(ev); }
    });
  });

  // ── Eventos do dia selecionado ──
  const selectedDayEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  // ── Dashboard KPIs (PMO real + contagem local) ──
  const counts = { total: eventList.length, 'no-prazo': 0, 'em-risco': 0, 'atrasado': 0, 'concluido': 0 };
  eventList.forEach(e => { if (counts[e.status] !== undefined) counts[e.status]++; });
  const k = pmoKpis || {};
  const kpis = [
    { label: 'Eventos', value: counts.total, color: C.primary },
    { label: 'No Prazo', value: counts['no-prazo'], color: C.green },
    { label: 'Em Risco', value: counts['em-risco'], color: C.amber },
    { label: 'Atrasados', value: counts['atrasado'], color: C.red },
    { label: 'Concluídos', value: counts['concluido'], color: C.blue },
    { label: 'Próx. 7 dias', value: k.events_next_7d || 0, color: '#8b5cf6' },
    { label: 'Tarefas abertas', value: k.tasks_open || 0, color: '#6b7280' },
    { label: 'Tarefas atrasadas', value: k.tasks_overdue || 0, color: C.red },
    { label: 'Riscos abertos', value: k.risks_open || 0, color: '#f59e0b' },
    { label: 'Sem responsável', value: k.events_no_owner || 0, color: '#9ca3af' },
  ];

  // ── Kanban (dois níveis)
  const [kanbanViewMode, setKanbanViewMode] = useState('pmo'); // 'pmo', 'area', 'minhas'
  const [kanbanArea, setKanbanArea] = useState('all');
  const [kanbanExpanded, setKanbanExpanded] = useState(null);
  const [kanbanCycleData, setKanbanCycleData] = useState(null);
  const [kanbanPhase, setKanbanPhase] = useState(null);
  const [kanbanEvent, setKanbanEvent] = useState('all');

  async function loadKanban() {
    setKanbanLoading(true);
    try {
      const data = await cyclesApi.kanbanAll();
      setKanbanCycleData(data);
      // Auto-selecionar primeira fase não concluída
      if (data?.phases?.length > 0 && !kanbanPhase) {
        const first = data.phases.find(p => p.status !== 'concluida') || data.phases[0];
        setKanbanPhase(first.numero_fase);
      }
    } catch (e) { console.error(e); }
    finally { setKanbanLoading(false); }
  }

  async function kanbanChangeStatus(taskId, newStatus) {
    try {
      await cyclesApi.updateTask(taskId, { status: newStatus });
      loadKanban();
    } catch (e) { setError(e.message); }
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — KANBAN (dois níveis: fases + kanban por fase)
  // ═══════════════════════════════════════════════════════════
  function renderKanban() {
    const CAT = {
      marketing:  { label: 'Marketing',  color: '#00B39D', bg: '#d1fae5' },
      compras:    { label: 'Compras',    color: '#3b82f6', bg: '#dbeafe' },
      financeiro: { label: 'Financeiro', color: '#10b981', bg: '#d1fae5' },
      manutencao: { label: 'Manutenção', color: '#f59e0b', bg: '#fef3c7' },
      limpeza:    { label: 'Limpeza',    color: '#8b5cf6', bg: '#ede9fe' },
      cozinha:    { label: 'Cozinha',    color: '#ec4899', bg: '#fce7f3' },
      outros:     { label: 'Outros',     color: 'var(--cbrio-text3)', bg: 'var(--cbrio-bg)' },
    };
    const COLS = [
      { key: 'a_fazer', label: 'A fazer', color: 'var(--cbrio-text3)' },
      { key: 'em_andamento', label: 'Em andamento', color: '#3b82f6' },
      { key: 'bloqueada', label: 'Bloqueada', color: '#ef4444' },
      { key: 'concluida', label: 'Concluída', color: '#10b981' },
    ];
    const getCat = (t) => { if (t.area === 'marketing') return 'marketing'; const m = (t.observacoes || '').match(/Área:\s*(\w+)/i); return m ? m[1] : 'outros'; };

    const d = kanbanCycleData;
    if (!d) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--cbrio-text3)' }}>{kanbanLoading ? 'Carregando...' : 'Nenhum ciclo criativo ativo'}</div>;

    const allPhases = d.phases || [];
    const allTasks = d.tasks || [];
    const allEvents = d.events || [];

    // Agrupar fases por numero_fase (unificando de todos os eventos)
    const phaseNums = [...new Set(allPhases.map(p => p.numero_fase))].sort((a, b) => a - b);
    const phaseNames = {};
    allPhases.forEach(p => { phaseNames[p.numero_fase] = p.nome_fase; });

    // Filtrar por evento
    const filteredPhases = kanbanEvent === 'all' ? allPhases : allPhases.filter(p => p.event_id === kanbanEvent);
    const phaseIds = new Set(filteredPhases.map(p => p.id));

    // Tarefas da fase selecionada + filtros + visão
    let phaseTasks = allTasks.filter(t => {
      if (kanbanViewMode === 'pmo') {
        const ph = allPhases.find(p => p.id === t.event_phase_id);
        if (!ph || ph.numero_fase !== kanbanPhase) return false;
      }
      if (kanbanEvent !== 'all' && t.event_id !== kanbanEvent) return false;
      if (kanbanViewMode === 'area' && userArea) {
        const cat = getCat(t);
        if (cat !== userArea && t.area !== userArea) return false;
      }
      if (kanbanViewMode === 'minhas') {
        if (t.responsavel_id !== userId && t.responsavel_nome !== profile?.name) return false;
      }
      return true;
    });
    if (kanbanArea !== 'all') phaseTasks = phaseTasks.filter(t => getCat(t) === kanbanArea);

    return (
      <div style={{ margin: '0 -32px', padding: '0 16px' }}>
        {/* Toggle visão */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--cbrio-text2)', fontWeight: 600 }}>Visão:</span>
          {[
            { key: 'pmo', label: 'PMO (por fase)' },
            ...(userArea ? [{ key: 'area', label: `Minha área (${userArea})` }] : []),
            { key: 'minhas', label: 'Minhas tarefas' },
          ].map(v => (
            <button key={v.key} onClick={() => setKanbanViewMode(v.key)} style={{
              padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: kanbanViewMode === v.key ? 700 : 400, cursor: 'pointer',
              border: kanbanViewMode === v.key ? '2px solid #00B39D' : '1px solid var(--cbrio-border)',
              background: kanbanViewMode === v.key ? '#00B39D15' : 'transparent',
              color: kanbanViewMode === v.key ? '#00B39D' : 'var(--cbrio-text3)',
            }}>{v.label}</button>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
          {/* Filtro evento */}
          <span style={{ fontSize: 11, color: 'var(--cbrio-text2)', fontWeight: 600 }}>Evento:</span>
          <select value={kanbanEvent} onChange={e => setKanbanEvent(e.target.value)}
            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, border: `1px solid var(--cbrio-border)`, background: 'var(--cbrio-card)' }}>
            <option value="all">Todos os eventos</option>
            {allEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>

          <span style={{ width: 1, height: 20, background: 'var(--cbrio-border)', margin: '0 4px' }} />

          {/* Filtro área */}
          <span style={{ fontSize: 11, color: 'var(--cbrio-text2)', fontWeight: 600 }}>Área:</span>
          {[{ key: 'all', label: 'Todas' }, ...Object.entries(CAT).filter(([k]) => k !== 'outros').map(([k, v]) => ({ key: k, label: v.label, color: v.color, bg: v.bg }))].map(f => (
            <button key={f.key} onClick={() => setKanbanArea(f.key)} style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: kanbanArea === f.key ? 600 : 400, cursor: 'pointer',
              border: kanbanArea === f.key ? `2px solid ${f.color || '#00B39D'}` : `1px solid var(--cbrio-border)`,
              background: kanbanArea === f.key ? (f.bg || '#d1fae5') : 'transparent',
              color: kanbanArea === f.key ? (f.color || '#00B39D') : 'var(--cbrio-text3)',
            }}>{f.label}</button>
          ))}
        </div>

        {/* Faixa de fases (nível 1) */}
        <div style={{ overflowX: 'auto', marginBottom: 16, paddingBottom: 6 }}>
          <div style={{ display: 'flex', gap: 5, minWidth: 'max-content' }}>
            {phaseNums.map((num, i) => {
              const isActive = num === kanbanPhase;
              const relevantPhases = filteredPhases.filter(p => p.numero_fase === num);
              const relevantPhaseIds = relevantPhases.map(p => p.id);
              const pTasks = allTasks.filter(t => relevantPhaseIds.includes(t.event_phase_id) && (kanbanEvent === 'all' || t.event_id === kanbanEvent));
              const pDone = pTasks.filter(t => t.status === 'concluida').length;
              const pBlocked = pTasks.filter(t => t.status === 'bloqueada').length;
              const isDone = pTasks.length > 0 && pDone === pTasks.length;
              const pPct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;

              return (
                <div key={num} style={{ display: 'flex', alignItems: 'center' }}>
                  <div onClick={() => { setKanbanPhase(num); setKanbanExpanded(null); }} style={{
                    borderRadius: 8, padding: '8px 10px', cursor: 'pointer', minWidth: 100, maxWidth: 120,
                    border: isActive ? '2px solid #00B39D' : `1px solid var(--cbrio-border)`,
                    background: isActive ? 'rgba(0,179,157,0.1)' : isDone ? 'var(--cbrio-bg)' : 'var(--cbrio-card)',
                    opacity: isDone && !isActive ? 0.7 : 1, transition: 'all .15s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--cbrio-text3)', marginBottom: 3 }}>
                      <span>F{num}</span>
                      {pBlocked > 0 && <span style={{ color: '#ef4444' }}>{pBlocked} bloq</span>}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? '#00B39D' : 'var(--cbrio-text)', lineHeight: 1.3, marginBottom: 4 }}>
                      {phaseNames[num]}
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: 'var(--cbrio-border)', marginBottom: 3 }}>
                      <div style={{ height: 3, borderRadius: 2, width: `${pPct}%`, background: isDone ? '#10b981' : pPct > 0 ? '#00B39D' : 'transparent', transition: 'width .3s' }} />
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--cbrio-text3)' }}>{pTasks.length > 0 ? `${pDone}/${pTasks.length}` : 'vazia'}</div>
                  </div>
                  {i < phaseNums.length - 1 && <div style={{ width: 12, height: 2, background: isDone ? '#10b981' : 'var(--cbrio-border)', flexShrink: 0 }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Header da fase */}
        {kanbanPhase && (
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--cbrio-text)', marginBottom: 10 }}>
            Fase {kanbanPhase} — {phaseNames[kanbanPhase]}
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--cbrio-text3)', marginLeft: 12 }}>
              {phaseTasks.filter(t => t.status === 'concluida').length}/{phaseTasks.length} tarefas
            </span>
          </div>
        )}

        {/* Kanban 4 colunas (nível 2) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, minHeight: 300 }}>
          {COLS.map(col => {
            const colTasks = sortByUrgency(phaseTasks.filter(t => t.status === col.key));
            return (
              <div key={col.key} style={{ background: 'var(--cbrio-bg)', borderRadius: 10, padding: 8 }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { const id = e.dataTransfer.getData('cycleKanbanId'); if (id) kanbanChangeStatus(id, col.key); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: col.color, textTransform: 'uppercase', letterSpacing: 0.4 }}>{col.label}</span>
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: 'var(--cbrio-card)', border: `1px solid var(--cbrio-border)`, color: 'var(--cbrio-text3)' }}>{colTasks.length}</span>
                </div>
                {colTasks.length === 0 && <div style={{ padding: 12, textAlign: 'center', fontSize: 10, color: 'var(--cbrio-text3)', border: '1.5px dashed var(--cbrio-border)', borderRadius: 8 }}>—</div>}
                {colTasks.map(task => {
                  const cat = CAT[getCat(task)] || CAT.outros;
                  const evName = allEvents.find(e => e.id === task.event_id)?.name || '';
                  const subs = task.subtasks || [];
                  const subsDone = subs.filter(s => s.done).length;
                  const isOpen = kanbanExpanded === task.id;
                  // Dias até entrega
                  const p = normDate(task.prazo);
                  const diff = p ? Math.ceil((new Date(p + 'T12:00:00') - new Date()) / 86400000) : null;
                  const dColor = diff === null || task.status === 'concluida' ? null : diff < 0 ? '#ef4444' : diff <= 3 ? '#f59e0b' : '#10b981';
                  const dText = diff === null ? '' : diff < 0 ? `${Math.abs(diff)}d atrás` : diff === 0 ? 'Hoje' : `${diff}d`;

                  return (
                    <div key={task.id} draggable onDragStart={e => e.dataTransfer.setData('cycleKanbanId', task.id)}
                      onClick={() => setKanbanExpanded(isOpen ? null : task.id)}
                      style={{
                        background: 'var(--cbrio-card)', borderRadius: 8, padding: 8, marginBottom: 4,
                        border: isOpen ? '1.5px solid #00B39D' : dColor === '#ef4444' ? '1px solid #fecaca' : `1px solid var(--cbrio-border)`,
                        cursor: 'grab', transition: 'box-shadow .15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: cat.bg, color: cat.color, fontWeight: 500 }}>{cat.label}</span>
                        <button onClick={async e => { e.stopPropagation(); if (window.confirm('Excluir tarefa?')) { await cyclesApi.deleteTask(task.id); loadKanban(); } }}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 10, padding: 0 }}>✕</button>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--cbrio-text)', lineHeight: 1.3, marginBottom: 3 }}>{task.titulo}</div>
                      {evName && <div style={{ fontSize: 9, color: 'var(--cbrio-text3)', marginBottom: 2 }}>{evName}</div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: 'var(--cbrio-text3)' }}>
                        <span>{task.responsavel_nome || '—'}</span>
                        {subs.length > 0 && <span>{subsDone}/{subs.length}</span>}
                      </div>
                      {/* DaysCounter colorido */}
                      {dColor && task.status !== 'concluida' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--cbrio-border)' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: dColor }}>{fmtDate(task.prazo)}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: dColor, padding: '1px 6px', borderRadius: 8, background: `${dColor}15` }}>{dText}</span>
                        </div>
                      )}

                      {/* Subtarefas expandidas */}
                      {isOpen && subs.length > 0 && (
                        <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid var(--cbrio-border)` }} onClick={e => e.stopPropagation()}>
                          {subs.map(sub => (
                            <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, padding: '2px 0', color: 'var(--cbrio-text)' }}>
                              <input type="checkbox" checked={sub.done} onChange={() => { sub.done = !sub.done; setKanbanCycleData({ ...d }); }} style={{ cursor: 'pointer', width: 13, height: 13 }} />
                              <span style={sub.done ? { textDecoration: 'line-through', color: 'var(--cbrio-text3)' } : {}}>{sub.name}</span>
                            </div>
                          ))}
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
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — GANTT (por fases do ciclo criativo)
  // ═══════════════════════════════════════════════════════════
  function renderGantt() {
    const ST_COLORS = { pendente: '#9ca3af', em_andamento: '#3b82f6', concluida: '#10b981', atrasada: '#ef4444', em_risco: '#f59e0b' };
    const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const d = kanbanCycleData;
    if (!d) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--cbrio-text3)' }}>{kanbanLoading ? 'Carregando...' : 'Nenhum ciclo ativo'}</div>;

    const aPhases = d.phases || []; const aTasks = d.tasks || []; const aEvents = d.events || [];

    // Agrupar por evento
    const evGroups = {};
    aEvents.forEach(ev => { evGroups[ev.id] = { name: ev.name, phases: [] }; });
    aPhases.forEach(ph => { if (evGroups[ph.event_id]) evGroups[ph.event_id].phases.push(ph); });
    const groups = Object.values(evGroups).filter(g => g.phases.length > 0);
    groups.forEach(g => g.phases.sort((a, b) => a.numero_fase - b.numero_fase));

    const allDts = aPhases.flatMap(p => [p.data_inicio_prevista, p.data_fim_prevista].filter(Boolean)).map(x => new Date(x));
    const today = new Date();
    const gS = allDts.length > 0 ? new Date(Math.min(...allDts, today) - 14 * 86400000) : new Date(today.getFullYear(), 0, 1);
    const gE = allDts.length > 0 ? new Date(Math.max(...allDts, today) + 14 * 86400000) : new Date(today.getFullYear(), 11, 31);
    gS.setDate(1); gE.setDate(1); gE.setMonth(gE.getMonth() + 1);
    const dPct = (dt) => Math.max(0, Math.min(100, ((new Date(dt) - gS) / (gE - gS)) * 100));
    const tPct = dPct(today);
    const mL = []; const mc = new Date(gS);
    while (mc < gE) { mL.push({ label: MONTHS[mc.getMonth()] + (mc.getMonth() === 0 ? ' ' + mc.getFullYear() : ''), pct: dPct(mc) }); mc.setMonth(mc.getMonth() + 1); }

    const NW = 200; const BH = 32;

    return (
      <div style={{ margin: '0 -32px', padding: '0 16px' }}>
        {groups.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--cbrio-text3)', fontSize: 13 }}>Nenhum ciclo criativo ativo</div>}

        {groups.map((group, gi) => (
          <div key={gi} style={{ background: 'var(--cbrio-card)', borderRadius: 12, border: '1px solid var(--cbrio-border)', marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', background: '#00B39D10', borderBottom: '1px solid var(--cbrio-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00B39D' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--cbrio-text)' }}>{group.name}</span>
              <span style={{ fontSize: 11, color: 'var(--cbrio-text3)' }}>({group.phases.filter(p => p.status === 'concluida').length}/{group.phases.length})</span>
            </div>
            <div style={{ display: 'flex' }}>
              <div style={{ width: NW, flexShrink: 0, borderRight: '1px solid var(--cbrio-border)' }}>
                <div style={{ height: 28, borderBottom: '1px solid var(--cbrio-border)', background: 'var(--cbrio-table-header, #fafafa)' }} />
                {group.phases.map(ph => {
                  const eiN = normDate(ph.data_fim_prevista);
                  const diffN = eiN ? Math.ceil((new Date(eiN + 'T12:00:00') - new Date()) / 86400000) : null;
                  const dotC = ph.status === 'concluida' ? '#10b981' : diffN !== null && diffN < 0 ? '#ef4444' : diffN !== null && diffN <= 3 ? '#f59e0b' : '#9ca3af';
                  return (
                  <div key={ph.id} style={{ height: BH, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid var(--cbrio-border)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotC, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--cbrio-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>F{ph.numero_fase} {ph.nome_fase}</span>
                  </div>
                  ); })}
              </div>
              <div style={{ flex: 1, overflowX: 'auto' }}>
                <div style={{ minWidth: 600, position: 'relative' }}>
                  <div style={{ height: 28, position: 'relative', borderBottom: '1px solid var(--cbrio-border)', background: 'var(--cbrio-table-header, #fafafa)' }}>
                    {mL.map((m, i) => (<div key={i} style={{ position: 'absolute', left: `${m.pct}%`, top: 0, height: '100%', borderLeft: '1px solid var(--cbrio-border)', padding: '5px 6px', fontSize: 10, fontWeight: 600, color: 'var(--cbrio-text2)', whiteSpace: 'nowrap' }}>{m.label}</div>))}
                    <div style={{ position: 'absolute', left: `${tPct}%`, top: 0, width: 2, height: '100%', background: '#ef4444', zIndex: 2 }} />
                    <div style={{ position: 'absolute', left: `${tPct}%`, top: -1, transform: 'translateX(-50%)', fontSize: 8, fontWeight: 700, color: '#ef4444', background: 'var(--cbrio-card)', padding: '0 3px', borderRadius: 3, zIndex: 3 }}>hoje</div>
                  </div>
                  {group.phases.map(ph => {
                    const si = normDate(ph.data_inicio_prevista); const ei = normDate(ph.data_fim_prevista);
                    if (!si || !ei) return <div key={ph.id} style={{ height: BH, borderBottom: '1px solid var(--cbrio-border)' }} />;
                    const lp = dPct(si); const rp = dPct(ei); const wp = Math.max(rp - lp, 2);
                    const isDone = ph.status === 'concluida';
                    const endD = new Date(ei + 'T12:00:00');
                    const diff2 = Math.ceil((endD - new Date()) / 86400000);
                    const barC = isDone ? '#d1d5db' : diff2 < 0 ? '#ef4444' : diff2 <= 3 ? '#f59e0b' : '#10b981';
                    const dTxt = isDone ? '✓' : diff2 < 0 ? `${Math.abs(diff2)}d atrás` : diff2 === 0 ? 'Hoje' : `${diff2}d`;
                    return (
                      <div key={ph.id} style={{ position: 'relative', height: BH, borderBottom: '1px solid var(--cbrio-border)' }}>
                        {mL.map((m, i) => (<div key={i} style={{ position: 'absolute', left: `${m.pct}%`, top: 0, width: 1, height: '100%', background: 'var(--cbrio-border)', opacity: 0.3 }} />))}
                        <div style={{ position: 'absolute', left: `${tPct}%`, top: 0, width: 2, height: '100%', background: '#ef4444', zIndex: 2, opacity: 0.4 }} />
                        <div title={`${ph.nome_fase}\n${fmtDate(si)} → ${fmtDate(ei)}\n${dTxt}`}
                          style={{ position: 'absolute', top: 4, height: BH - 8, borderRadius: 6, left: `${lp}%`, width: `${wp}%`, minWidth: 50, background: barC, opacity: isDone ? 0.5 : 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', overflow: 'hidden' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{dTxt}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '8px 0' }}>
          {[{ l: 'No prazo (>3d)', c: '#10b981' }, { l: 'Urgente (≤3d)', c: '#f59e0b' }, { l: 'Atrasada', c: '#ef4444' }, { l: 'Concluída', c: '#d1d5db' }].map(x => (
            <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 10, borderRadius: 4, background: x.c }} /><span style={{ fontSize: 12, color: 'var(--cbrio-text2)' }}>{x.l}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 2, height: 14, background: '#ef4444' }} /><span style={{ fontSize: 12, color: 'var(--cbrio-text2)' }}>Hoje</span>
          </div>
        </div>
        <div style={{ height: 40 }} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — HOME (calendário)
  // ═══════════════════════════════════════════════════════════
  function renderHome() {
    return (
      <>
        {/* KPIs */}
        {/* Barra de status compacta */}
        <div style={{
          background: 'var(--cbrio-card, #fff)', borderRadius: 12, border: `1px solid ${C.border}`,
          padding: '14px 24px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          {[
            { label: 'Eventos', value: counts.total, color: C.primary },
            { label: 'No Prazo', value: counts['no-prazo'], color: C.green },
            { label: 'Em Risco', value: counts['em-risco'], color: C.amber },
            { label: 'Atrasados', value: counts['atrasado'], color: C.red },
            { label: 'Concluídos', value: counts['concluido'], color: C.blue },
            null,
            { label: 'Próx. 7d', value: k.events_next_7d || 0, color: '#8b5cf6' },
            { label: 'Tarefas abertas', value: k.tasks_open || 0, color: C.text2 },
            { label: 'Tarefas atrasadas', value: k.tasks_overdue || 0, color: C.red },
            { label: 'Riscos', value: k.risks_open || 0, color: C.amber },
            { label: 'Sem dono', value: k.events_no_owner || 0, color: C.text3 },
          ].map((item, i) => {
            if (!item) return <div key={i} style={{ width: 1, height: 24, background: 'var(--cbrio-border, #e5e7eb)' }} />;
            return (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cbrio-text3, #9ca3af)', textTransform: 'uppercase', letterSpacing: 0.3 }}>{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* Orçamento global + Carga de trabalho */}
        {(k.budget_total > 0 || workload.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
            {k.budget_total > 0 && (
              <div style={{ ...styles.card, flex: '1 1 320px', minWidth: 280 }}>
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--cbrio-text, #1a1a2e)', marginBottom: 12 }}>Orçamento Global</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--cbrio-text2, #6b7280)', marginBottom: 6 }}>
                    <span>Gasto: R$ {Number(k.budget_spent || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span>Aprovado: R$ {Number(k.budget_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ height: 10, background: 'var(--cbrio-border, #e5e7eb)', borderRadius: 5 }}>
                    <div style={{ height: '100%', width: `${Math.min(((k.budget_spent || 0) / k.budget_total) * 100, 100)}%`, borderRadius: 5, background: (k.budget_spent || 0) > k.budget_total ? '#ef4444' : '#10b981', transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--cbrio-text3, #9ca3af)', marginTop: 6 }}>
                    {Math.round(((k.budget_spent || 0) / (k.budget_total || 1)) * 100)}% utilizado
                  </div>
                </div>
              </div>
            )}
            {workload.length > 0 && (
              <div style={{ ...styles.card, flex: '1 1 320px', minWidth: 280 }}>
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--cbrio-text, #1a1a2e)', marginBottom: 12 }}>Carga de Trabalho</div>
                  {workload.slice(0, 6).map((w, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--cbrio-text, #1a1a2e)', width: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.responsible}</span>
                      <div style={{ flex: 1, height: 8, background: 'var(--cbrio-border, #e5e7eb)', borderRadius: 4 }}>
                        <div style={{ height: '100%', width: `${Math.min((w.total_tasks / Math.max(...workload.map(x => x.total_tasks), 1)) * 100, 100)}%`, borderRadius: 4, background: w.atrasadas > 0 ? '#ef4444' : '#10b981', transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 12, color: w.atrasadas > 0 ? '#ef4444' : 'var(--cbrio-text3, #9ca3af)', fontWeight: 600, minWidth: 60, textAlign: 'right' }}>
                        {w.total_tasks} tarefas{w.atrasadas > 0 ? ` (${w.atrasadas} ⚠)` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calendário */}
        <BigCalendar
          eventsByDate={eventsByDate}
          selectedDate={selectedDate}
          onSelectDate={(date) => setSelectedDate(date === selectedDate ? null : date)}
        />

        {/* Eventos do dia selecionado */}
        {selectedDate && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 10 }}>
              {fmtDate(selectedDate)} — {selectedDayEvents.length} evento{selectedDayEvents.length !== 1 ? 's' : ''}
            </div>
            {selectedDayEvents.length === 0 && (
              <div style={styles.empty}>Nenhum evento neste dia</div>
            )}
            {selectedDayEvents.map(ev => {
              const st = STATUS_MAP[ev.status] || {};
              return (
                <div key={ev.id} onClick={() => loadDetail(ev.id)} style={{
                  ...styles.taskCard, cursor: 'pointer', borderLeft: `4px solid ${getCatColor(ev.category_id)}`,
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{ev.name}</div>
                      <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                        {getCatName(ev.category_id)}
                        {ev.responsible && ` · ${ev.responsible}`}
                        {ev.location && ` · ${ev.location}`}
                      </div>
                    </div>
                    <Badge status={ev.status} map={STATUS_MAP} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Margem inferior */}
        <div style={{ height: 80 }} />
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — LISTA
  // ═══════════════════════════════════════════════════════════
  function renderList() {
    return (
      <>
        {/* KPIs */}
        {kpis.length > 0 && (
          <div style={styles.kpiGrid}>
            {kpis.map((k, i) => (
              <EvStatCard key={k.label} label={k.label} value={k.value} bg={k.color} svg={EV_STAT_SVGS[i % EV_STAT_SVGS.length]} />
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--cbrio-text2, #6b7280)', cursor: 'pointer' }}>
            <input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} />
            Esconder concluídos
          </label>
        </div>

        {/* Tabela */}
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                {[{ key: 'name', label: 'Nome' }, { key: 'date', label: 'Data' }, { key: 'category', label: 'Categoria' }, { key: 'responsible', label: 'Responsável' }, { key: 'budget', label: 'Orçamento' }, { key: 'status', label: 'Status' }].map(col => (
                  <th key={col.key} style={{ ...styles.th, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => { if (sortCol === col.key) setSortAsc(!sortAsc); else { setSortCol(col.key); setSortAsc(true); } }}>
                    {col.label} {sortCol === col.key ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                let list = hideDone ? eventList.filter(e => e.status !== 'concluido') : eventList;
                list = [...list].sort((a, b) => {
                  let va, vb;
                  if (sortCol === 'name') { va = a.name || ''; vb = b.name || ''; }
                  else if (sortCol === 'date') { va = a.date || ''; vb = b.date || ''; }
                  else if (sortCol === 'status') { va = a.status || ''; vb = b.status || ''; }
                  else if (sortCol === 'responsible') { va = a.responsible || ''; vb = b.responsible || ''; }
                  else if (sortCol === 'budget') { va = Number(a.budget_planned) || 0; vb = Number(b.budget_planned) || 0; return sortAsc ? va - vb : vb - va; }
                  else { va = a.name || ''; vb = b.name || ''; }
                  return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
                });
                if (list.length === 0) return (
                  <tr><td colSpan={6} style={styles.empty}>{loading ? 'Carregando...' : 'Nenhum evento encontrado.'}</td></tr>
                );
                return list.map(ev => (
                <tr key={ev.id} style={styles.clickRow}
                  onClick={() => loadDetail(ev.id)}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
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
                  <td style={{ ...styles.td, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Badge status={ev.status} map={STATUS_MAP} />
                    <DaysCounter date={ev.next_occurrence_date || ev.date} status={ev.status} />
                  </td>
                </tr>
              ));
              })()}
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
        <button style={styles.backBtn} onClick={() => { setTab(1); setSelectedEvent(null); }}>
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
                              <>
                  <button
                    style={{ ...styles.btn(ev.status === 'concluido' ? 'secondary' : 'primary'), ...styles.btnSm }}
                    onClick={() => toggleEventStatus(ev.id, ev.status)}
                  >
                    {ev.status === 'concluido' ? 'Reabrir' : 'Finalizar'}
                  </button>
                  <button style={{ ...styles.btn('secondary'), ...styles.btnSm }} onClick={() => setModalEvent(ev)}>Editar</button>
                  <button style={{ ...styles.btn('danger'), ...styles.btnSm }} onClick={() => deleteEvent(ev.id)}>Excluir</button>
                </>
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

            {/* Ocorrências como pills dentro do card (só recorrentes) */}
            {occurrences.length > 1 && ev.recurrence !== 'unico' && (
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <span style={styles.label}>Ocorrências ({occurrences.length})</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {occurrences.map(occ => {
                    const occDate = normDate(occ.date);
                    const today = new Date().toISOString().slice(0, 10);
                    const isPast = occDate < today;
                    const isToday = occDate === today;
                    const statusColor = occ.status === 'concluido' ? C.green : isPast ? C.red : isToday ? C.amber : C.text3;
                    const isSelected = expandedOcc?.id === occ.id;
                    return (
                      <button key={occ.id}
                        onClick={() => { setExpandedCard(null); if (isSelected) { setExpandedOcc(null); } else { loadOccurrence(occ.id); } }}
                        style={{
                          padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          border: isSelected ? `2px solid ${C.primary}` : `1.5px solid ${statusColor}`,
                          background: isSelected ? C.primaryBg : `${statusColor}10`,
                          color: isSelected ? C.primary : statusColor,
                          transition: 'all 0.15s',
                        }}>
                        {fmtDate(occ.date)}
                        {occ.status === 'concluido' && ' ✓'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contexto: ocorrência selecionada (só recorrentes) */}
        {expandedOcc && ev.recurrence !== 'unico' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 14px', background: 'var(--cbrio-bg, #f3f4f6)', borderRadius: 8, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Visualizando: {fmtDate(expandedOcc.date)}</span>
            <span style={styles.badge(expandedOcc.status === 'concluido' ? C.green : C.text3, expandedOcc.status === 'concluido' ? `${C.green}15` : '#f3f4f6')}>
              {expandedOcc.status === 'concluido' ? 'Concluído' : 'Pendente'}
            </span>
            <button style={{ ...styles.btn(expandedOcc.status === 'concluido' ? 'secondary' : 'primary'), ...styles.btnSm }}
              onClick={async () => {
                const ns = expandedOcc.status === 'concluido' ? 'pendente' : 'concluido';
                try { await events.updateOccurrence(ev.id, expandedOcc.id, { status: ns }); refreshDetail(); loadOccurrence(expandedOcc.id); dashApi.pmo().then(setPmoKpis).catch(() => {}); }
                catch (err) { setError(err.message); }
              }}>
              {expandedOcc.status === 'concluido' ? 'Reabrir' : 'Finalizar'}
            </button>
          </div>
        )}

        {/* ── ABAS FIXAS ── */}
        <div style={styles.tabs}>
          {[
            { key: 'tarefas', label: `Tarefas (${expandedOcc ? (expandedOcc.tasks?.length || 0) : taskList.length})` },
            { key: 'reunioes', label: `Reuniões (${expandedOcc ? (expandedOcc.meetings?.length || 0) : meetingsList.length})` },
            { key: 'riscos', label: `Riscos (${eventRisks.length})` },
            { key: 'historico', label: `Histórico (${auditHistory.length})` },
            ...(hasCycle ? [{ key: 'ciclo', label: 'Ciclo Criativo' }] : []),
            ...(ev.status === 'concluido' ? [{ key: 'retro', label: 'Retrospectiva' }] : []),
          ].map(t => (
            <button key={t.key} style={styles.tab(detailTab === t.key)} onClick={() => { setDetailTab(t.key); setExpandedCard(null); }}>{t.label}</button>
          ))}
        </div>

        {/* ── ABA: Tarefas ── */}
        {detailTab === 'tarefas' && !expandedOcc && <>
        <div style={{ padding: '20px 0 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cbrio-text, #1a1a2e)' }}>Tarefas do Evento ({taskList.length})</div>
          <button style={{ ...styles.btn('primary'), ...styles.btnSm }} onClick={() => setModalTask({})}>+ Tarefa</button>
        </div>

        {taskList.length === 0 && <div style={styles.empty}>Nenhuma tarefa cadastrada.</div>}
        {taskList.map(task => {
          const isOpen = expandedCard === `task-${task.id}`;
          const subsDone = (task.subtasks || []).filter(s => s.done).length;
          const subsTotal = (task.subtasks || []).length;
          return (
          <div key={task.id} style={{ ...styles.taskCard, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onClick={() => setExpandedCard(isOpen ? null : `task-${task.id}`)}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
            {/* Resumo (sempre visível) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <span style={{ color: C.text3, fontSize: 12 }}>{isOpen ? '▼' : '▶'}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>
                    {task.is_milestone && <span style={{ color: C.amber, marginRight: 4 }}>★</span>}
                    {task.name}
                  </div>
                  <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                    {task.responsible || 'Sem responsável'}
                    {task.deadline && ` · ${fmtDate(task.deadline)}`}
                    {subsTotal > 0 && ` · ${subsDone}/${subsTotal} subtarefas`}
                    {(task.comments || []).length > 0 && ` · ${task.comments.length} comentários`}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                {task.priority && <Badge status={task.priority} map={PRIORITY_MAP} />}
                <Badge status={task.status} map={TASK_STATUS_MAP} />
                <select style={{ ...styles.select, padding: '2px 6px', fontSize: 11 }} value={task.status}
                  onChange={e => changeTaskStatus(task.id, e.target.value)}>
                  {Object.entries(TASK_STATUS_MAP).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
                </select>
              </div>
            </div>

            {/* Detalhe expandido */}
            {isOpen && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => setModalTask(task)}>Editar</button>
                  <button style={{ ...styles.btn('ghost'), ...styles.btnSm, color: C.red }} onClick={() => deleteTask(task.id)}>Excluir</button>
                </div>

                {task.description && <div style={{ fontSize: 12, color: C.text2, marginBottom: 8 }}>{task.description}</div>}
                {task.area && <div style={{ fontSize: 12, color: C.text3, marginBottom: 8 }}>Área: {task.area}</div>}

                {/* Subtasks */}
                {subsTotal > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 4 }}>Subtarefas ({subsDone}/{subsTotal})</div>
                    {task.subtasks.map(sub => (
                      <div key={sub.id} style={styles.subtaskRow}>
                        <input type="checkbox" checked={!!sub.done} onChange={() => toggleSubtask(sub.id, !sub.done)} style={{ cursor: 'pointer' }} />
                        <span style={sub.done ? { textDecoration: 'line-through', color: C.text3 } : {}}>{sub.name}</span>
                        <button style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', fontSize: 11, padding: '0 4px' }} onClick={() => deleteSubtask(sub.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <input style={styles.inlineInput} placeholder="Nova subtarefa..." value={newSubtask[task.id] || ''}
                    onChange={e => setNewSubtask(prev => ({ ...prev, [task.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addSubtask(task.id)} />
                  <button style={styles.inlineBtn} onClick={() => addSubtask(task.id)}>+</button>
                </div>

                {/* Comments */}
                {(task.comments || []).length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 4 }}>Comentários</div>
                    {task.comments.map(c => (
                      <div key={c.id} style={styles.commentBox}>
                        <div style={{ fontWeight: 600, fontSize: 11, color: C.text }}>{c.author_name || c.author || 'Anônimo'}</div>
                        <div style={{ marginTop: 2 }}>{c.text}</div>
                        <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{c.created_at ? new Date(c.created_at).toLocaleString('pt-BR') : ''}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input style={styles.inlineInput} placeholder="Adicionar comentário..." value={newComment[task.id] || ''}
                    onChange={e => setNewComment(prev => ({ ...prev, [task.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addComment(task.id)} />
                  <button style={styles.inlineBtn} onClick={() => addComment(task.id)}>Enviar</button>
                </div>
              </div>
            )}
          </div>
          );
        })}
        </div>
        </>}

        {/* ── ABA: Reuniões (evento) ── */}
        {detailTab === 'reunioes' && !expandedOcc && (
          <div style={{ padding: '20px 0 60px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cbrio-text, #1a1a2e)' }}>Reuniões do Evento ({meetingsList.length})</div>
              <button style={{ ...styles.btn('primary'), ...styles.btnSm }} onClick={() => setModalTask(null)}>+ Reunião</button>
            </div>
            {meetingsList.length === 0 && <div style={styles.empty}>Nenhuma reunião cadastrada</div>}
            {meetingsList.map(m => {
              const isOpen = expandedCard === `meeting-${m.id}`;
              const pendsCount = (m.pendencies || []).length;
              const pendsDone = (m.pendencies || []).filter(p => p.done).length;
              return (
              <div key={m.id} style={{ ...styles.taskCard, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onClick={() => setExpandedCard(isOpen ? null : `meeting-${m.id}`)}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                {/* Resumo */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <span style={{ color: C.text3, fontSize: 12 }}>{isOpen ? '▼' : '▶'}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{m.title || 'Reunião'}</div>
                      <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                        {fmtDate(m.date)}
                        {m.participants?.length > 0 && ` · ${m.participants.join(', ')}`}
                        {pendsCount > 0 && ` · ${pendsDone}/${pendsCount} pendências`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detalhe expandido */}
                {isOpen && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      <button style={{ ...styles.btn('ghost'), ...styles.btnSm, color: C.red }}
                        onClick={async () => { if (window.confirm('Excluir reunião?')) { await meetings.remove(m.id); refreshDetail(); } }}>Excluir</button>
                    </div>
                    {m.decisions && <div style={{ fontSize: 12, color: C.text2, marginBottom: 6 }}><strong>Decisões:</strong> {m.decisions}</div>}
                    {m.notes && <div style={{ fontSize: 12, color: C.text3, marginBottom: 6 }}><strong>Notas:</strong> {m.notes}</div>}
                    {pendsCount > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 4 }}>Pendências ({pendsDone}/{pendsCount})</div>
                        {m.pendencies.map(p => (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0' }}>
                            <input type="checkbox" checked={p.done}
                              onChange={async () => { await meetings.togglePendency(p.id, !p.done); refreshDetail(); }} />
                            <span style={p.done ? { textDecoration: 'line-through', color: C.text3 } : { color: C.text }}>{p.description || p.text}</span>
                            {p.responsible && <span style={{ fontSize: 10, color: C.text3 }}>({p.responsible})</span>}
                            {p.deadline && <span style={{ fontSize: 10, color: C.text3 }}>{fmtDate(p.deadline)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}

        {/* ── ABA: Tarefas (ocorrência) ── */}
        {detailTab === 'tarefas' && expandedOcc && (
          <div style={{ padding: '20px 0 60px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cbrio-text, #1a1a2e)' }}>Tarefas — {fmtDate(expandedOcc.date)} ({expandedOcc.tasks?.length || 0})</div>
            </div>
            {(expandedOcc.tasks || []).length === 0 && <div style={styles.empty}>Nenhuma tarefa nesta ocorrência</div>}
            {(expandedOcc.tasks || []).map(task => {
              const isOpen = expandedCard === `occtask-${task.id}`;
              return (
              <div key={task.id} style={{ ...styles.taskCard, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onClick={() => setExpandedCard(isOpen ? null : `occtask-${task.id}`)}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <span style={{ color: C.text3, fontSize: 12 }}>{isOpen ? '▼' : '▶'}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{task.name}</div>
                      <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                        {task.responsible || 'Sem responsável'}
                        {task.deadline && ` · ${fmtDate(task.deadline)}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <Badge status={task.status} map={TASK_STATUS_MAP} />
                    <select value={task.status} onChange={e => changeOccTaskStatus(task.id, e.target.value, expandedOcc.id)}
                      style={{ ...styles.select, padding: '2px 6px', fontSize: 11 }}>
                      <option value="pendente">Pendente</option>
                      <option value="em-andamento">Em andamento</option>
                      <option value="concluida">Concluída</option>
                    </select>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      <button style={{ ...styles.btn('ghost'), ...styles.btnSm, color: C.red }} onClick={() => deleteOccTask(task.id, expandedOcc.id)}>Excluir</button>
                    </div>
                    {task.description && <div style={{ fontSize: 12, color: C.text2, marginBottom: 6 }}>{task.description}</div>}
                    {task.area && <div style={{ fontSize: 12, color: C.text3 }}>Área: {task.area}</div>}
                  </div>
                )}
              </div>
              );
            })}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input style={styles.inlineInput} placeholder="Nova tarefa..." value={occTaskName}
                onChange={e => setOccTaskName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addOccTask(expandedOcc.id)} />
              <button style={styles.inlineBtn} onClick={() => addOccTask(expandedOcc.id)}>+</button>
            </div>
          </div>
        )}


        {/* ── ABA: Reuniões (ocorrência) ── */}
        {detailTab === 'reunioes' && expandedOcc && (
          <div style={{ padding: '20px 0 60px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cbrio-text, #1a1a2e)' }}>Reuniões — {fmtDate(expandedOcc.date)} ({expandedOcc.meetings?.length || 0})</div>
            </div>
            {(expandedOcc.meetings || []).length === 0 && <div style={styles.empty}>Nenhuma reunião nesta ocorrência</div>}
            {(expandedOcc.meetings || []).map(m => {
              const isOpen = expandedCard === `occmeeting-${m.id}`;
              const pendsCount = (m.pendencies || []).length;
              const pendsDone = (m.pendencies || []).filter(p => p.done).length;
              return (
              <div key={m.id} style={{ ...styles.taskCard, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onClick={() => setExpandedCard(isOpen ? null : `occmeeting-${m.id}`)}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <span style={{ color: C.text3, fontSize: 12 }}>{isOpen ? '▼' : '▶'}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{m.title || 'Reunião'}</div>
                      <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                        {fmtDate(m.date)}
                        {m.participants?.length > 0 && ` · ${m.participants.join(', ')}`}
                        {pendsCount > 0 && ` · ${pendsDone}/${pendsCount} pendências`}
                      </div>
                    </div>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
                    {m.decisions && <div style={{ fontSize: 12, color: C.text2, marginBottom: 6 }}><strong>Decisões:</strong> {m.decisions}</div>}
                    {m.notes && <div style={{ fontSize: 12, color: C.text3, marginBottom: 6 }}><strong>Notas:</strong> {m.notes}</div>}
                    {pendsCount > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 4 }}>Pendências ({pendsDone}/{pendsCount})</div>
                        {m.pendencies.map(p => (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0' }}>
                            <input type="checkbox" checked={p.done} onChange={() => toggleOccPendency(p.id, p.done, expandedOcc.id)} />
                            <span style={p.done ? { textDecoration: 'line-through', color: C.text3 } : { color: C.text }}>{p.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input style={{ ...styles.inlineInput, flex: 2 }} placeholder="Título da reunião..." value={occMeetingTitle} onChange={e => setOccMeetingTitle(e.target.value)} />
              <input type="date" style={{ ...styles.inlineInput, flex: 1 }} value={occMeetingDate} onChange={e => setOccMeetingDate(e.target.value)} />
              <button style={styles.inlineBtn} onClick={() => addOccMeeting(expandedOcc.id)}>+</button>
            </div>
          </div>
        )}

        {/* ── ABA: Riscos ── */}
        {detailTab === 'riscos' && (
          <div style={{ padding: '20px 0 60px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cbrio-text, #1a1a2e)' }}>Riscos do Evento ({eventRisks.length})</div>
              <button style={{ ...styles.btn('primary'), ...styles.btnSm }} onClick={() => setShowRiskForm(true)}>+ Risco</button>
            </div>
            {eventRisks.length === 0 && <div style={styles.empty}>Nenhum risco registrado</div>}
            {eventRisks.map(risk => {
              const scoreColor = risk.score >= 15 ? C.red : risk.score >= 9 ? C.amber : C.green;
              const isOpen = expandedCard === `risk-${risk.id}`;
              return (
                <div key={risk.id} style={{ ...styles.taskCard, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                  onClick={() => setExpandedCard(isOpen ? null : `risk-${risk.id}`)}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                  {/* Resumo */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      <span style={{ color: C.text3, fontSize: 12 }}>{isOpen ? '▼' : '▶'}</span>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: scoreColor, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{risk.title}</div>
                        <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                          Score: {risk.score} · {risk.category} · {risk.status}
                          {risk.owner_name && ` · ${risk.owner_name}`}
                        </div>
                      </div>
                    </div>
                    <span style={styles.badge(scoreColor, `${scoreColor}15`)}>{risk.score}</span>
                  </div>

                  {/* Detalhe expandido */}
                  {isOpen && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        <select value={risk.status} onChange={async e => { await risksApi.update(risk.id, { status: e.target.value }); risksApi.list(ev.id).then(setEventRisks); }}
                          style={{ ...styles.select, padding: '4px 8px', fontSize: 12 }}>
                          {['aberto','mitigando','mitigado','aceito','fechado'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button style={{ ...styles.btn('ghost'), ...styles.btnSm, color: C.red }}
                          onClick={async () => { if (window.confirm('Excluir risco?')) { await risksApi.remove(risk.id); risksApi.list(ev.id).then(setEventRisks); } }}>Excluir</button>
                      </div>
                      {risk.description && <div style={{ fontSize: 12, color: C.text2, marginBottom: 6 }}>{risk.description}</div>}
                      <div style={{ fontSize: 12, color: C.text2, marginBottom: 4 }}>Probabilidade: {risk.probability}/5 · Impacto: {risk.impact}/5</div>
                      {risk.mitigation && <div style={{ fontSize: 12, color: C.text2, marginBottom: 4 }}><strong>Mitigação:</strong> {risk.mitigation}</div>}
                      {risk.owner_name && <div style={{ fontSize: 12, color: C.text3 }}>Responsável: {risk.owner_name}{risk.target_date ? ` · Prazo: ${fmtDate(risk.target_date)}` : ''}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── ABA: Histórico ── */}
        {detailTab === 'historico' && (
          <div style={{ padding: '20px 0 60px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cbrio-text, #1a1a2e)', marginBottom: 16 }}>Histórico de Alterações</div>
            {auditHistory.length === 0 && <div style={styles.empty}>Nenhuma alteração registrada</div>}
            {auditHistory.map(h => (
              <div key={h.id} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                <span style={{ color: C.text3, minWidth: 120 }}>{new Date(h.created_at).toLocaleString('pt-BR')}</span>
                <span style={{ color: C.text2, minWidth: 80 }}>{h.changed_by_name || '—'}</span>
                <span style={{ color: C.text, flex: 1 }}>{h.description || `${h.action}: ${h.field_name || h.table_name}`}</span>
                {h.old_value && h.new_value && <span style={{ color: C.text3 }}>{h.old_value} → {h.new_value}</span>}
              </div>
            ))}
          </div>
        )}

        {/* ── ABA: Ciclo Criativo (só se ativado) ── */}
        {detailTab === 'ciclo' && (
          <div>
            <BudgetPanel eventId={ev.id} budget={null} onReload={() => refreshDetail()} />
            <CycleView eventId={ev.id} />
          </div>
        )}

        {/* ── ABA: Retrospectiva (só evento concluído) ── */}
        {detailTab === 'retro' && (
          <div>
            {retroData ? (
              <div style={styles.card}>
                <div style={{ padding: '16px 20px' }}>
                  {retroData.overall_rating && <div style={{ fontSize: 14, marginBottom: 10 }}>Avaliação: {'★'.repeat(retroData.overall_rating)}{'☆'.repeat(5 - retroData.overall_rating)}</div>}
                  {retroData.what_went_well && <div style={{ marginBottom: 10 }}><span style={styles.label}>O que foi bem</span><div style={{ fontSize: 13, color: C.text2 }}>{retroData.what_went_well}</div></div>}
                  {retroData.what_to_improve && <div style={{ marginBottom: 10 }}><span style={styles.label}>O que melhorar</span><div style={{ fontSize: 13, color: C.text2 }}>{retroData.what_to_improve}</div></div>}
                  {retroData.action_items && <div><span style={styles.label}>Ações</span><div style={{ fontSize: 13, color: C.text2 }}>{retroData.action_items}</div></div>}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <div style={{ color: C.text3, fontSize: 13, marginBottom: 12 }}>Nenhuma retrospectiva registrada</div>
                <button style={styles.btn('primary')} onClick={() => setShowRetroForm(true)}>Preencher Retrospectiva</button>
              </div>
            )}
          </div>
        )}

        {/* Modal: Novo risco */}
        {showRiskForm && (
          <Modal open onClose={() => setShowRiskForm(false)} title="Novo Risco"
            footer={<>
              <button style={styles.btn('ghost')} onClick={() => setShowRiskForm(false)}>Cancelar</button>
              <button style={styles.btn('primary')} onClick={async () => {
                const f = document.getElementById('risk-form');
                const fd = new FormData(f);
                const data = Object.fromEntries(fd.entries());
                data.probability = parseInt(data.probability); data.impact = parseInt(data.impact);
                await risksApi.create(ev.id, data);
                setShowRiskForm(false);
                risksApi.list(ev.id).then(setEventRisks);
              }}>Salvar</button>
            </>}>
            <form id="risk-form" onSubmit={e => e.preventDefault()}>
              <Input label="Título" name="title" required />
              <Textarea label="Descrição" name="description" />
              <div style={styles.formRow}>
                <Select label="Categoria" name="category">
                  <option value="timeline">Timeline</option><option value="budget">Orçamento</option>
                  <option value="resources">Recursos</option><option value="quality">Qualidade</option>
                  <option value="stakeholder">Stakeholder</option><option value="other">Outro</option>
                </Select>
                <Select label="Probabilidade (1-5)" name="probability" defaultValue="3">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} - {['Rara','Baixa','Média','Alta','Muito Alta'][n-1]}</option>)}
                </Select>
              </div>
              <div style={styles.formRow}>
                <Select label="Impacto (1-5)" name="impact" defaultValue="3">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} - {['Insignificante','Baixo','Moderado','Grave','Catastrófico'][n-1]}</option>)}
                </Select>
                <Input label="Responsável" name="owner_name" />
              </div>
              <Textarea label="Estratégia de mitigação" name="mitigation" />
              <Input label="Data alvo" name="target_date" type="date" />
            </form>
          </Modal>
        )}

        {/* Modal: Retrospectiva */}
        {showRetroForm && (
          <Modal open onClose={() => setShowRetroForm(false)} title="Retrospectiva do Evento"
            footer={<>
              <button style={styles.btn('ghost')} onClick={() => setShowRetroForm(false)}>Cancelar</button>
              <button style={styles.btn('primary')} onClick={async () => {
                const f = document.getElementById('retro-form');
                const fd = new FormData(f);
                const data = Object.fromEntries(fd.entries());
                if (data.overall_rating) data.overall_rating = parseInt(data.overall_rating);
                await retroApi.save(ev.id, data);
                setShowRetroForm(false);
                retroApi.get(ev.id).then(setRetroData);
              }}>Salvar</button>
            </>}>
            <form id="retro-form" onSubmit={e => e.preventDefault()}>
              <Select label="Avaliação geral" name="overall_rating">
                <option value="">Selecionar...</option>
                {[5,4,3,2,1].map(n => <option key={n} value={n}>{'★'.repeat(n)} ({n}/5)</option>)}
              </Select>
              <Textarea label="O que foi bem?" name="what_went_well" />
              <Textarea label="O que pode melhorar?" name="what_to_improve" />
              <Textarea label="Ações para próximos eventos" name="action_items" />
              <Textarea label="Feedback dos participantes" name="attendee_feedback" />
            </form>
          </Modal>
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

          {/* Ciclo Criativo */}
          {isEdit && hasCycle && selectedEvent?.id === modalEvent?.id ? (
            <div style={{ padding: '12px 14px', background: '#d1fae5', borderRadius: 8, border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#10b981' }}>✓ Ciclo Criativo ativado</span>
            </div>
          ) : (
            <div style={{ padding: '12px 14px', background: '#f3e8ff', borderRadius: 8, border: '1px solid #e9d5ff', display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <input type="checkbox" name="ativar_ciclo" id="ciclo-modal" value="true" style={{ width: 18, height: 18, cursor: 'pointer' }} />
              <label htmlFor="ciclo-modal" style={{ fontSize: 14, color: '#7c3aed', fontWeight: 600, cursor: 'pointer' }}>
                Ativar Ciclo Criativo
              </label>
              <span style={{ fontSize: 12, color: C.text3 }}>— 11 fases de produção + trilha administrativa</span>
            </div>
          )}
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
        {(tab <= 3) && (
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
        <button style={styles.tab(tab === 0)} onClick={() => setTab(0)}>Home</button>
        <button style={styles.tab(tab === 1)} onClick={() => setTab(1)}>Lista</button>
        <button style={styles.tab(tab === 2)} onClick={() => { setTab(2); if (!kanbanCycleData) loadKanban(); }}>Kanban</button>
        <button style={styles.tab(tab === 3)} onClick={() => { setTab(3); if (!kanbanCycleData) loadKanban(); }}>Gantt</button>
        {selectedEvent && <button style={styles.tab(tab === 4)} onClick={() => setTab(4)}>Detalhes</button>}
      </div>

      {/* Content */}
      {tab === 0 && renderHome()}
      {tab === 1 && renderList()}
      {tab === 2 && renderKanban()}
      {tab === 3 && renderGantt()}
      {tab === 4 && renderDetail()}

      {/* Modals */}
      {renderEventModal()}
      {renderTaskModal()}
    </div>
  );
}
