const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');

router.use(authenticate);

// GET /api/expansion/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const { data, error } = await supabase.from('v_expansion_dashboard').select('*').single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('[Expansion] Dashboard:', e.message);
    res.status(500).json({ error: 'Erro ao buscar dashboard' });
  }
});

// GET /api/expansion/milestones — com tasks e subtasks aninhados
router.get('/milestones', async (req, res) => {
  try {
    let q = supabase.from('expansion_milestones').select('*').order('sort_order');
    if (req.query.year) q = q.eq('year', parseInt(req.query.year));
    if (req.query.area) q = q.eq('area', req.query.area);
    if (req.query.status) q = q.eq('status', req.query.status);
    const { data: milestones, error } = await q;
    if (error) throw error;

    // Buscar todas as tasks de uma vez
    const msIds = (milestones || []).map(m => m.id);
    const { data: allTasks } = msIds.length > 0
      ? await supabase.from('expansion_tasks').select('*').in('milestone_id', msIds).order('sort_order')
      : { data: [] };

    // Buscar todas as subtasks de uma vez
    const taskIds = (allTasks || []).map(t => t.id);
    const { data: allSubs } = taskIds.length > 0
      ? await supabase.from('expansion_subtasks').select('*').in('task_id', taskIds).order('sort_order')
      : { data: [] };

    // Montar hierarquia
    const subsMap = {};
    (allSubs || []).forEach(s => { if (!subsMap[s.task_id]) subsMap[s.task_id] = []; subsMap[s.task_id].push(s); });

    const tasksMap = {};
    (allTasks || []).forEach(t => {
      if (!tasksMap[t.milestone_id]) tasksMap[t.milestone_id] = [];
      tasksMap[t.milestone_id].push({ ...t, subtasks: subsMap[t.id] || [] });
    });

    const result = (milestones || []).map(m => ({ ...m, tasks: tasksMap[m.id] || [] }));
    res.json(result);
  } catch (e) {
    console.error('[Expansion] Milestones:', e.message);
    res.status(500).json({ error: 'Erro ao buscar marcos' });
  }
});

// POST /api/expansion/milestones
router.post('/milestones', authorize('diretor'), async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase.from('expansion_milestones').insert({
      name: d.name, description: d.description || '', year: d.year || 2026,
      strategic_axis: d.strategic_axis || '', strategic_objective: d.strategic_objective || '',
      area: d.area || '', responsible: d.responsible || '',
      date_start: d.date_start || null, date_end: d.date_end || null,
      expected_delivery: d.expected_delivery || '',
      status: d.status || 'pendente', phase: d.phase || 'planejamento',
      budget_planned: d.budget_planned || 0, budget_spent: d.budget_spent || 0,
      sort_order: d.sort_order || 0, created_by: req.user.userId,
      swot_strengths: d.swot_strengths || '', swot_weaknesses: d.swot_weaknesses || '',
      swot_opportunities: d.swot_opportunities || '', swot_threats: d.swot_threats || '',
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('[Expansion] Create milestone:', e.message);
    res.status(500).json({ error: 'Erro ao criar marco' });
  }
});

// PUT /api/expansion/milestones/:id
router.put('/milestones/:id', authorize('diretor'), async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase.from('expansion_milestones').update({
      name: d.name, description: d.description, year: d.year,
      strategic_axis: d.strategic_axis, strategic_objective: d.strategic_objective,
      area: d.area, responsible: d.responsible,
      date_start: d.date_start, date_end: d.date_end,
      expected_delivery: d.expected_delivery,
      status: d.status, phase: d.phase,
      budget_planned: d.budget_planned, budget_spent: d.budget_spent,
      sort_order: d.sort_order,
      swot_strengths: d.swot_strengths, swot_weaknesses: d.swot_weaknesses,
      swot_opportunities: d.swot_opportunities, swot_threats: d.swot_threats,
    }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('[Expansion] Update milestone:', e.message);
    res.status(500).json({ error: 'Erro ao atualizar marco' });
  }
});

// DELETE /api/expansion/milestones/:id
router.delete('/milestones/:id', authorize('diretor'), async (req, res) => {
  try {
    const { error } = await supabase.from('expansion_milestones').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('[Expansion] Delete milestone:', e.message);
    res.status(500).json({ error: 'Erro ao excluir marco' });
  }
});

// ── TASKS ──
router.post('/milestones/:miId/tasks', authorize('diretor'), async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase.from('expansion_tasks').insert({
      milestone_id: req.params.miId, name: d.name,
      responsible: d.responsible || '', area: d.area || '',
      start_date: d.start_date || null, deadline: d.deadline || null,
      description: d.description || '', status: d.status || 'pendente',
      sort_order: d.sort_order || 0, created_by: req.user.userId,
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('[Expansion] Create task:', e.message);
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
});

router.put('/tasks/:id', async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase.from('expansion_tasks').update({
      name: d.name, responsible: d.responsible, area: d.area,
      start_date: d.start_date, deadline: d.deadline,
      status: d.status, description: d.description,
    }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('[Expansion] Update task:', e.message);
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  }
});

router.delete('/tasks/:id', authorize('diretor'), async (req, res) => {
  try {
    const { error } = await supabase.from('expansion_tasks').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('[Expansion] Delete task:', e.message);
    res.status(500).json({ error: 'Erro ao excluir tarefa' });
  }
});

// ── SUBTASKS ──
router.post('/tasks/:taskId/subtasks', async (req, res) => {
  try {
    const { data, error } = await supabase.from('expansion_subtasks').insert({
      task_id: req.params.taskId, name: req.body.name,
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('[Expansion] Create subtask:', e.message);
    res.status(500).json({ error: 'Erro ao criar subtarefa' });
  }
});

router.patch('/subtasks/:id', async (req, res) => {
  try {
    const pct = Math.min(100, Math.max(0, parseInt(req.body.pct) || 0));
    const { data, error } = await supabase.from('expansion_subtasks')
      .update({ pct }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('[Expansion] Update subtask:', e.message);
    res.status(500).json({ error: 'Erro ao atualizar subtarefa' });
  }
});

router.delete('/subtasks/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('expansion_subtasks').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('[Expansion] Delete subtask:', e.message);
    res.status(500).json({ error: 'Erro ao excluir subtarefa' });
  }
});

module.exports = router;
