const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');

router.use(authenticate);

// ════════════════════════════════════════════════════════════════
// CATEGORIES
// ════════════════════════════════════════════════════════════════

// GET /api/projects/categories
router.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('project_categories')
      .select('*')
      .eq('active', true)
      .order('sort_order');
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// ════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════

// GET /api/projects/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const { data: allProjects } = await supabase
      .from('projects')
      .select('id, status, budget_planned, budget_spent');
    const { data: allTasks } = await supabase
      .from('project_tasks')
      .select('id, status, deadline');

    const total = allProjects?.length || 0;
    const byStatus = { 'no-prazo': 0, 'em-risco': 0, 'atrasado': 0, 'concluido': 0 };
    (allProjects || []).forEach(p => {
      if (byStatus[p.status] !== undefined) byStatus[p.status]++;
    });

    const tasksOpen = (allTasks || []).filter(t => !['concluida'].includes(t.status)).length;
    const tasksOverdue = (allTasks || []).filter(t =>
      t.deadline && new Date(t.deadline) < new Date() && t.status !== 'concluida'
    ).length;
    const budgetPlanned = (allProjects || []).reduce((s, p) => s + Number(p.budget_planned || 0), 0);
    const budgetSpent = (allProjects || []).reduce((s, p) => s + Number(p.budget_spent || 0), 0);

    res.json({
      total,
      by_status: byStatus,
      budget_planned: budgetPlanned,
      budget_spent: budgetSpent,
      tasks_open: tasksOpen,
      tasks_overdue: tasksOverdue,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao buscar dashboard de projetos' });
  }
});

// ════════════════════════════════════════════════════════════════
// LIST / DETAIL / CRUD — PROJECTS
// ════════════════════════════════════════════════════════════════

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const { status, category_id, area, priority, year } = req.query;
    let query = supabase
      .from('projects')
      .select('*, project_categories(name, color)')
      .order('date_start', { ascending: false });

    if (status) query = query.eq('status', status);
    if (category_id) query = query.eq('category_id', category_id);
    if (area) query = query.eq('area', area);
    if (priority) query = query.eq('priority', priority);
    if (year) query = query.eq('year', year);

    const { data: projects, error } = await query;
    if (error) throw error;

    // Compute task counts per project
    const { data: allTasks } = await supabase
      .from('project_tasks')
      .select('id, project_id, status');

    const result = (projects || []).map(p => {
      const pTasks = (allTasks || []).filter(t => t.project_id === p.id);
      return {
        ...p,
        category_name: p.project_categories?.name || null,
        category_color: p.project_categories?.color || null,
        tasks_total: pTasks.length,
        tasks_done: pTasks.filter(t => t.status === 'concluida').length,
      };
    });

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao buscar projetos' });
  }
});

// GET /api/projects/:id — full detail
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [projectRes, phasesRes, tasksRes, milestonesRes, risksRes, kpisRes, budgetRes, retroRes] = await Promise.all([
      supabase.from('projects').select('*, project_categories(name, color)').eq('id', id).single(),
      supabase.from('project_phases').select('*').eq('project_id', id).order('phase_order'),
      supabase.from('project_tasks').select('*').eq('project_id', id).order('sort_order'),
      supabase.from('project_milestones').select('*').eq('project_id', id).order('sort_order'),
      supabase.from('project_risks').select('*').eq('project_id', id).order('created_at'),
      supabase.from('project_kpis').select('*').eq('project_id', id).order('sort_order'),
      supabase.from('project_budget_items').select('*').eq('project_id', id).order('created_at'),
      supabase.from('project_retrospectives').select('*').eq('project_id', id).maybeSingle(),
    ]);

    if (projectRes.error || !projectRes.data) {
      return res.status(404).json({ error: 'Projeto nao encontrado' });
    }

    // Fetch subtasks and comments for tasks
    const taskIds = (tasksRes.data || []).map(t => t.id);
    const [subsRes, commentsRes] = taskIds.length > 0
      ? await Promise.all([
          supabase.from('project_task_subtasks').select('*').in('task_id', taskIds).order('sort_order'),
          supabase.from('project_task_comments').select('*').in('task_id', taskIds).order('created_at'),
        ])
      : [{ data: [] }, { data: [] }];

    // Assemble tasks with subtasks and comments
    const tasks = (tasksRes.data || []).map(t => ({
      ...t,
      subtasks: (subsRes.data || []).filter(s => s.task_id === t.id),
      comments: (commentsRes.data || []).filter(c => c.task_id === t.id),
    }));

    const project = projectRes.data;
    res.json({
      ...project,
      category_name: project.project_categories?.name || null,
      category_color: project.project_categories?.color || null,
      phases: phasesRes.data || [],
      tasks,
      milestones: milestonesRes.data || [],
      risks: risksRes.data || [],
      kpis: kpisRes.data || [],
      budget_items: budgetRes.data || [],
      retrospective: retroRes.data || null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao buscar projeto' });
  }
});

