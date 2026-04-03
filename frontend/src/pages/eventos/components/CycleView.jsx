import { useState, useEffect } from 'react';
import { cycles as api } from '../../../api';

const C = { dark: 'var(--cbrio-text)', t2: 'var(--cbrio-text2)', t3: 'var(--cbrio-text3)', border: 'var(--cbrio-border)', accent: '#00B39D' };

const TASK_STATUS = {
  a_fazer:       { label: 'A fazer',       color: 'var(--cbrio-text3)' },
  em_andamento:  { label: 'Em andamento',  color: '#3b82f6' },
  bloqueada:     { label: 'Bloqueada',     color: '#ef4444' },
  concluida:     { label: 'Concluída',     color: '#10b981' },
};

const CAT = {
  marketing:   { label: 'Marketing',   color: '#00B39D', bg: '#d1fae5', border: '#5dcaa5' },
  compras:     { label: 'Compras',     color: '#3b82f6', bg: '#dbeafe', border: '#85b7eb' },
  financeiro:  { label: 'Financeiro',  color: '#10b981', bg: '#d1fae5', border: '#5dcaa5' },
  manutencao:  { label: 'Manutenção',  color: '#f59e0b', bg: '#fef3c7', border: '#ef9f27' },
  limpeza:     { label: 'Limpeza',     color: '#8b5cf6', bg: '#ede9fe', border: '#afa9ec' },
  cozinha:     { label: 'Cozinha',     color: '#ec4899', bg: '#fce7f3', border: '#f0997b' },
  outros:      { label: 'Outros',      color: 'var(--cbrio-text3)', bg: 'var(--cbrio-bg)', border: 'var(--cbrio-border)' },
};

