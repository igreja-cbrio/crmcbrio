const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');

router.use(authenticate);

// GET /api/tasks/all — todas as tarefas de todos os módulos
router.get('/all', async (req, res) => {
  try {
    const { source } = req.query; // 'evento', 'projeto', 'planejamento' ou vazio = todos

    const results = [];

    // Tarefas de eventos
    if (!source || source === 'evento') {
      const { data } = await supabase.from('event_tasks')
        .select('id, name, responsible, area, deadline, status, priority, is_milestone, event_id, created_at, events(name)')
        .order('deadline', { nullsFirst: false });
      (data || []).forEach(t => results.push({
        ...t, source: 'evento', parent_name: t.events?.name || '—', parent_id: t.event_id,
      }));
    }

    // Tarefas de projetos
    if (!source || source === 'projeto') {
      const { data } = await supabase.from('project_tasks')
        .select('id, name, responsible, area, deadline, status, priority, is_milestone, project_id, created_at, projects(name)')
        .order('deadline', { nullsFirst: false });
      (data || []).forEach(t => results.push({
        ...t, source: 'projeto', parent_name: t.projects?.name || '—', parent_id: t.project_id,
      }));
    }

    // Tarefas de planejamento estratégico
    if (!source || source === 'planejamento') {
      const { data } = await supabase.from('strategic_tasks')
        .select('id, name, responsible, area, deadline, status, priority, is_milestone, plan_id, created_at, strategic_plans(name)')
        .order('deadline', { nullsFirst: false });
      (data || []).forEach(t => results.push({
        ...t, source: 'planejamento', parent_name: t.strategic_plans?.name || '—', parent_id: t.plan_id,
      }));
    }

    res.json(results);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao buscar tarefas' }); }
});

// PATCH /api/tasks/:source/:taskId/status — atualizar status de qualquer tarefa
router.patch('/:source/:taskId/status', async (req, res) => {
  try {
    const { source, taskId } = req.params;
    const table = source === 'evento' ? 'event_tasks' : source === 'projeto' ? 'project_tasks' : 'strategic_tasks';
    const { data, error } = await supabase.from(table).update({ status: req.body.status }).eq('id', taskId).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Erro ao atualizar status' }); }
});

module.exports = router;
