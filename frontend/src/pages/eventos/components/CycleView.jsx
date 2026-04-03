import { useState, useEffect } from 'react';
import { cycles as api, users as usersApi } from '../../../api';

const C = { dark: 'var(--cbrio-text)', t2: 'var(--cbrio-text2)', t3: 'var(--cbrio-text3)', border: 'var(--cbrio-border)', accent: '#00B39D' };

const TASK_STATUS = {
  a_fazer:       { label: 'A fazer',       color: 'var(--cbrio-text3)' },
  em_andamento:  { label: 'Em andamento',  color: '#3b82f6' },
  bloqueada:     { label: 'Bloqueada',     color: '#ef4444' },
  concluida:     { label: 'Concluída',     color: '#10b981' },
};

const CAT_COLORS = {
  marketing:   { label: 'Marketing',   color: '#00B39D', bg: '#d1fae5' },
  compras:     { label: 'Compras',     color: '#3b82f6', bg: '#dbeafe' },
  financeiro:  { label: 'Financeiro',  color: '#10b981', bg: '#d1fae5' },
  manutencao:  { label: 'Manutenção',  color: '#f59e0b', bg: '#fef3c7' },
  limpeza:     { label: 'Limpeza',     color: '#8b5cf6', bg: '#ede9fe' },
  cozinha:     { label: 'Cozinha',     color: '#ec4899', bg: '#fce7f3' },
  outros:      { label: 'Outros',      color: 'var(--cbrio-text3)', bg: 'var(--cbrio-bg)' },
};

function normDate(d) { return d ? (typeof d === 'string' ? d.slice(0, 10) : '') : ''; }
function fmtDate(d) { const s = normDate(d); if (!s) return ''; const [y, m, day] = s.split('-'); return `${day}/${m}/${y}`; }
function getCategory(task) {
  if (task.area === 'marketing') return 'marketing';
  const m = (task.observacoes || '').match(/Área:\s*(\w+)/i);
  return m ? m[1] : 'outros';
}