function normDate(d) { return d ? (typeof d === 'string' ? d.slice(0, 10) : '') : ''; }
function fmtDate(d) { const s = normDate(d); if (!s) return ''; const [y, m, day] = s.split('-'); return `${day}/${m}`; }
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
  const [areaFilter, setAreaFilter] = useState('all');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' ou 'lista'
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

  const handleTaskStatus = async (taskId, status) => {
    await api.updateTask(taskId, { status });
    load();
  };

  const handlePhaseStatus = async (phaseId, status) => {
    await api.updatePhase(phaseId, { status });
    load();
  };

  if (loading) return <div style={{ padding: 16, color: C.t2 }}>Carregando ciclo...</div>;
  if (!data?.cycle) return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <p style={{ color: C.t2, fontSize: 14, marginBottom: 12 }}>Este evento ainda não tem um ciclo criativo ativado.</p>
      <button onClick={handleActivate} disabled={activating} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', background: C.accent, color: '#fff', fontWeight: 600, fontSize: 14, opacity: activating ? 0.6 : 1 }}>
        {activating ? 'Ativando...' : 'Ativar Ciclo Criativo'}
      </button>
    </div>
  );

  const { phases, tasks } = data;
  const phasesDone = phases.filter(p => p.status === 'concluida').length;
  const pctDone = phases.length > 0 ? Math.round((phasesDone / phases.length) * 100) : 0;
  const currentPhase = phases.find(p => p.id === activePhase);

  // Filtrar tarefas da fase + área
  let phaseTasks = currentPhase ? tasks.filter(t => t.event_phase_id === currentPhase.id) : [];
  if (areaFilter !== 'all') {
    phaseTasks = phaseTasks.filter(t => getCategory(t) === areaFilter);
  }

  return (
    <div>
      {/* Progresso */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.t2, marginBottom: 6 }}>
        <span>Progresso do Ciclo</span>
        <span>{phasesDone}/{phases.length} fases ({pctDone}%)</span>
      </div>
      <div style={{ height: 6, background: 'var(--cbrio-border)', borderRadius: 3, marginBottom: 16 }}>
        <div style={{ height: '100%', width: `${pctDone}%`, background: C.accent, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>

      {/* ── Filtro de área ── */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: C.t2, marginRight: 4 }}>Área:</span>
        {[{ key: 'all', label: 'Todas' }, ...Object.entries(CAT).filter(([k]) => k !== 'outros').map(([k, v]) => ({ key: k, label: v.label, color: v.color, bg: v.bg }))].map(f => (
          <button key={f.key} onClick={() => setAreaFilter(f.key)} style={{
            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: areaFilter === f.key ? 600 : 400, cursor: 'pointer',
            border: areaFilter === f.key ? `2px solid ${f.color || C.accent}` : `1px solid ${C.border}`,
            background: areaFilter === f.key ? (f.bg || `${C.accent}15`) : 'transparent',
            color: areaFilter === f.key ? (f.color || C.accent) : C.t3,
          }}>{f.label}</button>
        ))}
      </div>

      {/* ── Faixa de fases (nível 1) ── */}
      <div style={{ overflowX: 'auto', marginBottom: 16, paddingBottom: 6 }}>
        <div style={{ display: 'flex', gap: 5, minWidth: 'max-content' }}>
          {phases.map((phase, i) => {
            const isActive = phase.id === activePhase;
            const pTasks = tasks.filter(t => t.event_phase_id === phase.id);
            const pDone = pTasks.filter(t => t.status === 'concluida').length;
            const pBlocked = pTasks.filter(t => t.status === 'bloqueada').length;
            const isDone = pTasks.length > 0 && pDone === pTasks.length;
            const pPct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;
            const progColor = isDone ? '#10b981' : pPct > 0 ? C.accent : 'var(--cbrio-border)';

            return (
              <div key={phase.id} style={{ display: 'flex', alignItems: 'center' }}>
                <div onClick={() => { setActivePhase(phase.id); setExpandedTask(null); }} style={{
                  borderRadius: 8, padding: '8px 10px', cursor: 'pointer', minWidth: 100, maxWidth: 120,
                  border: isActive ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
                  background: isActive ? `${C.accent}10` : isDone ? 'var(--cbrio-bg)' : 'var(--cbrio-card)',
                  opacity: isDone && !isActive ? 0.7 : 1, transition: 'all .15s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.t3, marginBottom: 3 }}>
                    <span>F{phase.numero_fase}</span>
                    {pBlocked > 0 && <span style={{ color: '#ef4444' }}>{pBlocked} bloq</span>}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? C.accent : C.dark, lineHeight: 1.3, marginBottom: 4 }}>
                    {phase.nome_fase}
                  </div>
                  {phase.momento_chave && <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 99, background: '#fef3c7', color: '#854f0b', fontWeight: 500 }}>chave</span>}
                  <div style={{ height: 3, borderRadius: 2, background: 'var(--cbrio-border)', marginTop: 4 }}>
                    <div style={{ height: 3, borderRadius: 2, width: `${pPct}%`, background: progColor, transition: 'width .3s' }} />
                  </div>
                  <div style={{ fontSize: 9, color: C.t3, marginTop: 3 }}>{pTasks.length > 0 ? `${pDone}/${pTasks.length}` : 'vazia'}</div>
                </div>
                {i < phases.length - 1 && <div style={{ width: 12, height: 2, background: isDone ? '#10b981' : 'var(--cbrio-border)', flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Header fase + toggle vista ── */}
      {currentPhase && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>
              Fase {currentPhase.numero_fase} — {currentPhase.nome_fase}
              {currentPhase.momento_chave && <span style={{ marginLeft: 8, color: '#f59e0b', fontSize: 12 }}>★ Momento-chave</span>}
            </div>
            <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>
              {phaseTasks.filter(t => t.status === 'concluida').length}/{phaseTasks.length} tarefas
              {phaseTasks.filter(t => t.status === 'bloqueada').length > 0 && <span style={{ color: '#ef4444' }}> · {phaseTasks.filter(t => t.status === 'bloqueada').length} bloqueadas</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ display: 'flex', borderRadius: 6, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <button onClick={() => setViewMode('kanban')} style={{ padding: '4px 10px', fontSize: 11, border: 'none', cursor: 'pointer', fontWeight: 600, background: viewMode === 'kanban' ? C.accent : 'transparent', color: viewMode === 'kanban' ? '#fff' : C.t3 }}>Kanban</button>
              <button onClick={() => setViewMode('lista')} style={{ padding: '4px 10px', fontSize: 11, border: 'none', cursor: 'pointer', fontWeight: 600, background: viewMode === 'lista' ? C.accent : 'transparent', color: viewMode === 'lista' ? '#fff' : C.t3 }}>Lista</button>
            </div>
            <select value={currentPhase.status} onChange={e => handlePhaseStatus(currentPhase.id, e.target.value)}
              style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}` }}>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluida">Concluída</option>
              <option value="atrasada">Atrasada</option>
              <option value="em_risco">Em risco</option>
            </select>
          </div>
        </div>
      )}

      {/* ── MODO KANBAN (4 colunas) ── */}
      {viewMode === 'kanban' && currentPhase && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, minHeight: 200 }}>
          {Object.entries(TASK_STATUS).map(([status, meta]) => {
            const colTasks = phaseTasks.filter(t => t.status === status);
            return (
              <div key={status} style={{ background: 'var(--cbrio-bg)', borderRadius: 10, padding: 8 }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { const id = e.dataTransfer.getData('cycleTaskId'); if (id) handleTaskStatus(id, status); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: meta.color, textTransform: 'uppercase', letterSpacing: 0.4 }}>{meta.label}</span>
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: 'var(--cbrio-card)', border: `1px solid ${C.border}`, color: C.t3 }}>{colTasks.length}</span>
                </div>
                {colTasks.length === 0 && <div style={{ padding: 12, textAlign: 'center', fontSize: 10, color: C.t3, border: '1.5px dashed var(--cbrio-border)', borderRadius: 8 }}>—</div>}
                {colTasks.map(task => {
                  const cat = CAT[getCategory(task)] || CAT.outros;
                  const isLate = task.prazo && new Date(normDate(task.prazo)) < new Date() && task.status !== 'concluida';
                  const subs = task.subtasks || [];
                  const subsDone = subs.filter(s => s.done).length;
                  const isOpen = expandedTask === `kb-${task.id}`;
                  return (
                    <div key={task.id} draggable onDragStart={e => e.dataTransfer.setData('cycleTaskId', task.id)}
                      onClick={() => setExpandedTask(isOpen ? null : `kb-${task.id}`)}
                      style={{ background: 'var(--cbrio-card)', borderRadius: 8, padding: 8, marginBottom: 4, border: isOpen ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`, cursor: 'pointer', transition: 'box-shadow .15s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: cat.bg, color: cat.color, fontWeight: 500 }}>{cat.label}</span>
                        <select value={task.status} onClick={e => e.stopPropagation()} onChange={e => { e.stopPropagation(); handleTaskStatus(task.id, e.target.value); }}
                          style={{ fontSize: 9, padding: '1px 4px', borderRadius: 4, border: `1px solid ${C.border}`, background: 'var(--cbrio-card)' }}>
                          {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: C.dark, lineHeight: 1.3, marginBottom: 3 }}>{task.titulo}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.t3 }}>
                        <span>{task.responsavel_nome || '—'}</span>
                        <span>
                          {task.prazo && <span style={{ color: isLate ? '#ef4444' : 'inherit', fontWeight: isLate ? 600 : 400 }}>{fmtDate(task.prazo)}{isLate ? ' !' : ''}</span>}
                          {subs.length > 0 && ` · ${subsDone}/${subs.length}`}
                        </span>
                      </div>
                      {isOpen && subs.length > 0 && (
                        <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
                          {subs.map(sub => (
                            <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, padding: '2px 0', color: C.dark }}>
                              <input type="checkbox" checked={sub.done} onChange={() => { sub.done = !sub.done; setData({ ...data }); }} style={{ cursor: 'pointer', width: 13, height: 13 }} />
                              <span style={sub.done ? { textDecoration: 'line-through', color: C.t3 } : {}}>{sub.name}</span>
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
      )}

      {/* ── MODO LISTA (por categoria) ── */}
      {viewMode === 'lista' && currentPhase && (() => {
        const byCategory = {};
        phaseTasks.forEach(t => { const c = getCategory(t); if (!byCategory[c]) byCategory[c] = []; byCategory[c].push(t); });
        const cats = Object.keys(byCategory).sort((a, b) => {
          const order = ['marketing', 'compras', 'financeiro', 'manutencao', 'limpeza', 'cozinha', 'outros'];
          return order.indexOf(a) - order.indexOf(b);
        });

        return (
          <div>
            {phaseTasks.length === 0 && <div style={{ color: C.t3, fontSize: 13, padding: 24, textAlign: 'center' }}>Nenhuma tarefa nesta fase</div>}
            {cats.map(cat => {
              const catTasks = byCategory[cat];
              const catInfo = CAT[cat] || CAT.outros;
              const catDone = catTasks.filter(t => t.status === 'concluida').length;
              return (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: catInfo.color }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{catInfo.label}</span>
                    <span style={{ fontSize: 11, color: C.t3 }}>({catDone}/{catTasks.length})</span>
                  </div>
                  {catTasks.map(task => {
                    const isOpen = expandedTask === task.id;
                    const subs = task.subtasks || [];
                    const subsDone = subs.filter(s => s.done).length;
                    const ts = TASK_STATUS[task.status] || TASK_STATUS.a_fazer;
                    return (
                      <div key={task.id} style={{ background: 'var(--cbrio-card)', borderRadius: 8, padding: '8px 12px', border: isOpen ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`, marginBottom: 3, cursor: 'pointer', transition: 'box-shadow .15s' }}
                        onClick={() => setExpandedTask(isOpen ? null : task.id)}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                            <span style={{ color: C.t3, fontSize: 10 }}>{isOpen ? '▼' : '▶'}</span>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 12, color: C.dark }}>{task.titulo}</div>
                              <div style={{ fontSize: 10, color: C.t2, marginTop: 1 }}>
                                {task.responsavel_nome || 'Sem responsável'}{task.prazo && ` · ${fmtDate(task.prazo)}`}{subs.length > 0 && ` · ${subsDone}/${subs.length}`}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            <span style={{ fontSize: 9, fontWeight: 600, color: ts.color, padding: '2px 8px', borderRadius: 10, background: `${ts.color}15` }}>{ts.label}</span>
                            <select value={task.status} onChange={e => handleTaskStatus(task.id, e.target.value)} style={{ fontSize: 10, padding: '2px 4px', borderRadius: 6, border: `1px solid ${C.border}` }}>
                              {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                          </div>
                        </div>
                        {isOpen && subs.length > 0 && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
                            <div style={{ height: 3, background: 'var(--cbrio-border)', borderRadius: 2, marginBottom: 6 }}>
                              <div style={{ height: '100%', width: `${subs.length > 0 ? (subsDone / subs.length) * 100 : 0}%`, background: '#10b981', borderRadius: 2 }} />
                            </div>
                            {subs.map(sub => (
                              <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '3px 0', color: C.dark }}>
                                <input type="checkbox" checked={sub.done} onChange={() => { sub.done = !sub.done; setData({ ...data }); }} style={{ cursor: 'pointer', width: 14, height: 14 }} />
                                <span style={sub.done ? { textDecoration: 'line-through', color: C.t3 } : {}}>{sub.name}</span>
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
        );
      })()}

      <div style={{ height: 60 }} />
    </div>
  );
}
