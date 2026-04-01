import { useState, useEffect } from 'react';
import { cycles as api } from '../../../api';

const C = { dark: '#1a1a2e', t2: '#6b7280', t3: '#9ca3af', border: '#e5e7eb', accent: '#7c3aed', accentBg: '#f3e8ff' };

const PHASE_STATUS = {
  pendente:     { label: 'Pendente',     color: '#9ca3af', bg: '#f3f4f6' },
  em_andamento: { label: 'Em andamento', color: '#3b82f6', bg: '#eff6ff' },
  concluida:    { label: 'Concluída',    color: '#10b981', bg: '#ecfdf5' },
  atrasada:     { label: 'Atrasada',     color: '#ef4444', bg: '#fef2f2' },
  em_risco:     { label: 'Em risco',     color: '#f59e0b', bg: '#fffbeb' },
};

const TASK_STATUS = {
  a_fazer:       { label: 'A fazer',       color: '#9ca3af' },
  em_andamento:  { label: 'Em andamento',  color: '#3b82f6' },
  bloqueada:     { label: 'Bloqueada',     color: '#ef4444' },
  concluida:     { label: 'Concluída',     color: '#10b981' },
};

const ADM_STATUS = {
  pendente:       { label: 'Pendente',       color: '#9ca3af' },
  em_andamento:   { label: 'Em andamento',   color: '#3b82f6' },
  concluido:      { label: 'Concluído',      color: '#10b981' },
  nao_aplicavel:  { label: 'N/A',            color: '#6b7280' },
};

function Badge({ text, color, bg }) {
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, color, background: bg || `${color}15` }}>{text}</span>;
}

function normDate(d) { return d ? (typeof d === 'string' ? d.slice(0, 10) : '') : ''; }
function fmtDate(d) { const s = normDate(d); if (!s) return ''; const [y,m,day] = s.split('-'); return `${day}/${m}/${y}`; }

export default function CycleView({ eventId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [tab, setTab] = useState('fases');

  const load = async () => {
    try {
      const res = await api.get(eventId);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [eventId]);

  const handleActivate = async () => {
    setActivating(true);
    try {
      await api.activate(eventId);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setActivating(false);
    }
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

  const { phases, tasks, admTrack, budget } = data;
  const phasesDone = phases.filter(p => p.status === 'concluida').length;
  const pctDone = phases.length > 0 ? Math.round((phasesDone / phases.length) * 100) : 0;

  return (
    <div>
      {/* Progress bar */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.t2, marginBottom: 6 }}>
          <span>Progresso do Ciclo</span>
          <span>{phasesDone}/{phases.length} fases ({pctDone}%)</span>
        </div>
        <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4 }}>
          <div style={{ height: '100%', width: `${pctDone}%`, background: '#7c3aed', borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: 12 }}>
        {['fases', 'tarefas', 'trilha ADM'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: tab === t ? C.accent : C.t3,
            borderBottom: tab === t ? `2px solid ${C.accent}` : '2px solid transparent',
          }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab: Fases */}
      {tab === 'fases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {phases.map(phase => {
            const st = PHASE_STATUS[phase.status] || PHASE_STATUS.pendente;
            return (
              <div key={phase.id} style={{ background: '#fff', borderRadius: 10, padding: 12, border: `1px solid ${C.border}`,
                borderLeft: phase.momento_chave ? '4px solid #f59e0b' : `4px solid ${st.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.accent }}>Fase {phase.numero_fase}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.dark, marginLeft: 8 }}>{phase.nome_fase}</span>
                    {phase.momento_chave && <Badge text="Momento-chave" color="#f59e0b" />}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: C.t3 }}>{fmtDate(phase.data_inicio_prevista)} → {fmtDate(phase.data_fim_prevista)}</span>
                    <select value={phase.status} onChange={e => handlePhaseStatusChange(phase.id, e.target.value)}
                      style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, border: `1px solid ${C.border}`, color: st.color }}>
                      {Object.entries(PHASE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>Área: {phase.area}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Tarefas (Kanban) */}
      {tab === 'tarefas' && (
        <div className="kanban-grid">
          {Object.entries(TASK_STATUS).map(([status, meta]) => {
            const colTasks = tasks.filter(t => t.status === status);
            return (
              <div key={status} style={{ background: '#f9fafb', borderRadius: 10, padding: 10 }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { const tid = e.dataTransfer.getData('cycleTaskId'); if (tid) handleTaskStatusChange(tid, status); }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: meta.color, marginBottom: 8 }}>
                  {meta.label} ({colTasks.length})
                </div>
                {colTasks.map(task => (
                  <div key={task.id} draggable onDragStart={e => e.dataTransfer.setData('cycleTaskId', task.id)}
                    style={{ background: '#fff', borderRadius: 8, padding: 10, marginBottom: 6, border: `1px solid ${C.border}`, cursor: 'grab' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.dark }}>{task.titulo}</div>
                    <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>
                      {task.responsavel_nome || 'Sem responsável'}
                      {task.prazo && ` · ${fmtDate(task.prazo)}`}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <Badge text={task.area === 'marketing' ? 'MKT' : 'ADM'} color={task.area === 'marketing' ? '#7c3aed' : '#f59e0b'} />
                      <Badge text={task.prioridade} color={task.prioridade === 'alta' ? '#ef4444' : task.prioridade === 'normal' ? '#3b82f6' : '#9ca3af'} />
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && <div style={{ fontSize: 11, color: C.t3, padding: 8 }}>Nenhuma tarefa</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Trilha ADM */}
      {tab === 'trilha ADM' && (
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
                    <div key={item.id} style={{ background: '#fff', borderRadius: 8, padding: 10, border: `1px solid ${C.border}`, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{item.titulo}</div>
                        <div style={{ fontSize: 11, color: C.t2 }}>{item.area} · {item.entrega_esperada}</div>
                      </div>
                      <select value={item.status} onChange={e => handleAdmStatusChange(item.id, e.target.value)}
                        style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, border: `1px solid ${C.border}`, color: st.color }}>
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
    </div>
  );
}

const btnPrimary = {
  padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: '#7c3aed', color: '#fff', fontWeight: 600, fontSize: 14,
};
