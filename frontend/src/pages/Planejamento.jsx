import { useState, useEffect } from 'react';
import { dashboard as dashApi, cycles as cyclesApi, tasks as tasksApi } from '../api';

const C = {
  text: 'var(--cbrio-text)', t2: 'var(--cbrio-text2)', t3: 'var(--cbrio-text3)',
  border: 'var(--cbrio-border)', card: 'var(--cbrio-card)', bg: 'var(--cbrio-bg)',
  accent: '#00B39D',
};

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

function normDate(d) { return d ? (typeof d === 'string' ? d.slice(0, 10) : '') : ''; }
function fmtDate(d) { const s = normDate(d); if (!s) return ''; const [y, m, day] = s.split('-'); return `${day}/${m}`; }
function getCat(t) { if (t.area === 'marketing') return 'marketing'; const m = (t.observacoes || '').match(/Área:\s*(\w+)/i); return m ? m[1] : 'outros'; }

export default function Planejamento() {
  const [tab, setTab] = useState(0); // 0=Dashboard, 1=Kanban, 2=Gantt
  const [kpis, setKpis] = useState(null);
  const [workload, setWorkload] = useState([]);
  const [cycleData, setCycleData] = useState(null);
  const [kanbanPhase, setKanbanPhase] = useState(null);
  const [areaFilter, setAreaFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  // Gantt data
  const [ganttTasks, setGanttTasks] = useState([]);

  useEffect(() => {
    Promise.all([
      dashApi.pmo().then(setKpis).catch(() => {}),
      dashApi.workload().then(setWorkload).catch(() => {}),
      cyclesApi.kanbanAll().then(d => {
        setCycleData(d);
        if (d?.phases?.length > 0) {
          const first = d.phases.find(p => p.status !== 'concluida') || d.phases[0];
          setKanbanPhase(first.numero_fase);
        }
      }).catch(() => {}),
      tasksApi.all({}).then(setGanttTasks).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleTaskStatus = async (taskId, status) => {
    await cyclesApi.updateTask(taskId, { status });
    cyclesApi.kanbanAll().then(setCycleData).catch(() => {});
  };

  if (loading) return <div style={{ padding: 40, color: C.t2, fontSize: 14 }}>Carregando planejamento...</div>;

  const k = kpis || {};

  // Dados do kanban
  const d = cycleData;
  const allPhases = d?.phases || [];
  const allTasks = d?.tasks || [];
  const allEvents = d?.events || [];
  const phaseNums = [...new Set(allPhases.map(p => p.numero_fase))].sort((a, b) => a - b);
  const phaseNames = {}; allPhases.forEach(p => { phaseNames[p.numero_fase] = p.nome_fase; });
  const filteredPhases = eventFilter === 'all' ? allPhases : allPhases.filter(p => p.event_id === eventFilter);

  let phaseTasks = allTasks.filter(t => {
    const ph = allPhases.find(p => p.id === t.event_phase_id);
    if (!ph || ph.numero_fase !== kanbanPhase) return false;
    if (eventFilter !== 'all' && t.event_id !== eventFilter) return false;
    return true;
  });
  if (areaFilter !== 'all') phaseTasks = phaseTasks.filter(t => getCat(t) === areaFilter);

  // Gantt
  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const ganttGroups = {};
  ganttTasks.forEach(t => { const k = t.parent_name || 'Sem projeto'; if (!ganttGroups[k]) ganttGroups[k] = { name: k, tasks: [] }; ganttGroups[k].tasks.push(t); });
  const ganttList = Object.values(ganttGroups);
  const ganttDates = ganttTasks.filter(t => t.deadline).map(t => new Date(normDate(t.deadline)));
  const today = new Date();
  const gStart = ganttDates.length > 0 ? new Date(Math.min(...ganttDates, today) - 30 * 86400000) : new Date(today.getFullYear(), 0, 1);
  const gEnd = ganttDates.length > 0 ? new Date(Math.max(...ganttDates, today) + 30 * 86400000) : new Date(today.getFullYear(), 11, 31);
  gStart.setDate(1); gEnd.setDate(1); gEnd.setMonth(gEnd.getMonth() + 1);
  const dayPct = (date) => Math.max(0, Math.min(100, ((new Date(date) - gStart) / (gEnd - gStart)) * 100));
  const todayPct = dayPct(today);
  const monthLabels = [];
  const mc = new Date(gStart);
  while (mc < gEnd) { monthLabels.push({ label: MONTHS[mc.getMonth()] + (mc.getMonth() === 0 ? ' ' + mc.getFullYear() : ''), pct: dayPct(mc) }); mc.setMonth(mc.getMonth() + 1); }

  const SOURCE_COLORS = { evento: '#00B39D', ciclo: '#3b82f6', projeto: '#8b5cf6', planejamento: '#f59e0b' };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>Planejamento</div>
          <div style={{ fontSize: 13, color: C.t2, marginTop: 2 }}>Visão consolidada de eventos, projetos e planejamento estratégico</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${C.border}`, marginBottom: 20 }}>
        {['Dashboard', 'Kanban', 'Gantt'].map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: tab === i ? C.accent : C.t3,
            borderBottom: tab === i ? `2px solid ${C.accent}` : '2px solid transparent', marginBottom: -2,
          }}>{t}</button>
        ))}
      </div>

      {/* ═══ TAB: Dashboard ═══ */}
      {tab === 0 && (
        <div>
          {/* KPIs */}
          <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 24px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            {[
              { label: 'Eventos', value: k.total_events || 0, color: C.accent },
              { label: 'No Prazo', value: k.events_on_track || 0, color: '#10b981' },
              { label: 'Em Risco', value: k.events_at_risk || 0, color: '#f59e0b' },
              { label: 'Atrasados', value: k.events_overdue || 0, color: '#ef4444' },
              null,
              { label: 'Tarefas abertas', value: k.tasks_open || 0, color: C.t2 },
              { label: 'Tarefas atrasadas', value: k.tasks_overdue || 0, color: '#ef4444' },
              { label: 'Riscos abertos', value: k.risks_open || 0, color: '#f59e0b' },
            ].map((item, i) => {
              if (!item) return <div key={i} style={{ width: 1, height: 24, background: C.border }} />;
              return (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.t3, textTransform: 'uppercase', letterSpacing: 0.3 }}>{item.label}</span>
                </div>
              );
            })}
          </div>

          {/* Orçamento + Carga */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
            {k.budget_total > 0 && (
              <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: '20px 24px', flex: '1 1 300px' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>Orçamento Global</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.t2, marginBottom: 6 }}>
                  <span>R$ {Number(k.budget_spent || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span>R$ {Number(k.budget_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ height: 10, background: C.border, borderRadius: 5 }}>
                  <div style={{ height: '100%', width: `${Math.min(((k.budget_spent || 0) / k.budget_total) * 100, 100)}%`, borderRadius: 5, background: (k.budget_spent || 0) > k.budget_total ? '#ef4444' : '#10b981' }} />
                </div>
              </div>
            )}
            {workload.length > 0 && (
              <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: '20px 24px', flex: '1 1 300px' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>Carga de Trabalho</div>
                {workload.slice(0, 6).map((w, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: C.text, width: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.responsible}</span>
                    <div style={{ flex: 1, height: 8, background: C.border, borderRadius: 4 }}>
                      <div style={{ height: '100%', width: `${Math.min((w.total_tasks / Math.max(...workload.map(x => x.total_tasks), 1)) * 100, 100)}%`, borderRadius: 4, background: w.atrasadas > 0 ? '#ef4444' : '#10b981' }} />
                    </div>
                    <span style={{ fontSize: 12, color: w.atrasadas > 0 ? '#ef4444' : C.t3, fontWeight: 600, minWidth: 50, textAlign: 'right' }}>{w.total_tasks}t</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ TAB: Kanban ═══ */}
      {tab === 1 && (
        <div>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.t2, fontWeight: 600 }}>Evento:</span>
            <select value={eventFilter} onChange={e => setEventFilter(e.target.value)}
              style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card }}>
              <option value="all">Todos</option>
              {allEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
            <span style={{ width: 1, height: 20, background: C.border }} />
            <span style={{ fontSize: 11, color: C.t2, fontWeight: 600 }}>Área:</span>
            {[{ key: 'all', label: 'Todas' }, ...Object.entries(CAT).filter(([k]) => k !== 'outros').map(([k, v]) => ({ key: k, label: v.label, color: v.color, bg: v.bg }))].map(f => (
              <button key={f.key} onClick={() => setAreaFilter(f.key)} style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: areaFilter === f.key ? 600 : 400, cursor: 'pointer',
                border: areaFilter === f.key ? `2px solid ${f.color || C.accent}` : `1px solid ${C.border}`,
                background: areaFilter === f.key ? (f.bg || `${C.accent}15`) : 'transparent',
                color: areaFilter === f.key ? (f.color || C.accent) : C.t3,
              }}>{f.label}</button>
            ))}
          </div>

          {/* Faixa de fases */}
          <div style={{ overflowX: 'auto', marginBottom: 16, paddingBottom: 6 }}>
            <div style={{ display: 'flex', gap: 5, minWidth: 'max-content' }}>
              {phaseNums.map((num, i) => {
                const isActive = num === kanbanPhase;
                const rp = filteredPhases.filter(p => p.numero_fase === num);
                const rpIds = rp.map(p => p.id);
                const pT = allTasks.filter(t => rpIds.includes(t.event_phase_id) && (eventFilter === 'all' || t.event_id === eventFilter));
                const pDone = pT.filter(t => t.status === 'concluida').length;
                const isDone = pT.length > 0 && pDone === pT.length;
                const pPct = pT.length > 0 ? Math.round((pDone / pT.length) * 100) : 0;
                return (
                  <div key={num} style={{ display: 'flex', alignItems: 'center' }}>
                    <div onClick={() => { setKanbanPhase(num); setExpanded(null); }} style={{
                      borderRadius: 8, padding: '8px 10px', cursor: 'pointer', minWidth: 100, maxWidth: 120,
                      border: isActive ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
                      background: isActive ? `${C.accent}10` : isDone ? C.bg : C.card,
                      opacity: isDone && !isActive ? 0.7 : 1,
                    }}>
                      <div style={{ fontSize: 9, color: C.t3, marginBottom: 3 }}>F{num}</div>
                      <div style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? C.accent : C.text, lineHeight: 1.3, marginBottom: 4 }}>{phaseNames[num]}</div>
                      <div style={{ height: 3, borderRadius: 2, background: C.border }}>
                        <div style={{ height: 3, borderRadius: 2, width: `${pPct}%`, background: isDone ? '#10b981' : C.accent }} />
                      </div>
                      <div style={{ fontSize: 9, color: C.t3, marginTop: 3 }}>{pT.length > 0 ? `${pDone}/${pT.length}` : 'vazia'}</div>
                    </div>
                    {i < phaseNums.length - 1 && <div style={{ width: 12, height: 2, background: isDone ? '#10b981' : C.border, flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kanban 4 colunas */}
          {kanbanPhase && (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>
                Fase {kanbanPhase} — {phaseNames[kanbanPhase]}
                <span style={{ fontSize: 12, fontWeight: 400, color: C.t3, marginLeft: 12 }}>
                  {phaseTasks.filter(t => t.status === 'concluida').length}/{phaseTasks.length} tarefas
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, minHeight: 300 }}>
                {COLS.map(col => {
                  const colT = phaseTasks.filter(t => t.status === col.key);
                  return (
                    <div key={col.key} style={{ background: C.bg, borderRadius: 10, padding: 8 }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { const id = e.dataTransfer.getData('planKanbanId'); if (id) handleTaskStatus(id, col.key); }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: col.color, textTransform: 'uppercase' }}>{col.label}</span>
                        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: C.card, border: `1px solid ${C.border}`, color: C.t3 }}>{colT.length}</span>
                      </div>
                      {colT.length === 0 && <div style={{ padding: 12, textAlign: 'center', fontSize: 10, color: C.t3, border: '1.5px dashed var(--cbrio-border)', borderRadius: 8 }}>—</div>}
                      {colT.map(task => {
                        const cat = CAT[getCat(task)] || CAT.outros;
                        const evN = allEvents.find(e => e.id === task.event_id)?.name || '';
                        const p = normDate(task.prazo);
                        const diff = p ? Math.ceil((new Date(p + 'T12:00:00') - new Date()) / 86400000) : null;
                        const dc = diff === null || task.status === 'concluida' ? null : diff < 0 ? '#ef4444' : diff <= 3 ? '#f59e0b' : '#10b981';
                        const dt = diff === null ? '' : diff < 0 ? `${Math.abs(diff)}d atrás` : diff === 0 ? 'Hoje' : `${diff}d`;
                        const subs = task.subtasks || [];
                        const isOpen = expanded === task.id;
                        return (
                          <div key={task.id} draggable onDragStart={e => e.dataTransfer.setData('planKanbanId', task.id)}
                            onClick={() => setExpanded(isOpen ? null : task.id)}
                            style={{ background: C.card, borderRadius: 8, padding: 8, marginBottom: 4, border: dc === '#ef4444' ? '1px solid #fecaca' : `1px solid ${C.border}`, cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                            <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: cat.bg, color: cat.color, fontWeight: 500, display: 'inline-block', marginBottom: 4 }}>{cat.label}</span>
                            <div style={{ fontSize: 11, fontWeight: 500, color: C.text, lineHeight: 1.3, marginBottom: 2 }}>{task.titulo}</div>
                            {evN && <div style={{ fontSize: 9, color: C.t3, marginBottom: 2 }}>{evN}</div>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.t3 }}>
                              <span>{task.responsavel_nome || '—'}</span>
                              {subs.length > 0 && <span>{subs.filter(s => s.done).length}/{subs.length}</span>}
                            </div>
                            {dc && task.status !== 'concluida' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.border}` }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: dc }}>{fmtDate(task.prazo)}</span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: dc, padding: '1px 6px', borderRadius: 8, background: `${dc}15` }}>{dt}</span>
                              </div>
                            )}
                            {isOpen && subs.length > 0 && (
                              <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
                                {subs.map(sub => (
                                  <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, padding: '2px 0', color: C.text }}>
                                    <input type="checkbox" checked={sub.done} onChange={() => { sub.done = !sub.done; setCycleData({ ...d }); }} style={{ cursor: 'pointer', width: 13, height: 13 }} />
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
            </>
          )}
        </div>
      )}

      {/* ═══ TAB: Gantt ═══ */}
      {tab === 2 && (
        <div>
          <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ position: 'relative', height: 36, borderBottom: `1px solid ${C.border}`, background: 'var(--cbrio-table-header, #fafafa)' }}>
              {monthLabels.map((m, i) => (
                <div key={i} style={{ position: 'absolute', left: `${m.pct}%`, top: 0, height: '100%', borderLeft: `1px solid ${C.border}`, padding: '8px 8px', fontSize: 12, fontWeight: 600, color: C.t2, whiteSpace: 'nowrap' }}>{m.label}</div>
              ))}
              <div style={{ position: 'absolute', left: `${todayPct}%`, top: 0, width: 2, height: '100%', background: '#ef4444', zIndex: 2 }} />
              <div style={{ position: 'absolute', left: `${todayPct}%`, top: 0, transform: 'translateX(-50%)', fontSize: 9, fontWeight: 700, color: '#ef4444', background: C.card, padding: '0 4px', borderRadius: 4, zIndex: 3 }}>hoje</div>
            </div>
            {ganttList.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: C.t3, fontSize: 13 }}>Nenhuma tarefa com prazo</div>}
            {ganttList.map((g, gi) => (
              <div key={gi}>
                <div style={{ padding: '10px 16px', fontWeight: 700, fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}`, background: C.bg }}>{g.name}</div>
                {g.tasks.map(task => {
                  const dl = normDate(task.deadline);
                  if (!dl) return null;
                  const dd = new Date(dl + 'T12:00:00');
                  const sd = task.start_date ? new Date(normDate(task.start_date) + 'T12:00:00') : new Date(dd.getTime() - 14 * 86400000);
                  const lp = dayPct(sd), rp = dayPct(dd), wp = Math.max(rp - lp, 1);
                  const bc = task.area ? (CAT[task.area]?.color || SOURCE_COLORS[task.source]) : SOURCE_COLORS[task.source] || '#9ca3af';
                  const late = dd < today && task.status !== 'concluida';
                  const done = task.status === 'concluida';
                  return (
                    <div key={`${task.source}-${task.id}`} style={{ position: 'relative', height: 40, borderBottom: `1px solid ${C.border}` }}>
                      {monthLabels.map((m, i) => (<div key={i} style={{ position: 'absolute', left: `${m.pct}%`, top: 0, width: 1, height: '100%', background: C.border, opacity: 0.4 }} />))}
                      <div style={{ position: 'absolute', left: `${todayPct}%`, top: 0, width: 2, height: '100%', background: '#ef4444', zIndex: 2, opacity: 0.6 }} />
                      <div title={`${task.name}\n${task.responsible || ''}\n${fmtDate(task.deadline)}`} style={{
                        position: 'absolute', top: 8, height: 24, borderRadius: 6, left: `${lp}%`, width: `${wp}%`, minWidth: 40,
                        background: done ? '#d1d5db' : late ? '#ef4444' : bc, opacity: done ? 0.5 : 0.85,
                        display: 'flex', alignItems: 'center', padding: '0 8px', overflow: 'hidden',
                      }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ height: 60 }} />
        </div>
      )}
    </div>
  );
}
