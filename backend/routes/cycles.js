const router = require('express').Router();
const { authenticate, authorizeCycle } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');
const ADM_TASKS_TEMPLATE = require('../adm_tasks_template.json');

router.use(authenticate);

// Helper: calcular datas das fases a partir do Dia D
function calcDates(diaDDate, semanasInicio, semanasFim) {
  const diaD = new Date(diaDDate);
  const inicio = new Date(diaD); inicio.setDate(diaD.getDate() + semanasInicio * 7);
  const fim = new Date(diaD); fim.setDate(diaD.getDate() + semanasFim * 7);
  return {
    data_inicio_prevista: inicio.toISOString().split('T')[0],
    data_fim_prevista: fim.toISOString().split('T')[0],
  };
}

// Template da trilha ADM (24 tarefas, semanas -5 a 0)
const ADM_TRACK = [
  { semana: -5, area: 'compras', titulo: 'Receber lista de compras do marketing', descricao: 'Receber lista consolidada de todas as peças, materiais e serviços', entrega_esperada: 'Lista de compras consolidada' },
  { semana: -5, area: 'compras', titulo: 'Levantar fornecedores e cotar itens', descricao: 'Levantar fornecedores e cotar cada item da lista', entrega_esperada: 'Cotações enviadas ao financeiro' },
  { semana: -5, area: 'financeiro', titulo: 'Verificar disponibilidade orçamentária', descricao: 'Receber estimativa de custos e verificar disponibilidade', entrega_esperada: 'Parecer financeiro: itens aprovados, pendentes e fora do orçamento' },
  { semana: -5, area: 'manutencao', titulo: 'Vistoria inicial dos espaços', descricao: 'Fazer vistoria inicial dos espaços que serão utilizados', entrega_esperada: 'Relatório de vistoria com lista de intervenções' },
  { semana: -5, area: 'limpeza', titulo: 'Ciência e planejamento do evento', descricao: 'Tomar ciência do evento: espaços, data e público estimado', entrega_esperada: 'Planejamento interno' },
  { semana: -4, area: 'compras', titulo: 'Emitir ordens de compra', descricao: 'Emitir ordens de compra para itens aprovados', entrega_esperada: 'Ordens de compra emitidas e confirmadas' },
  { semana: -4, area: 'financeiro', titulo: 'Aprovar itens e processar pagamentos', descricao: 'Aprovar ou rejeitar itens pendentes. Processar pagamentos de entrada', entrega_esperada: 'Aprovações e pagamentos de sinal processados' },
  { semana: -4, area: 'manutencao', titulo: 'Iniciar intervenções estruturais', descricao: 'Iniciar intervenções com maior prazo de execução', entrega_esperada: 'Cronograma de execução aprovado' },
  { semana: -4, area: 'limpeza', titulo: 'Planejar cronograma de limpeza', descricao: 'Planejar cronograma de limpeza pré-evento', entrega_esperada: 'Plano de limpeza com datas e responsáveis' },
  { semana: -3, area: 'compras', titulo: 'Receber e conferir materiais', descricao: 'Receber e conferir materiais dos fornecedores', entrega_esperada: 'Confirmação de recebimento' },
  { semana: -3, area: 'financeiro', titulo: 'Processar pagamentos finais', descricao: 'Processar pagamentos finais e consolidar custo total', entrega_esperada: 'Relatório de custo consolidado' },
  { semana: -3, area: 'manutencao', titulo: 'Concluir montagem e pré-testes', descricao: 'Concluir intervenções e participar dos pré-testes', entrega_esperada: 'Espaços prontos para pré-testes' },
  { semana: -3, area: 'limpeza', titulo: 'Limpeza profunda pós-intervenções', descricao: 'Limpeza profunda após intervenções da manutenção', entrega_esperada: 'Espaços limpos e prontos' },
  { semana: -2, area: 'compras', titulo: 'Resolver pendências de entrega', descricao: 'Resolver pendências e compras emergenciais', entrega_esperada: 'Todas as compras concluídas' },
  { semana: -2, area: 'financeiro', titulo: 'Relatório financeiro preliminar', descricao: 'Processar pagamentos restantes e emitir relatório', entrega_esperada: 'Relatório financeiro preliminar' },
  { semana: -2, area: 'manutencao', titulo: 'Ajustes finais e cronograma Dia D', descricao: 'Ajustes finais com base nos pré-testes', entrega_esperada: 'Cronograma do Dia D da manutenção' },
  { semana: -2, area: 'limpeza', titulo: 'Confirmar cronograma limpeza Dia D', descricao: 'Confirmar cronograma de limpeza do Dia D', entrega_esperada: 'Cronograma de limpeza aprovado' },
  { semana: -1, area: 'compras', titulo: 'Checklist final de compras', descricao: 'Confirmar que todos os itens foram recebidos', entrega_esperada: 'Checklist 100% conferido' },
  { semana: -1, area: 'financeiro', titulo: 'Liberar verba do Dia D', descricao: 'Liberar verba para despesas do Dia D', entrega_esperada: 'Caixa do Dia D autorizado' },
  { semana: -1, area: 'manutencao', titulo: 'Vistoria final e alinhamento', descricao: 'Vistoria final dos espaços e confirmar equipe', entrega_esperada: 'Vistoria concluída, equipe escalada' },
  { semana: -1, area: 'limpeza', titulo: 'Limpeza final e alinhamento', descricao: 'Limpeza final completa e alinhamento operacional', entrega_esperada: 'Espaços 100% limpos e prontos' },
  { semana: 0, area: 'compras', titulo: 'Standby para emergências', descricao: 'Manter contato disponível para emergências', entrega_esperada: 'Standby' },
  { semana: 0, area: 'financeiro', titulo: 'Caixa e registro despesas Dia D', descricao: 'Caixa liberado e registro de despesas do dia', entrega_esperada: 'Registro de despesas do Dia D' },
  { semana: 0, area: 'manutencao', titulo: 'On-site: montagem e desmontagem', descricao: 'On-site desde montagem até desmontagem', entrega_esperada: 'Espaços desmontados e devolvidos' },
  { semana: 0, area: 'limpeza', titulo: 'On-site: limpeza pré, durante e pós', descricao: 'Limpeza de preparação, manutenção durante e pós-evento', entrega_esperada: 'Espaços limpos e liberados' },
];

