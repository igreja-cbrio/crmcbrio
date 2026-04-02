import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { expansion } from '../api';

// ── Tema ────────────────────────────────────────────────────
const C = {
  bg: 'var(--cbrio-bg)', card: 'var(--cbrio-card)', primary: '#00B39D', primaryBg: '#00B39D18',
  text: 'var(--cbrio-text)', text2: 'var(--cbrio-text2)', text3: 'var(--cbrio-text3)',
  border: 'var(--cbrio-border)', green: '#10b981', greenBg: '#10b98118',
  red: '#ef4444', redBg: '#ef444418', amber: '#f59e0b', amberBg: '#f59e0b18',
  blue: '#3b82f6', blueBg: '#3b82f618',
};

const PHASE_LABELS = {
  planejamento: { label: 'Planejamento', c: C.blue, bg: C.blueBg },
  execucao: { label: 'Execução', c: C.amber, bg: C.amberBg },
  concluida: { label: 'Concluída', c: C.green, bg: C.greenBg },
  pausada: { label: 'Pausada', c: C.text3, bg: '#73737318' },
};

const TASK_STATUS = {
  pendente: { label: 'Pendente', c: C.amber, bg: C.amberBg },
  em_andamento: { label: 'Em andamento', c: C.blue, bg: C.blueBg },
  concluida: { label: 'Concluída', c: C.green, bg: C.greenBg },
};

