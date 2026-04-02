import { useState, useEffect } from 'react';
import { cycles as api, users as usersApi } from '../../../api';

const C = { dark: 'var(--cbrio-text)', t2: 'var(--cbrio-text2)', t3: 'var(--cbrio-text3)', border: 'var(--cbrio-border)', accent: '#00B39D', accentBg: '#f3e8ff' };

const PHASE_STATUS = {
  pendente:     { label: 'Pendente',     color: 'var(--cbrio-text3)', bg: 'var(--cbrio-bg)' },
  em_andamento: { label: 'Em andamento', color: '#3b82f6', bg: '#eff6ff' },
  concluida:    { label: 'Concluída',    color: '#10b981', bg: '#ecfdf5' },
  atrasada:     { label: 'Atrasada',     color: '#ef4444', bg: '#fef2f2' },
  em_risco:     { label: 'Em risco',     color: '#f59e0b', bg: '#fffbeb' },
};

const TASK_STATUS = {
  a_fazer:       { label: 'A fazer',       color: 'var(--cbrio-text3)' },
  em_andamento:  { label: 'Em andamento',  color: '#3b82f6' },
  bloqueada:     { label: 'Bloqueada',     color: '#ef4444' },
  concluida:     { label: 'Concluída',     color: '#10b981' },
};

const ADM_STATUS = {
  pendente:       { label: 'Pendente',       color: 'var(--cbrio-text3)' },
  em_andamento:   { label: 'Em andamento',   color: '#3b82f6' },
  concluido:      { label: 'Concluído',      color: '#10b981' },
  nao_aplicavel:  { label: 'N/A',            color: 'var(--cbrio-text2)' },
};

function Badge({ text, color, bg }) {
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, color, background: bg || `${color}15` }}>{text}</span>;
}

function normDate(d) { return d ? (typeof d === 'string' ? d.slice(0, 10) : '') : ''; }
function fmtDate(d) { const s = normDate(d); if (!s) return ''; const [y, m, day] = s.split('-'); return `${day}/${m}/${y}`; }

function DelayBadge({ prazo, status, fimFase }) {
  if (status === 'concluida') return null;
  const p = normDate(prazo);
  const fim = normDate(fimFase);
  if (!p) return null;
  const today = new Date().toISOString().slice(0, 10);
  const diasAtraso = Math.ceil((new Date(today) - new Date(p)) / 86400000);
  const diasAlemFase = fim ? Math.ceil((new Date(p) - new Date(fim)) / 86400000) : 0;
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
      {diasAtraso > 0 && (
        <span style={{ fontSize: 10, fontWeight: 600, color: '#ef4444', padding: '1px 6px', borderRadius: 4, background: '#fef2f2' }}>
          {diasAtraso}d atrasado
        </span>
      )}
      {diasAlemFase > 0 && (
        <span style={{ fontSize: 10, fontWeight: 600, color: '#f59e0b', padding: '1px 6px', borderRadius: 4, background: '#fffbeb' }}>
          {diasAlemFase}d além da fase
        </span>
      )}
    </div>
  );
}

