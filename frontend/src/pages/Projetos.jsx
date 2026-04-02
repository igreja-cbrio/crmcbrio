import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { projects } from '../api';

// ── Tema ────────────────────────────────────────────────────
const C = {
  bg: '#0a0a0a', card: '#161616', primary: '#00B39D', primaryBg: '#00B39D18',
  text: '#e5e5e5', text2: '#a3a3a3', text3: '#737373',
  border: '#262626', green: '#10b981', greenBg: '#10b98118',
  red: '#ef4444', redBg: '#ef444418', amber: '#f59e0b', amberBg: '#f59e0b18',
  blue: '#3b82f6', blueBg: '#3b82f618',
};

const STATUS_MAP = {
  planejamento: { c: C.blue, bg: C.blueBg, label: 'Planejamento' },
  em_andamento: { c: C.amber, bg: C.amberBg, label: 'Em Andamento' },
  concluido: { c: C.green, bg: C.greenBg, label: 'Concluído' },
  cancelado: { c: C.red, bg: C.redBg, label: 'Cancelado' },
};

const TASK_STATUS = {
  pendente: { c: C.amber, bg: C.amberBg, label: 'Pendente' },
  em_andamento: { c: C.blue, bg: C.blueBg, label: 'Em Andamento' },
  concluida: { c: C.green, bg: C.greenBg, label: 'Concluída' },
  cancelada: { c: C.red, bg: C.redBg, label: 'Cancelada' },
};

const PRIORITY_MAP = {
  baixa: { c: C.green, bg: C.greenBg, label: 'Baixa' },
  media: { c: C.amber, bg: C.amberBg, label: 'Média' },
  alta: { c: C.red, bg: C.redBg, label: 'Alta' },
};

const AREAS = ['Administrativa', 'Ministerial', 'Criativo', 'Geracional', 'Operações', 'Comunicação'];