// POST /api/projects
router.post('/', authorize('diretor'), async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase.from('projects').insert({
      name: d.name,
      year: d.year || new Date().getFullYear(),
      date_start: d.date_start || null,
      date_end: d.date_end || null,
      category_id: d.category_id || null,
      status: d.status || 'no-prazo',
      description: d.description || '',
      location: d.location || '',
      responsible: d.responsible || '',
      area: d.area || '',
      budget_planned: d.budget_planned || 0,
      budget_spent: d.budget_spent || 0,
      notes: d.notes || '',
      lessons_learned: d.lessons_learned || '',
      priority: d.priority || 'media',
      created_by: req.user.userId,
      frequency: d.frequency || null,
      public_target: d.public_target || '',
      complexity: d.complexity || null,
      impact: d.impact || null,
      ourico_test: d.ourico_test || null,
      generates_unity: d.generates_unity ?? null,
      collaborates_expansion: d.collaborates_expansion ?? null,
      leader: d.leader || '',
      budget_revenue: d.budget_revenue || 0,
      budget_church_cost: d.budget_church_cost || 0,
      swot_strengths: d.swot_strengths || '',
      swot_weaknesses: d.swot_weaknesses || '',
      swot_opportunities: d.swot_opportunities || '',
      swot_threats: d.swot_threats || '',
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar projeto' });
  }
});

// PUT /api/projects/:id
router.put('/:id', authorize('diretor'), async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase.from('projects').update({
      name: d.name,
      year: d.year,
      date_start: d.date_start || null,
      date_end: d.date_end || null,
      category_id: d.category_id || null,
      status: d.status || 'no-prazo',
      description: d.description || '',
      location: d.location || '',
      responsible: d.responsible || '',
      area: d.area || '',
      budget_planned: d.budget_planned || 0,
      budget_spent: d.budget_spent || 0,
      notes: d.notes || '',
      lessons_learned: d.lessons_learned || '',
      priority: d.priority || 'media',
      frequency: d.frequency || null,
      public_target: d.public_target || '',
      complexity: d.complexity || null,
      impact: d.impact || null,
      ourico_test: d.ourico_test || null,
      generates_unity: d.generates_unity ?? null,
      collaborates_expansion: d.collaborates_expansion ?? null,
      leader: d.leader || '',
      budget_revenue: d.budget_revenue || 0,
      budget_church_cost: d.budget_church_cost || 0,
      swot_strengths: d.swot_strengths || '',
      swot_weaknesses: d.swot_weaknesses || '',
      swot_opportunities: d.swot_opportunities || '',
      swot_threats: d.swot_threats || '',
    }).eq('id', req.params.id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Projeto nao encontrado' });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao atualizar projeto' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', authorize('diretor'), async (req, res) => {
  try {
    const { error } = await supabase.from('projects').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao excluir projeto' });
  }
});

// ════════════════════════════════════════════════════════════════
// PHASES
// ════════════════════════════════════════════════════════════════

// POST /api/projects/:id/phases
router.post('/:id/phases', authorize('diretor'), async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase.from('project_phases').insert({
      project_id: req.params.id,
      name: d.name,
      phase_order: d.phase_order || 0,
      date_start: d.date_start || null,
      date_end: d.date_end || null,
      status: d.status || 'pendente',
      responsible: d.responsible || '',
      notes: d.notes || '',
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar fase' });
  }
});

// PATCH /api/projects/phases/:phaseId
router.patch('/phases/:phaseId', async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase
      .from('project_phases')
      .update(d)
      .eq('id', req.params.phaseId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar fase' });
  }
});

// ════════════════════════════════════════════════════════════════
// TASKS
// ════════════════════════════════════════════════════════════════

