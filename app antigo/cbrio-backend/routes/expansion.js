// ══════════════════════════════════════
// Rotas do Módulo de Expansão
// ══════════════════════════════════════

const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const db = require('../utils/db');
const { sanitizeObj, isValidUUID } = require('../utils/sanitize');

router.use(authenticate);

// GET /api/expansion/milestones — admin e diretor podem ver
router.get('/milestones', authorize('diretor', 'admin'), async (req, res) => {
  try {
    const milestones = await db.query('SELECT * FROM expansion_milestones ORDER BY sort_order, deadline');

    const result = await Promise.all(milestones.rows.map(async (mi) => {
      const tasks = await db.query(
        'SELECT * FROM expansion_tasks WHERE milestone_id = $1 ORDER BY sort_order',
        [mi.id]
      );
      const tasksWithSubs = await Promise.all(tasks.rows.map(async (t) => {
        const subs = await db.query(
          'SELECT * FROM expansion_subtasks WHERE task_id = $1 ORDER BY sort_order',
          [t.id]
        );
        return { ...t, subtasks: subs.rows };
      }));
      return { ...mi, tasks: tasksWithSubs };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar marcos' });
  }
});

// POST /api/expansion/milestones — só diretor
router.post('/milestones', authorize('diretor'), async (req, res) => {
  try {
    const { name, description, deadline } = sanitizeObj(req.body);
    if (!name) return res.status(400).json({ error: 'Nome obrigatório' });

    const result = await db.query(
      'INSERT INTO expansion_milestones (name, description, deadline) VALUES ($1,$2,$3) RETURNING *',
      [name, description || null, deadline || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar marco' });
  }
});

// PUT /api/expansion/milestones/:id — só diretor
router.put('/milestones/:id', authorize('diretor'), async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'ID inválido' });
    const { name, description, deadline } = sanitizeObj(req.body);

    const result = await db.query(
      'UPDATE expansion_milestones SET name=COALESCE($1,name), description=$2, deadline=$3 WHERE id=$4 RETURNING *',
      [name, description, deadline || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Marco não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao editar marco' });
  }
});

// DELETE /api/expansion/milestones/:id — só diretor
router.delete('/milestones/:id', authorize('diretor'), async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'ID inválido' });
    await db.query('DELETE FROM expansion_milestones WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir marco' });
  }
});

// POST /api/expansion/tasks — só diretor
router.post('/tasks', authorize('diretor'), async (req, res) => {
  try {
    const { milestoneId, name, responsible, area, startDate, deadline, description, subtasks } = sanitizeObj(req.body);
    if (!milestoneId || !name) return res.status(400).json({ error: 'milestoneId e nome obrigatórios' });
    if (!isValidUUID(milestoneId)) return res.status(400).json({ error: 'milestoneId inválido' });

    const result = await db.transaction(async (client) => {
      const taskRes = await client.query(
        'INSERT INTO expansion_tasks (milestone_id, name, responsible, area, start_date, deadline, description) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [milestoneId, name, responsible || null, area || null, startDate || null, deadline || null, description || null]
      );
      const taskId = taskRes.rows[0].id;

      if (subtasks?.length) {
        for (let i = 0; i < subtasks.length; i++) {
          await client.query(
            'INSERT INTO expansion_subtasks (task_id, name, pct, sort_order) VALUES ($1,$2,$3,$4)',
            [taskId, subtasks[i].name, subtasks[i].pct || 0, i]
          );
        }
      }
      return taskRes.rows[0];
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar tarefa de expansão' });
  }
});

// PATCH /api/expansion/subtasks/:id/pct — só diretor
router.patch('/subtasks/:id/pct', authorize('diretor'), async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'ID inválido' });
    let { pct } = req.body;
    pct = Math.min(100, Math.max(0, parseInt(pct) || 0));

    const result = await db.query(
      'UPDATE expansion_subtasks SET pct = $1 WHERE id = $2 RETURNING *',
      [pct, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Subtarefa não encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar progresso' });
  }
});

// DELETE /api/expansion/tasks/:id — só diretor
router.delete('/tasks/:id', authorize('diretor'), async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'ID inválido' });
    await db.query('DELETE FROM expansion_tasks WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir tarefa' });
  }
});

module.exports = router;