// ── Estilos ─────────────────────────────────────────────────
const styles = {
  page: { maxWidth: 1200, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.text2, marginTop: 2 },
  tabs: { display: 'flex', gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 24 },
  tab: (a) => ({
    padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none',
    color: a ? C.primary : C.text2, borderBottom: a ? `2px solid ${C.primary}` : '2px solid transparent',
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
  th: { padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left', borderBottom: `1px solid ${C.border}`, background: '#1e1e1e' },
  td: { padding: '12px 16px', fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}` },
  badge: (color, bg) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color, background: bg }),
  btn: (v = 'primary') => ({
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
    ...(v === 'primary' ? { background: C.primary, color: '#fff' } : {}),
    ...(v === 'secondary' ? { background: 'transparent', color: C.primary, border: `1px solid ${C.primary}` } : {}),
    ...(v === 'danger' ? { background: C.red, color: '#fff' } : {}),
    ...(v === 'ghost' ? { background: 'transparent', color: C.text2, padding: '6px 12px' } : {}),
  }),
  btnSm: { padding: '4px 10px', fontSize: 11 },
  filterRow: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  input: { padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', width: '100%', background: '#1e1e1e', color: '#e5e5e5' },
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
  progress: (pct) => ({ height: 8, borderRadius: 4, background: C.border, overflow: 'hidden', flex: 1 }),
  progressBar: (pct) => ({ height: '100%', borderRadius: 4, background: pct >= 100 ? C.green : C.primary, width: `${Math.min(pct, 100)}%`, transition: 'width 0.3s' }),
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 },
  infoLabel: { fontSize: 11, fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: 500, color: C.text, marginTop: 2 },
};

// ── Helpers ─────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '--';
const fmtMoney = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '--';
const thisYear = new Date().getFullYear();

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

function Badge({ status, map }) {
  const s = map[status] || { c: C.text3, bg: '#73737318', label: status || '--' };
  return <span style={styles.badge(s.c, s.bg)}>{s.label}</span>;
}

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={styles.progress(pct)}><div style={styles.progressBar(pct)} /></div>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.text2, minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

// ── TABS ────────────────────────────────────────────────────
const TABS = ['Lista', 'Detalhes'];

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
export default function Projetos() {
  const { isDiretor } = useAuth();
  const [tab, setTab] = useState(0);
  const [list, setList] = useState([]);
  const [dash, setDash] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtros
  const [fYear, setFYear] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fArea, setFArea] = useState('');

  // Modais
  const [modalProject, setModalProject] = useState(null);
  const [modalTask, setModalTask] = useState(null);
  const [modalObj, setModalObj] = useState(null);
  const [modalMilestone, setModalMilestone] = useState(null);

  // ── Loaders ──
  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (fYear) params.year = fYear;
      if (fStatus) params.status = fStatus;
      if (fArea) params.area = fArea;
      setList(await projects.list(params));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [fYear, fStatus, fArea]);

  const loadDash = useCallback(async () => {
    try { setDash(await projects.dashboard()); } catch (e) { console.error(e); }
  }, []);

  const loadDetail = useCallback(async (id) => {
    try { setDetail(await projects.get(id)); setTab(1); } catch (e) { alert(e.message); }
  }, []);

  useEffect(() => { loadList(); loadDash(); }, []);
  useEffect(() => { loadList(); }, [fYear, fStatus, fArea]);

  // ── Handlers ──
  async function saveProject(data) {
    try {
      if (data.id) { await projects.update(data.id, data); }
      else { await projects.create(data); }
      setModalProject(null);
      loadList(); loadDash();
      if (detail && data.id === detail.id) loadDetail(data.id);
    } catch (e) { alert(e.message); }
  }

  async function deleteProject(id) {
    if (!confirm('Remover este projeto?')) return;
    try {
      await projects.remove(id);
      loadList(); loadDash();
      if (detail && detail.id === id) { setDetail(null); setTab(0); }
    } catch (e) { alert(e.message); }
  }

  async function saveObjective(data) {
    try {
      if (data.id) await projects.updateObjective(data.id, data);
      else await projects.createObjective(detail.id, data);
      setModalObj(null); loadDetail(detail.id);
    } catch (e) { alert(e.message); }
  }

  async function saveTask(data) {
    try {
      if (data.id) await projects.updateTask(data.id, data);
      else await projects.createTask(detail.id, data);
      setModalTask(null); loadDetail(detail.id);
    } catch (e) { alert(e.message); }
  }

  async function deleteTask(taskId) {
    if (!confirm('Remover esta tarefa?')) return;
    try { await projects.removeTask(taskId); loadDetail(detail.id); } catch (e) { alert(e.message); }
  }

  async function quickTaskStatus(taskId, status) {
    try { await projects.updateTaskStatus(taskId, status); loadDetail(detail.id); } catch (e) { alert(e.message); }
  }

  async function saveMilestone(data) {
    try {
      await projects.createMilestone(detail.id, data);
      setModalMilestone(null); loadDetail(detail.id);
    } catch (e) { alert(e.message); }
  }

  async function toggleMilestone(mId, done) {
    try { await projects.toggleMilestone(mId, done); loadDetail(detail.id); } catch (e) { alert(e.message); }
  }

  // ── Render ──
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Projetos</div>
          <div style={styles.subtitle}>Planejamento e acompanhamento de projetos</div>
        </div>
        {isDiretor && tab === 0 && (
          <button style={styles.btn('primary')} onClick={() => setModalProject({})}>+ Novo Projeto</button>
        )}
      </div>

      <div style={styles.tabs}>
        {TABS.map((t, i) => (
          <button key={t} style={styles.tab(tab === i)} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {error && <div style={{ color: C.red, marginBottom: 12, fontSize: 13 }}>{error}</div>}

      {tab === 0 && (
        <>
          {/* KPIs */}
          {dash && (
            <div style={styles.kpiGrid}>
              <div style={styles.kpi(C.primary)}><div style={styles.kpiValue}>{dash.total ?? 0}</div><div style={styles.kpiLabel}>Total</div></div>
              <div style={styles.kpi(C.amber)}><div style={styles.kpiValue}>{dash.em_andamento ?? 0}</div><div style={styles.kpiLabel}>Em Andamento</div></div>
              <div style={styles.kpi(C.green)}><div style={styles.kpiValue}>{dash.concluidos ?? 0}</div><div style={styles.kpiLabel}>Concluidos</div></div>
              <div style={styles.kpi(C.blue)}><div style={styles.kpiValue}>{dash.planejamento ?? 0}</div><div style={styles.kpiLabel}>Planejamento</div></div>
            </div>
          )}

          {/* Filtros */}
          <div style={styles.filterRow}>
            <select style={styles.select} value={fYear} onChange={e => setFYear(e.target.value)}>
              <option value="">Todos os Anos</option>
              {[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select style={styles.select} value={fStatus} onChange={e => setFStatus(e.target.value)}>
              <option value="">Todos os Status</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select style={styles.select} value={fArea} onChange={e => setFArea(e.target.value)}>
              <option value="">Todas as Areas</option>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Tabela */}
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nome</th>
                  <th style={styles.th}>Ano</th>
                  <th style={styles.th}>Area</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Prioridade</th>
                  <th style={styles.th}>Orcamento</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td style={styles.td} colSpan={6}>Carregando...</td></tr>
                ) : list.length === 0 ? (
                  <tr><td style={styles.empty} colSpan={6}>Nenhum projeto encontrado.</td></tr>
                ) : list.map(p => (
                  <tr key={p.id} style={styles.clickRow} onClick={() => loadDetail(p.id)}
                    onMouseEnter={e => e.currentTarget.style.background = '#1e1e1e'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{p.name}</td>
                    <td style={styles.td}>{p.year}</td>
                    <td style={styles.td}>{p.area || '--'}</td>
                    <td style={styles.td}><Badge status={p.status} map={STATUS_MAP} /></td>
                    <td style={styles.td}><Badge status={p.priority} map={PRIORITY_MAP} /></td>
                    <td style={styles.td}>{fmtMoney(p.budget_planned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 1 && (
        detail ? <DetailView
          p={detail} isDiretor={isDiretor}
          onEdit={() => setModalProject(detail)}
          onDelete={() => deleteProject(detail.id)}
          onAddObj={() => setModalObj({})}
          onEditObj={(o) => setModalObj(o)}
          onAddTask={() => setModalTask({})}
          onEditTask={(t) => setModalTask(t)}
          onDeleteTask={deleteTask}
          onQuickStatus={quickTaskStatus}
          onAddMilestone={() => setModalMilestone({})}
          onToggleMilestone={toggleMilestone}
          onBack={() => setTab(0)}
        /> : <div style={styles.empty}>Selecione um projeto na aba Lista.</div>
      )}

      {/* Modais */}
      <ProjectFormModal open={!!modalProject} data={modalProject} onClose={() => setModalProject(null)} onSave={saveProject} isDiretor={isDiretor} />
      <ObjectiveFormModal open={!!modalObj} data={modalObj} onClose={() => setModalObj(null)} onSave={saveObjective} />
      <TaskFormModal open={!!modalTask} data={modalTask} objectives={detail?.objectives || []} onClose={() => setModalTask(null)} onSave={saveTask} />
      <MilestoneFormModal open={!!modalMilestone} onClose={() => setModalMilestone(null)} onSave={saveMilestone} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DETAIL VIEW
// ═══════════════════════════════════════════════════════════
function DetailView({ p, isDiretor, onEdit, onDelete, onAddObj, onEditObj, onAddTask, onEditTask, onDeleteTask, onQuickStatus, onAddMilestone, onToggleMilestone, onBack }) {
  const objectives = p.objectives || [];
  const tasks = p.tasks || [];
  const milestones = p.milestones || [];
  const evts = p.events || [];
  const meetings = p.meetings || [];

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <button style={styles.btn('ghost')} onClick={onBack}>← Voltar</button>
        {isDiretor && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.btn('secondary')} onClick={onEdit}>Editar</button>
            <button style={styles.btn('danger')} onClick={onDelete}>Excluir</button>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div style={{ ...styles.card, marginBottom: 24 }}>
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 8 }}>{p.name}</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <Badge status={p.status} map={STATUS_MAP} />
            <Badge status={p.priority} map={PRIORITY_MAP} />
            {p.area && <span style={styles.badge(C.primary, C.primaryBg)}>{p.area}</span>}
          </div>
          <div style={styles.infoGrid}>
            <div><div style={styles.infoLabel}>Ano</div><div style={styles.infoValue}>{p.year}</div></div>
            <div><div style={styles.infoLabel}>Responsavel</div><div style={styles.infoValue}>{p.owner_name || '--'}</div></div>
            <div><div style={styles.infoLabel}>Inicio</div><div style={styles.infoValue}>{fmtDate(p.start_date)}</div></div>
            <div><div style={styles.infoLabel}>Fim</div><div style={styles.infoValue}>{fmtDate(p.end_date)}</div></div>
            <div><div style={styles.infoLabel}>Orcamento Planejado</div><div style={styles.infoValue}>{fmtMoney(p.budget_planned)}</div></div>
            <div><div style={styles.infoLabel}>Orcamento Gasto</div><div style={styles.infoValue}>{fmtMoney(p.budget_spent)}</div></div>
          </div>
          {p.description && <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6, marginTop: 8 }}>{p.description}</div>}
        </div>
      </div>

      {/* Objectives */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <span>Objetivos ({objectives.length})</span>
          {isDiretor && <button style={{ ...styles.btn('secondary'), ...styles.btnSm }} onClick={onAddObj}>+ Objetivo</button>}
        </div>
        {objectives.length === 0 ? (
          <div style={styles.empty}>Nenhum objetivo cadastrado.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {objectives.map(o => (
              <div key={o.id} style={{ ...styles.card, padding: 16, cursor: isDiretor ? 'pointer' : 'default' }} onClick={() => isDiretor && onEditObj(o)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{o.name}</span>
                  <span style={{ fontSize: 12, color: C.text3 }}>{o.current_value ?? 0}/{o.target_value ?? 0} {o.unit || ''}</span>
                </div>
                <ProgressBar value={o.current_value ?? 0} max={o.target_value ?? 1} />
                {o.deadline && <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>Prazo: {fmtDate(o.deadline)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tasks */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <span>Tarefas ({tasks.length})</span>
          {isDiretor && <button style={{ ...styles.btn('secondary'), ...styles.btnSm }} onClick={onAddTask}>+ Tarefa</button>}
        </div>
        {tasks.length === 0 ? (
          <div style={styles.empty}>Nenhuma tarefa cadastrada.</div>
        ) : (
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Tarefa</th>
                  <th style={styles.th}>Responsavel</th>
                  <th style={styles.th}>Prazo</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Prioridade</th>
                  <th style={styles.th}>%</th>
                  {isDiretor && <th style={styles.th}>Acoes</th>}
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id}>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{t.name}</td>
                    <td style={styles.td}>{t.responsible || '--'}</td>
                    <td style={styles.td}>{fmtDate(t.deadline)}</td>
                    <td style={styles.td}>
                      {isDiretor ? (
                        <select style={{ ...styles.select, fontSize: 11, padding: '2px 6px' }} value={t.status}
                          onChange={e => onQuickStatus(t.id, e.target.value)}>
                          {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      ) : <Badge status={t.status} map={TASK_STATUS} />}
                    </td>
                    <td style={styles.td}><Badge status={t.priority} map={PRIORITY_MAP} /></td>
                    <td style={styles.td}>{t.pct ?? 0}%</td>
                    {isDiretor && (
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => onEditTask(t)}>Editar</button>
                          <button style={{ ...styles.btn('ghost'), ...styles.btnSm, color: C.red }} onClick={() => onDeleteTask(t.id)}>Excluir</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Milestones */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <span>Marcos ({milestones.length})</span>
          {isDiretor && <button style={{ ...styles.btn('secondary'), ...styles.btnSm }} onClick={onAddMilestone}>+ Marco</button>}
        </div>
        {milestones.length === 0 ? (
          <div style={styles.empty}>Nenhum marco cadastrado.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {milestones.map(m => (
              <div key={m.id} style={{ ...styles.card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="checkbox" checked={!!m.done} disabled={!isDiretor}
                  onChange={e => onToggleMilestone(m.id, e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: C.primary, cursor: isDiretor ? 'pointer' : 'default' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: m.done ? C.text3 : C.text, textDecoration: m.done ? 'line-through' : 'none' }}>{m.name}</div>
                  {m.description && <div style={{ fontSize: 12, color: C.text3 }}>{m.description}</div>}
                </div>
                <span style={{ fontSize: 12, color: C.text3, whiteSpace: 'nowrap' }}>{fmtDate(m.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Eventos vinculados */}
      {evts.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}><span>Eventos Vinculados ({evts.length})</span></div>
          <div style={styles.card}>
            <table style={styles.table}>
              <thead><tr><th style={styles.th}>Evento</th><th style={styles.th}>Data</th><th style={styles.th}>Status</th></tr></thead>
              <tbody>
                {evts.map(ev => (
                  <tr key={ev.id}>
                    <td style={styles.td}>{ev.name}</td>
                    <td style={styles.td}>{fmtDate(ev.date)}</td>
                    <td style={styles.td}>{ev.status || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reunioes vinculadas */}
      {meetings.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}><span>Reunioes Vinculadas ({meetings.length})</span></div>
          <div style={styles.card}>
            <table style={styles.table}>
              <thead><tr><th style={styles.th}>Reuniao</th><th style={styles.th}>Data</th><th style={styles.th}>Local</th></tr></thead>
              <tbody>
                {meetings.map(mt => (
                  <tr key={mt.id}>
                    <td style={styles.td}>{mt.title || mt.name}</td>
                    <td style={styles.td}>{fmtDate(mt.date)}</td>
                    <td style={styles.td}>{mt.location || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MODAIS
// ═══════════════════════════════════════════════════════════

function ProjectFormModal({ open, data, onClose, onSave, isDiretor }) {
  const [form, setForm] = useState({});
  useEffect(() => { if (data) setForm({ year: thisYear, status: 'planejamento', priority: 'media', ...data }); }, [data]);
  if (!open || !isDiretor) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal open title={form.id ? 'Editar Projeto' : 'Novo Projeto'} onClose={onClose}
      footer={<><button style={styles.btn('ghost')} onClick={onClose}>Cancelar</button><button style={styles.btn('primary')} onClick={() => onSave(form)}>Salvar</button></>}>
      <Input label="Nome" value={form.name || ''} onChange={e => set('name', e.target.value)} />
      <div style={styles.formRow}>
        <Input label="Ano" type="number" value={form.year || ''} onChange={e => set('year', e.target.value)} />
        <Select label="Area" value={form.area || ''} onChange={e => set('area', e.target.value)}>
          <option value="">Selecione</option>
          {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
        </Select>
      </div>
      <div style={styles.formRow}>
        <Select label="Status" value={form.status || ''} onChange={e => set('status', e.target.value)}>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select label="Prioridade" value={form.priority || ''} onChange={e => set('priority', e.target.value)}>
          {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>
      <div style={styles.formRow}>
        <Input label="Data Inicio" type="date" value={form.start_date || ''} onChange={e => set('start_date', e.target.value)} />
        <Input label="Data Fim" type="date" value={form.end_date || ''} onChange={e => set('end_date', e.target.value)} />
      </div>
      <div style={styles.formRow}>
        <Input label="Orcamento Planejado" type="number" step="0.01" value={form.budget_planned || ''} onChange={e => set('budget_planned', e.target.value)} />
        {form.id && <Input label="Orcamento Gasto" type="number" step="0.01" value={form.budget_spent || ''} onChange={e => set('budget_spent', e.target.value)} />}
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Descricao</label>
        <textarea style={{ ...styles.input, minHeight: 80, resize: 'vertical' }} value={form.description || ''} onChange={e => set('description', e.target.value)} />
      </div>
      <Input label="Notas" value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
    </Modal>
  );
}

function ObjectiveFormModal({ open, data, onClose, onSave }) {
  const [form, setForm] = useState({});
  useEffect(() => { if (data) setForm({ ...data }); }, [data]);
  if (!open) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal open title={form.id ? 'Editar Objetivo' : 'Novo Objetivo'} onClose={onClose}
      footer={<><button style={styles.btn('ghost')} onClick={onClose}>Cancelar</button><button style={styles.btn('primary')} onClick={() => onSave(form)}>Salvar</button></>}>
      <Input label="Nome" value={form.name || ''} onChange={e => set('name', e.target.value)} />
      <div style={styles.formGroup}>
        <label style={styles.label}>Descricao</label>
        <textarea style={{ ...styles.input, minHeight: 60, resize: 'vertical' }} value={form.description || ''} onChange={e => set('description', e.target.value)} />
      </div>
      <div style={styles.formRow}>
        <Input label="Meta (valor alvo)" type="number" value={form.target_value || ''} onChange={e => set('target_value', e.target.value)} />
        <Input label="Unidade" value={form.unit || ''} onChange={e => set('unit', e.target.value)} placeholder="ex: pessoas, %" />
      </div>
      {form.id && (
        <div style={styles.formRow}>
          <Input label="Valor Atual" type="number" value={form.current_value || ''} onChange={e => set('current_value', e.target.value)} />
          <Select label="Status" value={form.status || ''} onChange={e => set('status', e.target.value)}>
            <option value="">Selecione</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluido">Concluido</option>
            <option value="cancelado">Cancelado</option>
          </Select>
        </div>
      )}
      <Input label="Prazo" type="date" value={form.deadline || ''} onChange={e => set('deadline', e.target.value)} />
    </Modal>
  );
}

function TaskFormModal({ open, data, objectives, onClose, onSave }) {
  const [form, setForm] = useState({});
  useEffect(() => { if (data) setForm({ status: 'pendente', priority: 'media', pct: 0, ...data }); }, [data]);
  if (!open) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal open title={form.id ? 'Editar Tarefa' : 'Nova Tarefa'} onClose={onClose}
      footer={<><button style={styles.btn('ghost')} onClick={onClose}>Cancelar</button><button style={styles.btn('primary')} onClick={() => onSave(form)}>Salvar</button></>}>
      <Input label="Nome" value={form.name || ''} onChange={e => set('name', e.target.value)} />
      {objectives.length > 0 && (
        <Select label="Objetivo vinculado" value={form.objective_id || ''} onChange={e => set('objective_id', e.target.value)}>
          <option value="">Nenhum</option>
          {objectives.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </Select>
      )}
      <div style={styles.formRow}>
        <Input label="Responsavel" value={form.responsible || ''} onChange={e => set('responsible', e.target.value)} />
        <Select label="Area" value={form.area || ''} onChange={e => set('area', e.target.value)}>
          <option value="">Selecione</option>
          {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
        </Select>
      </div>
      <div style={styles.formRow}>
        <Input label="Data Inicio" type="date" value={form.start_date || ''} onChange={e => set('start_date', e.target.value)} />
        <Input label="Prazo" type="date" value={form.deadline || ''} onChange={e => set('deadline', e.target.value)} />
      </div>
      <div style={styles.formRow}>
        <Select label="Status" value={form.status || ''} onChange={e => set('status', e.target.value)}>
          {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select label="Prioridade" value={form.priority || ''} onChange={e => set('priority', e.target.value)}>
          {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>
      {form.id && <Input label="Progresso (%)" type="number" min="0" max="100" value={form.pct || ''} onChange={e => set('pct', e.target.value)} />}
      <div style={styles.formGroup}>
        <label style={styles.label}>Descricao</label>
        <textarea style={{ ...styles.input, minHeight: 60, resize: 'vertical' }} value={form.description || ''} onChange={e => set('description', e.target.value)} />
      </div>
    </Modal>
  );
}

function MilestoneFormModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({});
  useEffect(() => { if (open) setForm({}); }, [open]);
  if (!open) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal open title="Novo Marco" onClose={onClose}
      footer={<><button style={styles.btn('ghost')} onClick={onClose}>Cancelar</button><button style={styles.btn('primary')} onClick={() => onSave(form)}>Salvar</button></>}>
      <Input label="Nome" value={form.name || ''} onChange={e => set('name', e.target.value)} />
      <Input label="Data" type="date" value={form.date || ''} onChange={e => set('date', e.target.value)} />
      <div style={styles.formGroup}>
        <label style={styles.label}>Descricao</label>
        <textarea style={{ ...styles.input, minHeight: 60, resize: 'vertical' }} value={form.description || ''} onChange={e => set('description', e.target.value)} />
      </div>
    </Modal>
  );
}