// POST /api/projects/:id/tasks
router.post('/:id/tasks', async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase.from('project_tasks').insert({
      project_id: req.params.id,
      milestone_id: d.milestone_id || null,
      name: d.name,
      responsible: d.responsible || '',
      area: d.area || '',
      start_date: d.start_date || null,
      deadline: d.deadline || null,
      status: d.status || 'pendente',
      priority: d.priority || 'media',
      is_milestone: d.is_milestone || false,
      description: d.description || '',
      sort_order: d.sort_order || 0,
      created_by: req.user.userId,
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
});

// PUT /api/projects/tasks/:taskId
router.put('/tasks/:taskId', async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase.from('project_tasks').update({
      name: d.name,
      milestone_id: d.milestone_id || null,
      responsible: d.responsible || '',
      area: d.area || '',
      start_date: d.start_date || null,
      deadline: d.deadline || null,
      status: d.status || 'pendente',
      priority: d.priority || 'media',
      is_milestone: d.is_milestone || false,
      description: d.description || '',
      sort_order: d.sort_order || 0,
    }).eq('id', req.params.taskId).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  }
});

// PATCH /api/projects/tasks/:taskId/status
router.patch('/tasks/:taskId/status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('project_tasks')
      .update({ status: req.body.status })
      .eq('id', req.params.taskId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar status da tarefa' });
  }
});

// DELETE /api/projects/tasks/:taskId
router.delete('/tasks/:taskId', async (req, res) => {
  try {
    const { error } = await supabase.from('project_tasks').delete().eq('id', req.params.taskId);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao excluir tarefa' });
  }
});

// ════════════════════════════════════════════════════════════════
// SUBTASKS
// ════════════════════════════════════════════════════════════════

// POST /api/projects/tasks/:taskId/subtasks
router.post('/tasks/:taskId/subtasks', async (req, res) => {
  try {
    const { data, error } = await supabase.from('project_task_subtasks').insert({
      task_id: req.params.taskId,
      name: req.body.name,
      sort_order: req.body.sort_order || 0,
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao criar subtarefa' });
  }
});

// PATCH /api/projects/subtasks/:subId — toggle done
router.patch('/subtasks/:subId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('project_task_subtasks')
      .update({ done: req.body.done })
      .eq('id', req.params.subId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar subtarefa' });
  }
});

// DELETE /api/projects/subtasks/:subId
router.delete('/subtasks/:subId', async (req, res) => {
  try {
    const { error } = await supabase.from('project_task_subtasks').delete().eq('id', req.params.subId);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao excluir subtarefa' });
  }
});

// ════════════════════════════════════════════════════════════════
// COMMENTS
// ════════════════════════════════════════════════════════════════

// POST /api/projects/tasks/:taskId/comments
router.post('/tasks/:taskId/comments', async (req, res) => {
  try {
    const { data, error } = await supabase.from('project_task_comments').insert({
      task_id: req.params.taskId,
      author_id: req.user.userId,
      author_name: req.user.name || 'PMO',
      text: req.body.text,
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao adicionar comentario' });
  }
});

// ════════════════════════════════════════════════════════════════
// MILESTONES
// ════════════════════════════════════════════════════════════════

// POST /api/projects/:id/milestones
router.post('/:id/milestones', authorize('diretor'), async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase.from('project_milestones').insert({
      project_id: req.params.id,
      name: d.name,
      description: d.description || '',
      date_start: d.date_start || null,
      date_end: d.date_end || null,
      status: d.status || 'pendente',
      sort_order: d.sort_order || 0,
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar milestone' });
  }
});

// PUT /api/projects/milestones/:mId
router.put('/milestones/:mId', authorize('diretor'), async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase.from('project_milestones').update({
      name: d.name,
      description: d.description || '',
      date_start: d.date_start || null,
      date_end: d.date_end || null,
      status: d.status || 'pendente',
      sort_order: d.sort_order || 0,
    }).eq('id', req.params.mId).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar milestone' });
  }
});

// PATCH /api/projects/milestones/:mId/status
router.patch('/milestones/:mId/status', authorize('diretor'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('project_milestones')
      .update({ status: req.body.status })
      .eq('id', req.params.mId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar status do milestone' });
  }
});

// ════════════════════════════════════════════════════════════════
// KPIs
// ════════════════════════════════════════════════════════════════

// POST /api/projects/:id/kpis
router.post('/:id/kpis', async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase.from('project_kpis').insert({
      project_id: req.params.id,
      name: d.name,
      target_value: d.target_value || null,
      current_value: d.current_value || null,
      unit: d.unit || '',
      instrument: d.instrument || '',
      sort_order: d.sort_order || 0,
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar KPI' });
  }
});

// PATCH /api/projects/kpis/:kpiId
router.patch('/kpis/:kpiId', async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase
      .from('project_kpis')
      .update(d)
      .eq('id', req.params.kpiId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar KPI' });
  }
});