// GET /api/cycles/summary/all (DEVE vir antes de /:eventId)
router.get('/summary/all', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vw_cycle_summary').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/cycles/kanban/all — todos os ciclos com fases + tarefas + subtarefas
router.get('/kanban/all', async (req, res) => {
  try {
    const { data: cycles } = await supabase.from('event_cycles').select('event_id, status, events(name)').eq('status', 'ativo');
    if (!cycles || cycles.length === 0) return res.json({ events: [], phases: [], tasks: [] });

    const eventIds = cycles.map(c => c.event_id);

    const [phasesRes, tasksRes] = await Promise.all([
      supabase.from('event_cycle_phases').select('*').in('event_id', eventIds).order('numero_fase'),
      supabase.from('cycle_phase_tasks').select('*').in('event_id', eventIds),
    ]);

    // Subtarefas
    const taskIds = (tasksRes.data || []).map(t => t.id);
    const { data: allSubs } = taskIds.length > 0
      ? await supabase.from('cycle_task_subtasks').select('*').in('task_id', taskIds).order('sort_order')
      : { data: [] };
    const subsMap = {};
    (allSubs || []).forEach(s => { if (!subsMap[s.task_id]) subsMap[s.task_id] = []; subsMap[s.task_id].push(s); });

    const tasksWithSubs = (tasksRes.data || []).map(t => ({ ...t, subtasks: subsMap[t.id] || [] }));

    const events = cycles.map(c => ({ id: c.event_id, name: c.events?.name || '—' }));

    res.json({
      events,
      phases: phasesRes.data || [],
      tasks: tasksWithSubs,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// POST /api/cycles/activate/:eventId
router.post('/activate/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.userId;
  try {
    const { data: event, error: evErr } = await supabase.from('events').select('id, date, name').eq('id', eventId).single();
    if (evErr || !event) return res.status(404).json({ error: 'Evento não encontrado' });

    const { data: existing } = await supabase.from('event_cycles').select('id').eq('event_id', eventId).single();
    if (existing) return res.status(409).json({ error: 'Ciclo já ativado para este evento' });

    const diaDDate = event.date;
    const { data: cycle, error: cycleErr } = await supabase.from('event_cycles')
      .insert({ event_id: eventId, ativado_por: userId, data_dia_d: diaDDate })
      .select().single();
    if (cycleErr) throw cycleErr;

    const { data: templates } = await supabase.from('cycle_phase_templates').select('*').order('numero');
    const phases = templates.map(t => ({
      event_id: eventId, template_id: t.id, numero_fase: t.numero,
      nome_fase: t.nome, area: t.area, momento_chave: t.momento_chave, status: 'pendente',
      ...calcDates(diaDDate, t.semanas_inicio, t.semanas_fim),
    }));
    const { error: phasesErr } = await supabase.from('event_cycle_phases').insert(phases);
    if (phasesErr) throw phasesErr;

    const diaDObj = new Date(diaDDate);
    const admTrack = ADM_TRACK.map(t => {
      const dp = new Date(diaDObj); dp.setDate(diaDObj.getDate() + t.semana * 7);
      return { event_id: eventId, semana: t.semana, area: t.area, titulo: t.titulo,
        descricao: t.descricao, entrega_esperada: t.entrega_esperada,
        data_prevista: dp.toISOString().split('T')[0], status: 'pendente' };
    });
    const { error: admErr } = await supabase.from('event_adm_track').insert(admTrack);
    if (admErr) throw admErr;

    await supabase.from('event_budgets').insert({ event_id: eventId, orcamento_aprovado: 0, created_by: userId });

    // Buscar fases criadas para vincular tarefas por etapa
    const { data: createdPhases } = await supabase.from('event_cycle_phases')
      .select('id, nome_fase').eq('event_id', eventId);
    const phaseMap = {};
    (createdPhases || []).forEach(p => { phaseMap[p.nome_fase] = p.id; });

    // Mapear etapas da planilha para fases do ciclo
    const etapaToFase = {
      'Aprovação': 'Aprovação',
      'Execução Estratégica': 'Execução Estratégica',
      'Pré-Testes': 'Pré-Testes',
      'Finalizações': 'Finalizações',
      'Alinhamentos Operacionais Finais': 'Alinhamentos Operacionais Finais',
      'Dia D': 'Dia D',
      'Debriefing': 'Debrief',
    };

    // Criar tarefas detalhadas com subtarefas para cada área ADM
    for (const tmpl of ADM_TASKS_TEMPLATE) {
      const faseNome = etapaToFase[tmpl.etapa] || tmpl.etapa;
      const phaseId = phaseMap[faseNome] || null;
      const dataInicio = new Date(diaDObj); dataInicio.setDate(diaDObj.getDate() + tmpl.offset_start);
      const dataFim = new Date(diaDObj); dataFim.setDate(diaDObj.getDate() + tmpl.offset_end);

      const { data: task, error: taskErr } = await supabase.from('cycle_phase_tasks').insert({
        event_phase_id: phaseId,
        event_id: eventId,
        titulo: tmpl.titulo,
        area: tmpl.area === 'compras' || tmpl.area === 'financeiro' || tmpl.area === 'manutencao' || tmpl.area === 'limpeza' || tmpl.area === 'cozinha' ? 'adm' : 'marketing',
        prazo: dataFim.toISOString().split('T')[0],
        status: 'a_fazer',
        prioridade: 'normal',
        observacoes: `Área: ${tmpl.area} | Início: ${dataInicio.toISOString().split('T')[0]} | Fim: ${dataFim.toISOString().split('T')[0]}`,
      }).select().single();

      if (taskErr) { console.error('Erro criando tarefa ADM:', taskErr.message); continue; }

      // Criar subtarefas
      if (tmpl.subtasks.length > 0 && task) {
        const subs = tmpl.subtasks.map((s, i) => ({
          task_id: task.id,
          name: s.name,
          offset_start: s.offset_start,
          offset_end: s.offset_end,
          sort_order: i,
        }));
        await supabase.from('cycle_task_subtasks').insert(subs);
      }
    }

    res.json({ success: true, cycle, message: `Ciclo criativo ativado para ${event.name}` });
  } catch (err) {
    console.error('[CYCLE ACTIVATE]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cycles/:eventId
router.get('/:eventId', async (req, res) => {
  const { eventId } = req.params;
  try {
    // Usar maybeSingle() em vez de single() para não dar erro quando não tem ciclo
    const { data: cycleData } = await supabase.from('event_cycles').select('*').eq('event_id', eventId).maybeSingle();

    // Se não tem ciclo, retornar null sem erro
    if (!cycleData) {
      return res.json({ cycle: null, phases: [], tasks: [], admTrack: [], budget: null });
    }

    const [phasesRes, tasksRes, admRes, budgetRes] = await Promise.all([
      supabase.from('event_cycle_phases').select('*').eq('event_id', eventId).order('numero_fase'),
      supabase.from('cycle_phase_tasks').select('*').eq('event_id', eventId),
      supabase.from('event_adm_track').select('*').eq('event_id', eventId).order('semana').order('area'),
      supabase.from('event_budgets').select('*').eq('event_id', eventId).maybeSingle(),
    ]);

    let totalGasto = 0;
    if (budgetRes.data) {
      const { data: expenses } = await supabase.from('event_expenses')
        .select('valor').eq('event_id', eventId).in('status', ['registrado', 'aprovado']);
      totalGasto = (expenses || []).reduce((acc, e) => acc + Number(e.valor), 0);
    }

    // Buscar subtarefas de todas as tasks do ciclo
    const taskIds = (tasksRes.data || []).map(t => t.id);
    const { data: allSubs } = taskIds.length > 0
      ? await supabase.from('cycle_task_subtasks').select('*').in('task_id', taskIds).order('sort_order')
      : { data: [] };
    const subsMap = {};
    (allSubs || []).forEach(s => { if (!subsMap[s.task_id]) subsMap[s.task_id] = []; subsMap[s.task_id].push(s); });

    const tasksWithSubs = (tasksRes.data || []).map(t => ({ ...t, subtasks: subsMap[t.id] || [] }));

    res.json({
      cycle: cycleData,
      phases: phasesRes.data || [],
      tasks: tasksWithSubs,
      admTrack: admRes.data || [],
      budget: budgetRes.data ? { ...budgetRes.data, total_gasto: totalGasto } : null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/cycles/phases/:phaseId
router.patch('/phases/:phaseId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('event_cycle_phases')
      .update({ status: req.body.status, observacoes: req.body.observacoes, updated_by: req.user.userId })
      .eq('id', req.params.phaseId).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/cycles/tasks
router.post('/tasks', async (req, res) => {
  try {
    const { data, error } = await supabase.from('cycle_phase_tasks')
      .insert({ ...req.body, created_by: req.user.userId }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/cycles/tasks/:taskId
router.patch('/tasks/:taskId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('cycle_phase_tasks')
      .update(req.body).eq('id', req.params.taskId).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/cycles/adm/:itemId
router.patch('/adm/:itemId', async (req, res) => {
  try {
    const patch = { status: req.body.status, observacoes: req.body.observacoes,
      checked_by: req.user.userId, checked_at: new Date().toISOString() };
    const { data, error } = await supabase.from('event_adm_track')
      .update(patch).eq('id', req.params.itemId).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/cycles/expenses
router.post('/expenses', async (req, res) => {
  try {
    const { event_id } = req.body;
    const { data: expense, error } = await supabase.from('event_expenses')
      .insert({ ...req.body, registrado_por: req.user.userId }).select().single();
    if (error) throw error;

    const { data: budget } = await supabase.from('event_budgets')
      .select('orcamento_aprovado').eq('event_id', event_id).single();

    if (budget && budget.orcamento_aprovado > 0) {
      const { data: allExp } = await supabase.from('event_expenses')
        .select('valor').eq('event_id', event_id).in('status', ['registrado', 'aprovado']);
      const totalGasto = (allExp || []).reduce((acc, e) => acc + Number(e.valor), 0);

      if (totalGasto > budget.orcamento_aprovado) {
        await supabase.from('budget_alerts').insert({
          event_id, expense_id: expense.id, orcamento_aprovado: budget.orcamento_aprovado,
          total_gasto_atual: totalGasto, valor_excedido: totalGasto - budget.orcamento_aprovado,
        });
        return res.json({ expense, alert: true, totalGasto, orcamento: budget.orcamento_aprovado,
          message: `Orçamento excedido em R$ ${(totalGasto - budget.orcamento_aprovado).toFixed(2)}` });
      }
    }
    res.json({ expense, alert: false });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