export default function CycleView({ eventId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [activePhase, setActivePhase] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);

  const load = async () => {
    try {
      const res = await api.get(eventId);
      setData(res);
      if (res?.phases?.length > 0 && !activePhase) {
        const first = res.phases.find(p => p.status !== 'concluida') || res.phases[0];
        setActivePhase(first.id);
      }
    } catch { setData(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [eventId]);

  const handleActivate = async () => {
    setActivating(true);
    try { await api.activate(eventId); load(); }
    catch (e) { alert(e.message); }
    finally { setActivating(false); }
  };

  const handleTaskStatusChange = async (taskId, status) => {
    await api.updateTask(taskId, { status });
    load();
  };

  const handlePhaseStatusChange = async (phaseId, status) => {
    await api.updatePhase(phaseId, { status });
    load();
  };

  if (loading) return <div style={{ padding: 16, color: C.t2 }}>Carregando ciclo...</div>;

  if (!data?.cycle) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: C.t2, fontSize: 14, marginBottom: 12 }}>Este evento ainda não tem um ciclo criativo ativado.</p>
        <button onClick={handleActivate} disabled={activating} style={{ ...btnStyle, opacity: activating ? 0.6 : 1 }}>
          {activating ? 'Ativando...' : 'Ativar Ciclo Criativo'}
        </button>
      </div>
    );
  }

  const { phases, tasks } = data;
  const phasesDone = phases.filter(p => p.status === 'concluida').length;
  const pctDone = phases.length > 0 ? Math.round((phasesDone / phases.length) * 100) : 0;
  const currentPhase = phases.find(p => p.id === activePhase);
  const phaseTasks = currentPhase ? tasks.filter(t => t.event_phase_id === currentPhase.id) : [];

  const tasksByCategory = {};
  phaseTasks.forEach(t => { const cat = getCategory(t); if (!tasksByCategory[cat]) tasksByCategory[cat] = []; tasksByCategory[cat].push(t); });
  const categories = Object.keys(tasksByCategory).sort((a, b) => {
    const order = ['marketing', 'compras', 'financeiro', 'manutencao', 'limpeza', 'cozinha', 'outros'];
    return order.indexOf(a) - order.indexOf(b);
  });

  return (
    <div>
      {/* Progresso */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.t2, marginBottom: 6 }}>
        <span>Progresso do Ciclo</span>
        <span>{phasesDone}/{phases.length} fases ({pctDone}%)</span>
      </div>
      <div style={{ height: 6, background: 'var(--cbrio-border)', borderRadius: 3, marginBottom: 20 }}>
        <div style={{ height: '100%', width: `${pctDone}%`, background: C.accent, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>

      {/* ── Trilha horizontal (stepper) ── */}
      <div style={{ overflowX: 'auto', marginBottom: 24, paddingBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content' }}>
          {phases.map((phase, i) => {
            const isActive = phase.id === activePhase;
            const isDone = phase.status === 'concluida';
            const pTasks = tasks.filter(t => t.event_phase_id === phase.id);
            const pDone = pTasks.filter(t => t.status === 'concluida').length;
            const stepColor = isDone ? '#10b981' : isActive ? C.accent : 'var(--cbrio-text3)';

            return (
              <div key={phase.id} style={{ display: 'flex', alignItems: 'center' }}>
                {/* Step */}
                <div onClick={() => { setActivePhase(phase.id); setExpandedTask(null); }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', padding: '0 4px', minWidth: 70 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isDone ? '#10b981' : isActive ? C.accent : 'transparent',
                    border: `2.5px solid ${stepColor}`, color: isDone || isActive ? '#fff' : stepColor,
                    fontSize: 11, fontWeight: 700, marginBottom: 6, transition: 'all 0.2s',
                    boxShadow: isActive ? `0 0 0 3px ${C.accent}30` : 'none',
                  }}>
                    {isDone ? '✓' : phase.numero_fase}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? C.accent : isDone ? '#10b981' : C.dark, textAlign: 'center', lineHeight: 1.2, maxWidth: 80 }}>
                    {phase.nome_fase}
                  </div>
                  {pTasks.length > 0 && (
                    <div style={{ fontSize: 9, color: C.t3, marginTop: 2 }}>{pDone}/{pTasks.length}</div>
                  )}
                </div>
                {/* Linha conectora */}
                {i < phases.length - 1 && (
                  <div style={{ height: 2, width: 24, background: isDone ? '#10b981' : 'var(--cbrio-border)', marginTop: -20, flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tarefas da fase selecionada ── */}
      {currentPhase && (
        <div>
          {/* Header da fase */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, padding: '12px 16px', background: 'var(--cbrio-card)', borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.dark }}>
                Fase {currentPhase.numero_fase} — {currentPhase.nome_fase}
              </div>
              <div style={{ fontSize: 12, color: C.t2, marginTop: 4 }}>
                {fmtDate(currentPhase.data_inicio_prevista)} → {fmtDate(currentPhase.data_fim_prevista)}
                {currentPhase.momento_chave && <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 600 }}>★ Momento-chave</span>}
                <span style={{ marginLeft: 8 }}>· {phaseTasks.filter(t => t.status === 'concluida').length}/{phaseTasks.length} tarefas</span>
              </div>
            </div>
            <select value={currentPhase.status} onChange={e => handlePhaseStatusChange(currentPhase.id, e.target.value)}
              style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'var(--cbrio-card)' }}>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluida">Concluída</option>
              <option value="atrasada">Atrasada</option>
              <option value="em_risco">Em risco</option>
            </select>
          </div>

          {/* Tarefas por categoria */}
          {phaseTasks.length === 0 && <div style={{ color: C.t3, fontSize: 13, padding: 24, textAlign: 'center' }}>Nenhuma tarefa nesta fase</div>}

          {categories.map(cat => {
            const catTasks = tasksByCategory[cat];
            const catInfo = CAT_COLORS[cat] || CAT_COLORS.outros;
            const catDone = catTasks.filter(t => t.status === 'concluida').length;

            return (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: catInfo.color }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{catInfo.label}</span>
                  <span style={{ fontSize: 11, color: C.t3 }}>({catDone}/{catTasks.length})</span>
                </div>

                {catTasks.map(task => {
                  const isOpen = expandedTask === task.id;
                  const subs = task.subtasks || [];
                  const subsDone = subs.filter(s => s.done).length;
                  const ts = TASK_STATUS[task.status] || TASK_STATUS.a_fazer;

                  return (
                    <div key={task.id} style={{
                      background: 'var(--cbrio-card)', borderRadius: 8, padding: '10px 14px',
                      border: isOpen ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
                      marginBottom: 4, cursor: 'pointer', transition: 'box-shadow 0.15s',
                    }}
                    onClick={() => setExpandedTask(isOpen ? null : task.id)}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                          <span style={{ color: C.t3, fontSize: 10 }}>{isOpen ? '▼' : '▶'}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: C.dark }}>{task.titulo}</div>
                            <div style={{ fontSize: 11, color: C.t2, marginTop: 1 }}>
                              {task.responsavel_nome || 'Sem responsável'}
                              {task.prazo && ` · ${fmtDate(task.prazo)}`}
                              {subs.length > 0 && ` · ${subsDone}/${subs.length} subtarefas`}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: ts.color, padding: '2px 8px', borderRadius: 10, background: `${ts.color}15` }}>{ts.label}</span>
                          <select value={task.status} onChange={e => handleTaskStatusChange(task.id, e.target.value)}
                            style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, border: `1px solid ${C.border}` }}>
                            {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </div>
                      </div>

                      {isOpen && subs.length > 0 && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
                          <div style={{ height: 4, background: 'var(--cbrio-border)', borderRadius: 2, marginBottom: 8 }}>
                            <div style={{ height: '100%', width: `${subs.length > 0 ? (subsDone / subs.length) * 100 : 0}%`, background: '#10b981', borderRadius: 2, transition: 'width 0.3s' }} />
                          </div>
                          {subs.map(sub => (
                            <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 0', color: C.dark }}>
                              <input type="checkbox" checked={sub.done} onChange={() => { sub.done = !sub.done; setData({ ...data }); }}
                                style={{ cursor: 'pointer', width: 16, height: 16 }} />
                              <span style={sub.done ? { textDecoration: 'line-through', color: C.t3 } : {}}>{sub.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {isOpen && subs.length === 0 && <div style={{ marginTop: 8, fontSize: 11, color: C.t3 }}>Sem subtarefas</div>}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Padding inferior */}
          <div style={{ height: 60 }} />
        </div>
      )}
      {!currentPhase && <div style={{ color: C.t3, fontSize: 13, padding: 20 }}>Selecione uma fase na trilha</div>}
    </div>
  );
}

const btnStyle = {
  padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: '#00B39D', color: '#fff', fontWeight: 600, fontSize: 14,
};
