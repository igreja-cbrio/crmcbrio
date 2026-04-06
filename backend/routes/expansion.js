const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');

router.use(authenticate);

// ── Validation helpers ──
const MS_STATUSES = ['pendente', 'em-andamento', 'concluido', 'bloqueado'];
const MS_PHASES = ['planejamento', 'preparacao', 'execucao', 'entrega', 'avaliacao'];
const TASK_STATUSES = ['pendente', 'em-andamento', 'concluida', 'bloqueada'];

function validateMilestone(d) {
  if (!d.name || !String(d.name).trim()) return 'Nome é obrigatório';
  if (d.status && !MS_STATUSES.includes(d.status)) return `Status inválido: ${d.status}`;
  if (d.phase && !MS_PHASES.includes(d.phase)) return `Fase inválida: ${d.phase}`;
  if (d.year != null) {
    const y = Number(d.year);
    if (isNaN(y) || y < 2025 || y > 2035) return 'Ano deve ser entre 2025 e 2035';
  }
  if (d.budget_planned != null && Number(d.budget_planned) < 0) return 'Orçamento planejado não pode ser negativo';
  if (d.budget_spent != null && Number(d.budget_spent) < 0) return 'Orçamento gasto não pode ser negativo';
  return null;
}

function validateTask(d) {
  if (!d.name || !String(d.name).trim()) return 'Nome é obrigatório';
  if (d.status && !TASK_STATUSES.includes(d.status)) return `Status inválido: ${d.status}`;
  return null;
}

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
    // Validate query params
    if (req.query.year) {
      const y = parseInt(req.query.year);
      if (isNaN(y)) return res.status(400).json({ error: 'Ano inválido' });
    }
    if (req.query.status && !MS_STATUSES.includes(req.query.status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    let q = supabase
      .from('expansion_milestones')
      .select('*, expansion_tasks(*, expansion_subtasks(*))')
      .order('sort_order');
    if (req.query.year) q = q.eq('year', parseInt(req.query.year));
    if (req.query.area) q = q.eq('area', req.query.area);
    if (req.query.status) q = q.eq('status', req.query.status);
    const { data: milestones, error } = await q;
    if (error) throw error;

    // Renomear chaves do nested select para manter compatibilidade com frontend
    const result = (milestones || []).map(m => ({
      ...m,
      tasks: (m.expansion_tasks || [])
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map(t => ({
          ...t,
          subtasks: (t.expansion_subtasks || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
          expansion_subtasks: undefined,
        })),
      expansion_tasks: undefined,
    }));
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
    const err = validateMilestone(d);
    if (err) return res.status(400).json({ error: err });

    const { data, error } = await supabase.from('expansion_milestones').insert({
      name: d.name.trim(), description: d.description || '', year: d.year || 2026,
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
    const err = validateMilestone(d);
    if (err) return res.status(400).json({ error: err });

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
    const err = validateTask(d);
    if (err) return res.status(400).json({ error: err });

    const { data, error } = await supabase.from('expansion_tasks').insert({
      milestone_id: req.params.miId, name: d.name.trim(),
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

router.put('/tasks/:id', authorize('diretor'), async (req, res) => {
  try {
    const d = req.body;
    const err = validateTask(d);
    if (err) return res.status(400).json({ error: err });

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
router.post('/tasks/:taskId/subtasks', authorize('diretor'), async (req, res) => {
  try {
    if (!req.body.name || !String(req.body.name).trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    const { data, error } = await supabase.from('expansion_subtasks').insert({
      task_id: req.params.taskId, name: req.body.name.trim(),
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('[Expansion] Create subtask:', e.message);
    res.status(500).json({ error: 'Erro ao criar subtarefa' });
  }
});

router.patch('/subtasks/:id', authorize('diretor'), async (req, res) => {
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

router.delete('/subtasks/:id', authorize('diretor'), async (req, res) => {
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