// ── Estilos ─────────────────────────────────────────────────
const styles = {
  page: { maxWidth: 1200, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.text2, marginTop: 2 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 },
  kpi: (color) => ({
    background: C.card, borderRadius: 12, padding: '16px 20px', border: `1px solid ${C.border}`,
    borderLeft: `4px solid ${color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }),
  kpiValue: { fontSize: 28, fontWeight: 800, color: C.text },
  kpiLabel: { fontSize: 11, fontWeight: 600, color: C.text2, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  card: {
    background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: 16, overflow: 'hidden',
  },
  cardHeader: { padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: 700, color: C.text },
  badge: (color, bg) => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color, background: bg,
  }),
  btn: (variant = 'primary') => ({
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
    ...(variant === 'primary' ? { background: C.primary, color: '#fff' } : {}),
    ...(variant === 'secondary' ? { background: 'transparent', color: C.primary, border: `1px solid ${C.primary}` } : {}),
    ...(variant === 'danger' ? { background: C.red, color: '#fff' } : {}),
    ...(variant === 'ghost' ? { background: 'transparent', color: C.text2, padding: '6px 12px' } : {}),
  }),
  btnSm: { padding: '4px 10px', fontSize: 11 },
  progressBar: (pct, color = C.primary) => ({
    height: 8, borderRadius: 4, background: C.border, position: 'relative', overflow: 'hidden', flex: 1,
  }),
  progressFill: (pct, color = C.primary) => ({
    height: '100%', borderRadius: 4, background: color, width: `${Math.min(100, Math.max(0, pct))}%`, transition: 'width 0.3s',
  }),
  input: {
    padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13,
    color: C.text, outline: 'none', width: '100%', boxSizing: 'border-box', background: 'var(--cbrio-input-bg)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  select: {
    padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13,
    color: C.text, outline: 'none', width: '100%', boxSizing: 'border-box', background: 'var(--cbrio-input-bg)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  textarea: {
    padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13,
    color: C.text, outline: 'none', width: '100%', boxSizing: 'border-box', minHeight: 60, resize: 'vertical', background: 'var(--cbrio-input-bg)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  label: { fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 4, display: 'block' },
  formGroup: { marginBottom: 14 },
  overlay: {
    position: 'fixed', inset: 0, background: 'var(--cbrio-overlay)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: 'var(--cbrio-modal-bg)', borderRadius: 16, padding: 28, width: '90%', maxWidth: 500,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '85vh', overflowY: 'auto',
  },
  modalTitle: { fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 20 },
  modalActions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 },
  milestoneBody: { padding: '16px 20px' },
  taskRow: {
    padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
  },
  subtaskRow: {
    padding: '8px 20px 8px 44px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--cbrio-input-bg)',
  },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 14, color: C.text3, lineHeight: 1,
  },
  budgetRow: { display: 'flex', gap: 16, fontSize: 13, color: C.text2 },
  empty: { textAlign: 'center', padding: 40, color: C.text3, fontSize: 14 },
};

// ── Helpers ─────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const money = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

function calcTaskProgress(task) {
  if (!task.subtasks || task.subtasks.length === 0) {
    return task.status === 'concluida' ? 100 : task.status === 'em_andamento' ? 50 : 0;
  }
  const total = task.subtasks.reduce((s, st) => s + (st.pct || 0), 0);
  return Math.round(total / task.subtasks.length);
}

function calcMilestoneProgress(milestone) {
  if (!milestone.tasks || milestone.tasks.length === 0) return 0;
  const total = milestone.tasks.reduce((s, t) => s + calcTaskProgress(t), 0);
  return Math.round(total / milestone.tasks.length);
}

function progressColor(pct) {
  if (pct >= 80) return C.green;
  if (pct >= 40) return C.amber;
  return C.red;
}

// ── Modal Component ─────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalTitle}>{title}</div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={styles.formGroup}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

// ── Progress Bar ────────────────────────────────────────────
function ProgressBar({ pct, color, height = 8, showLabel = true }) {
  const c = color || progressColor(pct);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
      <div style={{ height, borderRadius: height / 2, background: C.border, flex: 1, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: height / 2, background: c, width: `${Math.min(100, Math.max(0, pct))}%`, transition: 'width 0.3s' }} />
      </div>
      {showLabel && <span style={{ fontSize: 12, fontWeight: 600, color: c, minWidth: 36, textAlign: 'right' }}>{pct}%</span>}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────
export default function Expansao() {
  const { isDiretor } = useAuth();
  const [milestones, setMilestones] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [modal, setModal] = useState(null); // { type, data?, milestoneId?, taskId? }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [ms, db] = await Promise.all([expansion.milestones(), expansion.dashboard()]);
      setMilestones(ms);
      setDashboard(db);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  // ── CRUD Handlers ───────────────────────────────────────
  const saveMilestone = async (form) => {
    setSaving(true);
    try {
      if (form.id) {
        await expansion.updateMilestone(form.id, form);
      } else {
        await expansion.createMilestone(form);
      }
      setModal(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteMilestone = async (id) => {
    if (!window.confirm('Excluir este marco e todas as suas tarefas?')) return;
    try {
      await expansion.removeMilestone(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveTask = async (form, milestoneId) => {
    setSaving(true);
    try {
      if (form.id) {
        await expansion.updateTask(form.id, form);
      } else {
        await expansion.createTask(milestoneId, form);
      }
      setModal(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm('Excluir esta tarefa e suas subtarefas?')) return;
    try {
      await expansion.removeTask(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addSubtask = async (taskId, name) => {
    if (!name.trim()) return;
    try {
      await expansion.createSubtask(taskId, { name });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateSubtaskPct = async (id, pct) => {
    try {
      await expansion.updateSubtaskPct(id, pct);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteSubtask = async (id) => {
    try {
      await expansion.removeSubtask(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Render ──────────────────────────────────────────────
  if (loading) return <div style={styles.page}><div style={styles.empty}>Carregando...</div></div>;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Expansao</div>
          <div style={styles.subtitle}>Acompanhamento de marcos e tarefas de expansao</div>
        </div>
        {isDiretor && (
          <button style={styles.btn('primary')} onClick={() => setModal({ type: 'milestone' })}>
            + Novo Marco
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: C.redBg, color: C.red, fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* KPIs */}
      {dashboard && (
        <div style={styles.kpiGrid}>
          <div style={styles.kpi(C.primary)}>
            <div style={styles.kpiValue}>{dashboard.total_milestones ?? milestones.length}</div>
            <div style={styles.kpiLabel}>Marcos</div>
          </div>
          <div style={styles.kpi(C.blue)}>
            <div style={styles.kpiValue}>{dashboard.total_tasks ?? milestones.reduce((s, m) => s + (m.tasks?.length || 0), 0)}</div>
            <div style={styles.kpiLabel}>Tarefas</div>
          </div>
          <div style={styles.kpi(C.green)}>
            <div style={styles.kpiValue}>{dashboard.completed_tasks ?? 0}</div>
            <div style={styles.kpiLabel}>Concluidas</div>
          </div>
          <div style={styles.kpi(C.amber)}>
            <div style={styles.kpiValue}>
              {dashboard.overall_progress != null ? `${dashboard.overall_progress}%` : `${milestones.length ? Math.round(milestones.reduce((s, m) => s + calcMilestoneProgress(m), 0) / milestones.length) : 0}%`}
            </div>
            <div style={styles.kpiLabel}>Progresso Geral</div>
          </div>
        </div>
      )}

      {/* Milestones */}
      {milestones.length === 0 ? (
        <div style={styles.empty}>Nenhum marco cadastrado.</div>
      ) : (
        milestones.map((mi) => {
          const pct = calcMilestoneProgress(mi);
          const phase = PHASE_LABELS[mi.phase] || PHASE_LABELS.planejamento;
          const isOpen = expanded[mi.id];
          return (
            <div key={mi.id} style={styles.card}>
              {/* Milestone Header */}
              <div style={{ ...styles.cardHeader, cursor: 'pointer' }} onClick={() => toggle(mi.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <span style={{ fontSize: 16, color: C.text3, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>
                    &#9654;
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={styles.cardTitle}>{mi.name}</span>
                      <span style={styles.badge(phase.c, phase.bg)}>{phase.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color: C.text2, flexWrap: 'wrap' }}>
                      <span>Prazo: {fmt(mi.deadline)}</span>
                      <span>Planejado: {money(mi.budget_planned)}</span>
                      <span>Gasto: {money(mi.budget_spent)}</span>
                      <span>{mi.tasks?.length || 0} tarefas</span>
                    </div>
                  </div>
                  <div style={{ minWidth: 140 }}>
                    <ProgressBar pct={pct} />
                  </div>
                </div>
                {isDiretor && (
                  <div style={{ display: 'flex', gap: 4, marginLeft: 8 }} onClick={(e) => e.stopPropagation()}>
                    <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => setModal({ type: 'milestone', data: mi })}>Editar</button>
                    <button style={{ ...styles.btn('ghost'), ...styles.btnSm, color: C.red }} onClick={() => deleteMilestone(mi.id)}>Excluir</button>
                  </div>
                )}
              </div>

              {/* Expanded Tasks */}
              {isOpen && (
                <div>
                  {mi.description && (
                    <div style={{ padding: '12px 20px', fontSize: 13, color: C.text2, borderBottom: `1px solid ${C.border}`, background: '#1e1e1e' }}>
                      {mi.description}
                    </div>
                  )}

                  {(mi.tasks || []).map((task) => {
                    const tPct = calcTaskProgress(task);
                    const tStatus = TASK_STATUS[task.status] || TASK_STATUS.pendente;
                    return (
                      <TaskRow
                        key={task.id}
                        task={task}
                        tPct={tPct}
                        tStatus={tStatus}
                        isDiretor={isDiretor}
                        onEdit={() => setModal({ type: 'task', data: task, milestoneId: mi.id })}
                        onDelete={() => deleteTask(task.id)}
                        onAddSubtask={(name) => addSubtask(task.id, name)}
                        onUpdateSubtaskPct={updateSubtaskPct}
                        onDeleteSubtask={deleteSubtask}
                      />
                    );
                  })}

                  {isDiretor && (
                    <div style={{ padding: '12px 20px' }}>
                      <button style={{ ...styles.btn('secondary'), ...styles.btnSm }} onClick={() => setModal({ type: 'task', milestoneId: mi.id })}>
                        + Adicionar Tarefa
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Modals */}
      {modal?.type === 'milestone' && (
        <MilestoneModal data={modal.data} saving={saving} onSave={saveMilestone} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'task' && (
        <TaskModal data={modal.data} milestoneId={modal.milestoneId} saving={saving} onSave={saveTask} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ── Task Row ────────────────────────────────────────────────
function TaskRow({ task, tPct, tStatus, isDiretor, onEdit, onDelete, onAddSubtask, onUpdateSubtaskPct, onDeleteSubtask }) {
  const [showSubs, setShowSubs] = useState(false);
  const [newSub, setNewSub] = useState('');

  return (
    <div>
      <div style={styles.taskRow}>
        <button style={styles.iconBtn} onClick={() => setShowSubs(!showSubs)} title="Subtarefas">
          <span style={{ transform: showSubs ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>&#9654;</span>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{task.name}</span>
            <span style={styles.badge(tStatus.c, tStatus.bg)}>{tStatus.label}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: C.text3, flexWrap: 'wrap' }}>
            {task.responsible && <span>Resp: {task.responsible}</span>}
            {task.area && <span>Area: {task.area}</span>}
            {task.deadline && <span>Prazo: {fmt(task.deadline)}</span>}
          </div>
        </div>
        <div style={{ minWidth: 110 }}>
          <ProgressBar pct={tPct} height={6} />
        </div>
        {isDiretor && (
          <div style={{ display: 'flex', gap: 2 }}>
            <button style={{ ...styles.iconBtn, fontSize: 12 }} onClick={onEdit} title="Editar">&#9998;</button>
            <button style={{ ...styles.iconBtn, fontSize: 12, color: C.red }} onClick={onDelete} title="Excluir">&#10005;</button>
          </div>
        )}
      </div>

      {/* Subtasks */}
      {showSubs && (
        <div>
          {(task.subtasks || []).map((st) => (
            <div key={st.id} style={styles.subtaskRow}>
              <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{st.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={st.pct || 0}
                  onChange={(e) => onUpdateSubtaskPct(st.id, Number(e.target.value))}
                  style={{ width: 80, cursor: 'pointer', accentColor: C.primary }}
                  disabled={!isDiretor}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: progressColor(st.pct || 0), minWidth: 36, textAlign: 'right' }}>
                  {st.pct || 0}%
                </span>
                {isDiretor && (
                  <button style={{ ...styles.iconBtn, fontSize: 11, color: C.red }} onClick={() => onDeleteSubtask(st.id)} title="Excluir">&#10005;</button>
                )}
              </div>
            </div>
          ))}

          {isDiretor && (
            <div style={{ ...styles.subtaskRow, gap: 8 }}>
              <input
                type="text"
                placeholder="Nova subtarefa..."
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { onAddSubtask(newSub); setNewSub(''); }
                }}
                style={{ ...styles.input, flex: 1, padding: '6px 10px', fontSize: 12 }}
              />
              <button
                style={{ ...styles.btn('primary'), ...styles.btnSm }}
                onClick={() => { onAddSubtask(newSub); setNewSub(''); }}
              >
                +
              </button>
            </div>
          )}

          {(!task.subtasks || task.subtasks.length === 0) && !isDiretor && (
            <div style={{ ...styles.subtaskRow, color: C.text3, fontSize: 12 }}>Nenhuma subtarefa.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Milestone Modal ─────────────────────────────────────────
function MilestoneModal({ data, saving, onSave, onClose }) {
  const [form, setForm] = useState({
    id: data?.id || null,
    name: data?.name || '',
    description: data?.description || '',
    deadline: data?.deadline ? data.deadline.slice(0, 10) : '',
    phase: data?.phase || 'planejamento',
    budget_planned: data?.budget_planned ?? '',
    budget_spent: data?.budget_spent ?? '',
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      budget_planned: form.budget_planned !== '' ? Number(form.budget_planned) : null,
      budget_spent: form.budget_spent !== '' ? Number(form.budget_spent) : null,
    });
  };

  return (
    <Modal title={data ? 'Editar Marco' : 'Novo Marco'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Nome *">
          <input style={styles.input} value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </Field>
        <Field label="Descricao">
          <textarea style={styles.textarea} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Prazo">
            <input type="date" style={styles.input} value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
          </Field>
          <Field label="Fase">
            <select style={styles.select} value={form.phase} onChange={(e) => set('phase', e.target.value)}>
              {Object.entries(PHASE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Orcamento Planejado (R$)">
            <input type="number" step="0.01" min="0" style={styles.input} value={form.budget_planned} onChange={(e) => set('budget_planned', e.target.value)} />
          </Field>
          {data && (
            <Field label="Orcamento Gasto (R$)">
              <input type="number" step="0.01" min="0" style={styles.input} value={form.budget_spent} onChange={(e) => set('budget_spent', e.target.value)} />
            </Field>
          )}
        </div>
        <div style={styles.modalActions}>
          <button type="button" style={styles.btn('ghost')} onClick={onClose}>Cancelar</button>
          <button type="submit" style={styles.btn('primary')} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ── Task Modal ──────────────────────────────────────────────
function TaskModal({ data, milestoneId, saving, onSave, onClose }) {
  const [form, setForm] = useState({
    id: data?.id || null,
    name: data?.name || '',
    responsible: data?.responsible || '',
    area: data?.area || '',
    start_date: data?.start_date ? data.start_date.slice(0, 10) : '',
    deadline: data?.deadline ? data.deadline.slice(0, 10) : '',
    description: data?.description || '',
    status: data?.status || 'pendente',
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form, milestoneId);
  };

  return (
    <Modal title={data ? 'Editar Tarefa' : 'Nova Tarefa'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Nome *">
          <input style={styles.input} value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Responsavel">
            <input style={styles.input} value={form.responsible} onChange={(e) => set('responsible', e.target.value)} />
          </Field>
          <Field label="Area">
            <input style={styles.input} value={form.area} onChange={(e) => set('area', e.target.value)} />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Data Inicio">
            <input type="date" style={styles.input} value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
          </Field>
          <Field label="Prazo">
            <input type="date" style={styles.input} value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
          </Field>
        </div>
        {data && (
          <Field label="Status">
            <select style={styles.select} value={form.status} onChange={(e) => set('status', e.target.value)}>
              {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
        )}
        <Field label="Descricao">
          <textarea style={styles.textarea} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div style={styles.modalActions}>
          <button type="button" style={styles.btn('ghost')} onClick={onClose}>Cancelar</button>
          <button type="submit" style={styles.btn('primary')} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
    </Modal>
  );
}