// DELETE /api/projects/kpis/:kpiId
router.delete('/kpis/:kpiId', async (req, res) => {
  try {
    const { error } = await supabase.from('project_kpis').delete().eq('id', req.params.kpiId);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao excluir KPI' });
  }
});

// ════════════════════════════════════════════════════════════════
// RISKS
// ════════════════════════════════════════════════════════════════

// POST /api/projects/:id/risks
router.post('/:id/risks', async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase.from('project_risks').insert({
      project_id: req.params.id,
      title: d.title,
      description: d.description || '',
      probability: d.probability || 3,
      impact: d.impact || 3,
      score: (d.probability || 3) * (d.impact || 3),
      mitigation: d.mitigation || '',
      owner_name: d.owner_name || '',
      status: d.status || 'aberto',
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar risco' });
  }
});

// PATCH /api/projects/risks/:riskId
router.patch('/risks/:riskId', async (req, res) => {
  try {
    const d = req.body;
    // Recalculate score if probability or impact changed
    if (d.probability !== undefined || d.impact !== undefined) {
      const { data: current } = await supabase
        .from('project_risks')
        .select('probability, impact')
        .eq('id', req.params.riskId)
        .single();
      const prob = d.probability ?? current?.probability ?? 3;
      const imp = d.impact ?? current?.impact ?? 3;
      d.score = prob * imp;
    }
    const { data, error } = await supabase
      .from('project_risks')
      .update(d)
      .eq('id', req.params.riskId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar risco' });
  }
});

// DELETE /api/projects/risks/:riskId
router.delete('/risks/:riskId', async (req, res) => {
  try {
    const { error } = await supabase.from('project_risks').delete().eq('id', req.params.riskId);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao excluir risco' });
  }
});

// ════════════════════════════════════════════════════════════════
// BUDGET ITEMS
// ════════════════════════════════════════════════════════════════

// POST /api/projects/:id/budget
router.post('/:id/budget', async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase.from('project_budget_items').insert({
      project_id: req.params.id,
      description: d.description || '',
      category: d.category || '',
      planned_amount: d.planned_amount || 0,
      actual_amount: d.actual_amount || 0,
      date: d.date || null,
      notes: d.notes || '',
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar item de orcamento' });
  }
});

// PATCH /api/projects/budget/:itemId
router.patch('/budget/:itemId', async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase
      .from('project_budget_items')
      .update(d)
      .eq('id', req.params.itemId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar item de orcamento' });
  }
});

// DELETE /api/projects/budget/:itemId
router.delete('/budget/:itemId', async (req, res) => {
  try {
    const { error } = await supabase.from('project_budget_items').delete().eq('id', req.params.itemId);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao excluir item de orcamento' });
  }
});

// ════════════════════════════════════════════════════════════════
// RETROSPECTIVE
// ════════════════════════════════════════════════════════════════

// GET /api/projects/:id/retrospective
router.get('/:id/retrospective', async (req, res) => {
  try {
    const { data } = await supabase
      .from('project_retrospectives')
      .select('*')
      .eq('project_id', req.params.id)
      .maybeSingle();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar retrospectiva' });
  }
});

// POST /api/projects/:id/retrospective — upsert
router.post('/:id/retrospective', async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase.from('project_retrospectives').upsert({
      project_id: req.params.id,
      what_went_well: d.what_went_well || '',
      what_to_improve: d.what_to_improve || '',
      action_items: d.action_items || '',
      overall_rating: d.overall_rating || null,
      created_by: req.user.userId,
    }, { onConflict: 'project_id' }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao salvar retrospectiva' });
  }
});

module.exports = router;