// ── Modal de detalhe da fase ────────────────────────────────
function PhaseDetailModal({ phase, tasks, onClose, onCreateTask, onTaskStatusChange }) {
  const phaseTasks = tasks.filter(t => t.event_phase_id === phase.id);
  const done = phaseTasks.filter(t => t.status === 'concluida').length;
  const pending = phaseTasks.length - done;
  const st = PHASE_STATUS[phase.status] || PHASE_STATUS.pendente;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent }}>Fase {phase.numero_fase}</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.dark, margin: '4px 0' }}>{phase.nome_fase}</h2>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Badge text={st.label} color={st.color} bg={st.bg} />
              {phase.momento_chave && <Badge text="Momento-chave" color="#f59e0b" bg="#fffbeb" />}
              <Badge text={phase.area} color={phase.area === 'marketing' ? '#00B39D' : '#3b82f6'} />
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.t2 }}>×</button>
        </div>

        {/* Info */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ background: 'var(--cbrio-table-header)', borderRadius: 8, padding: '10px 14px', flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: C.t2, fontWeight: 600 }}>Período</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginTop: 2 }}>
              {fmtDate(phase.data_inicio_prevista)} → {fmtDate(phase.data_fim_prevista)}
            </div>
          </div>
          <div style={{ background: '#ecfdf5', borderRadius: 8, padding: '10px 14px', flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>Concluídas</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>{done}</div>
          </div>
          <div style={{ background: 'var(--cbrio-bg)', borderRadius: 8, padding: '10px 14px', flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: C.t2, fontWeight: 600 }}>Pendentes</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.t2 }}>{pending}</div>
          </div>
        </div>

        {/* Progress */}
        {phaseTasks.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ height: 6, background: 'var(--cbrio-border)', borderRadius: 3 }}>
              <div style={{ height: '100%', width: `${phaseTasks.length > 0 ? Math.round((done / phaseTasks.length) * 100) : 0}%`, background: '#10b981', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* Botão criar tarefa */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Tarefas ({phaseTasks.length})</span>
          <button onClick={() => onCreateTask(phase)} style={btnPrimary}>+ Nova Tarefa</button>
        </div>

        {/* Lista de tarefas */}
        {phaseTasks.length === 0 && <div style={{ color: C.t3, fontSize: 12, padding: 12, textAlign: 'center' }}>Nenhuma tarefa nesta fase</div>}
        {phaseTasks.map(task => {
          const ts = TASK_STATUS[task.status] || TASK_STATUS.a_fazer;
          return (
            <div key={task.id} style={{ background: 'var(--cbrio-card)', borderRadius: 8, padding: 10, border: `1px solid ${C.border}`, marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.dark }}>{task.titulo}</div>
                  <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>
                    {task.responsavel_nome || 'Sem responsável'}
                    {task.prazo && ` · Prazo: ${fmtDate(task.prazo)}`}
                  </div>
                  <DelayBadge prazo={task.prazo} status={task.status} fimFase={phase.data_fim_prevista} />
                </div>
                <select value={task.status} onChange={e => onTaskStatusChange(task.id, e.target.value)}
                  style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, border: `1px solid ${C.border}`, color: ts.color }}>
                  {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Modal de criar tarefa ───────────────────────────────────
function CreateTaskModal({ phase, eventId, usersList, onSave, onClose }) {
  const [f, setF] = useState({ titulo: '', prazo_inicio: '', prazo: '', responsavel_id: '', area: phase.area === 'ambos' ? 'marketing' : phase.area });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const maxDate = normDate(phase.data_fim_prevista);
  const minDate = normDate(phase.data_inicio_prevista);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!f.titulo) { setError('Nome é obrigatório'); return; }
    setSaving(true);
    setError('');
    try {
      const selectedUser = usersList.find(u => u.id === f.responsavel_id);
      await onSave({
        event_phase_id: phase.id,
        event_id: eventId,
        titulo: f.titulo,
        prazo: f.prazo || null,
        area: f.area,
        responsavel_id: f.responsavel_id || null,
        responsavel_nome: selectedUser?.name || null,
        prioridade: 'normal',
        status: 'a_fazer',
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.dark, margin: 0 }}>
            Nova Tarefa — Fase {phase.numero_fase}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.t2 }}>×</button>
        </div>

        {error && <div style={errBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Nome da tarefa *</label>
            <input value={f.titulo} onChange={e => setF(p => ({ ...p, titulo: e.target.value }))} style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, marginBottom: 12 }}>
              <label style={labelStyle}>Prazo início</label>
              <input type="date" value={f.prazo_inicio}
                onChange={e => setF(p => ({ ...p, prazo_inicio: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ flex: 1, marginBottom: 12 }}>
              <label style={labelStyle}>Prazo fim</label>
              <input type="date" value={f.prazo}
                onChange={e => setF(p => ({ ...p, prazo: e.target.value }))} style={inputStyle} />
              {f.prazo && maxDate && f.prazo > maxDate && (
                <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, marginTop: 2 }}>
                  Atenção: {Math.ceil((new Date(f.prazo) - new Date(maxDate)) / 86400000)}d além do fim da fase ({fmtDate(maxDate)})
                </div>
              )}
              <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>Fim da fase: {fmtDate(maxDate)}</div>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Responsável</label>
            <select value={f.responsavel_id} onChange={e => setF(p => ({ ...p, responsavel_id: e.target.value }))} style={inputStyle}>
              <option value="">Selecionar...</option>
              {usersList.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Área</label>
            <select value={f.area} onChange={e => setF(p => ({ ...p, area: e.target.value }))} style={inputStyle}>
              <option value="marketing">Marketing</option>
              <option value="adm">Administrativo</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" onClick={onClose} style={btnCancel}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Salvando...' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────
export default function CycleView({ eventId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [tab, setTab] = useState('Fases Marketing');
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [createTaskForPhase, setCreateTaskForPhase] = useState(null);
  const [usersList, setUsersList] = useState([]);

  const load = async () => {
    try {
      const [res, usrs] = await Promise.all([api.get(eventId), usersApi.list()]);
      setData(res);
      setUsersList(usrs);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [eventId]);

  const handleActivate = async () => {
    setActivating(true);
    try { await api.activate(eventId); load(); }
    catch (e) { alert(e.message); }
    finally { setActivating(false); }
  };

  const handlePhaseStatusChange = async (phaseId, status) => {
    await api.updatePhase(phaseId, { status });
    load();
  };

  const handleTaskStatusChange = async (taskId, status) => {
    await api.updateTask(taskId, { status });
    load();
  };

  const handleAdmStatusChange = async (itemId, status) => {
    await api.updateAdmItem(itemId, { status });
    load();
  };

  const handleCreateTask = async (taskData) => {
    await api.createTask(taskData);
    setCreateTaskForPhase(null);
    load();
  };

  if (loading) return <div style={{ padding: 16, color: C.t2 }}>Carregando ciclo...</div>;

  if (!data?.cycle) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: C.t2, fontSize: 14, marginBottom: 12 }}>Este evento ainda não tem um ciclo criativo ativado.</p>
        <button onClick={handleActivate} disabled={activating} style={{ ...btnPrimary, opacity: activating ? 0.6 : 1 }}>
          {activating ? 'Ativando...' : 'Ativar Ciclo Criativo'}
        </button>
      </div>
    );
  }

  const { phases, tasks, admTrack } = data;
  const phasesDone = phases.filter(p => p.status === 'concluida').length;
  const pctDone = phases.length > 0 ? Math.round((phasesDone / phases.length) * 100) : 0;

  return (
    <div>
      {/* Progress bar */}
      <div style={{ background: 'var(--cbrio-card)', borderRadius: 10, padding: 14, border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.t2, marginBottom: 6 }}>
          <span>Progresso do Ciclo</span>
          <span>{phasesDone}/{phases.length} fases ({pctDone}%)</span>
        </div>
        <div style={{ height: 8, background: 'var(--cbrio-border)', borderRadius: 4 }}>
          <div style={{ height: '100%', width: `${pctDone}%`, background: '#00B39D', borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: 12 }}>
        {['Fases Marketing', 'Tarefas', 'Fases Administração'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: tab === t ? C.accent : C.t3,
            borderBottom: tab === t ? `2px solid ${C.accent}` : '2px solid transparent',
          }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab: Fases Marketing (clicáveis) */}
      {tab === 'Fases Marketing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {phases.map(phase => {
            const st = PHASE_STATUS[phase.status] || PHASE_STATUS.pendente;
            const phaseTasks = tasks.filter(t => t.event_phase_id === phase.id);
            const tasksDone = phaseTasks.filter(t => t.status === 'concluida').length;
            return (
              <div key={phase.id} onClick={() => setSelectedPhase(phase)} style={{
                background: 'var(--cbrio-card)', borderRadius: 10, padding: 12, border: `1px solid ${C.border}`, cursor: 'pointer',
                borderLeft: phase.momento_chave ? '4px solid #f59e0b' : `4px solid ${st.color}`,
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.accent }}>Fase {phase.numero_fase}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.dark, marginLeft: 8 }}>{phase.nome_fase}</span>
                    {phase.momento_chave && <span style={{ marginLeft: 6 }}><Badge text="Momento-chave" color="#f59e0b" /></span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    {phaseTasks.length > 0 && (
                      <span style={{ fontSize: 10, color: C.t2, fontWeight: 600 }}>{tasksDone}/{phaseTasks.length} tarefas</span>
                    )}
                    <span style={{ fontSize: 10, color: C.t3 }}>{fmtDate(phase.data_inicio_prevista)} → {fmtDate(phase.data_fim_prevista)}</span>
                    <Badge text={st.label} color={st.color} bg={st.bg} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>Área: {phase.area}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Tarefas (Kanban) */}
      {tab === 'Tarefas' && (
        <div className="kanban-grid">
          {Object.entries(TASK_STATUS).map(([status, meta]) => {
            const colTasks = tasks.filter(t => t.status === status);
            return (
              <div key={status} style={{ background: 'var(--cbrio-table-header)', borderRadius: 10, padding: 10 }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { const tid = e.dataTransfer.getData('cycleTaskId'); if (tid) handleTaskStatusChange(tid, status); }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: meta.color, marginBottom: 8 }}>
                  {meta.label} ({colTasks.length})
                </div>
                {colTasks.map(task => (
                  <div key={task.id} draggable onDragStart={e => e.dataTransfer.setData('cycleTaskId', task.id)}
                    style={{ background: 'var(--cbrio-card)', borderRadius: 8, padding: 10, marginBottom: 6, border: `1px solid ${C.border}`, cursor: 'grab' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.dark }}>{task.titulo}</div>
                    <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>
                      {task.responsavel_nome || 'Sem responsável'}
                      {task.prazo && ` · ${fmtDate(task.prazo)}`}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <Badge text={task.area === 'marketing' ? 'MKT' : 'ADM'} color={task.area === 'marketing' ? '#00B39D' : '#f59e0b'} />
                      <Badge text={task.prioridade} color={task.prioridade === 'alta' ? '#ef4444' : task.prioridade === 'normal' ? '#3b82f6' : 'var(--cbrio-text3)'} />
                    </div>
                    <DelayBadge prazo={task.prazo} status={task.status} fimFase={phases.find(p => p.id === task.event_phase_id)?.data_fim_prevista} />
                  </div>
                ))}
                {colTasks.length === 0 && <div style={{ fontSize: 11, color: C.t3, padding: 8 }}>Nenhuma tarefa</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Fases Administração */}
      {tab === 'Fases Administração' && (
        <div>
          {[-5, -4, -3, -2, -1, 0].map(semana => {
            const items = admTrack.filter(a => a.semana === semana);
            if (items.length === 0) return null;
            return (
              <div key={semana} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 6 }}>
                  {semana === 0 ? 'Dia D' : `Semana ${semana}`}
                  <span style={{ fontSize: 11, fontWeight: 400, color: C.t3, marginLeft: 8 }}>
                    {items[0]?.data_prevista && fmtDate(items[0].data_prevista)}
                  </span>
                </div>
                {items.map(item => {
                  const st = ADM_STATUS[item.status] || ADM_STATUS.pendente;
                  return (
                    <div key={item.id} style={{ background: 'var(--cbrio-card)', borderRadius: 8, padding: 10, border: `1px solid ${C.border}`, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{item.titulo}</div>
                        <div style={{ fontSize: 11, color: C.t2 }}>{item.area} · {item.entrega_esperada}</div>
                      </div>
                      <select value={item.status} onChange={e => handleAdmStatusChange(item.id, e.target.value)}
                        style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, border: `1px solid ${C.border}`, color: st.color }}
                        onClick={e => e.stopPropagation()}>
                        {Object.entries(ADM_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Detalhe da fase */}
      {selectedPhase && (
        <PhaseDetailModal
          phase={selectedPhase}
          tasks={tasks}
          onClose={() => setSelectedPhase(null)}
          onCreateTask={(phase) => { setSelectedPhase(null); setCreateTaskForPhase(phase); }}
          onTaskStatusChange={(taskId, status) => { handleTaskStatusChange(taskId, status); }}
        />
      )}

      {/* Modal: Criar tarefa */}
      {createTaskForPhase && (
        <CreateTaskModal
          phase={createTaskForPhase}
          eventId={eventId}
          usersList={usersList}
          onSave={handleCreateTask}
          onClose={() => setCreateTaskForPhase(null)}
        />
      )}
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 };
const modal = { background: 'var(--cbrio-card)', borderRadius: 12, padding: '24px 28px', width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' };
const labelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--cbrio-text2)', display: 'block', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--cbrio-border)', fontSize: 13, color: 'var(--cbrio-text)', outline: 'none' };
const errBox = { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12 };
const btnPrimary = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#00B39D', color: '#fff', fontWeight: 600, fontSize: 12 };
const btnCancel = { padding: '8px 16px', borderRadius: 8, border: '1px solid var(--cbrio-border)', background: 'var(--cbrio-card)', color: 'var(--cbrio-text2)', cursor: 'pointer', fontWeight: 600, fontSize: 12 };
