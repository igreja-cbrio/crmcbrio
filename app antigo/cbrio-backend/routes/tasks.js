// ══════════════════════════════════════
// Rotas de Tarefas
// ══════════════════════════════════════

const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const db = require('../utils/db');
const { sanitizeObj, isValidUUID, isValidDate, isValidEnum, logActivity } = require('../utils/sanitize');

const STATUSES = ['pendente', 'em-andamento', 'concluida'];
const PRIORITIES = ['urgente', 'alta', 'media', 'baixa'];

router.use(authenticate);

// GET /api/tasks?eventId=xxx
router.get('/', async (req, res) => {
  try {
    const { eventId } = req.query;
    let q = 'SELECT * FROM tasks';
    let params = [];
    if (eventId) {
      if (!isValidUUID(eventId)) return res.status(400).json({ error: 'eventId inválido' });
      q += ' WHERE event_id = $1';
      params = [eventId];
    }
    q += ' ORDER BY created_at ASC';
    const result = await db.query(q, params);

    // Buscar subtasks, comments, links e dependencies para cada task
    const tasks = await Promise.all(result.rows.map(async (t) => {
      const [subs, comments, links, deps] = await Promise.all([
        db.query('SELECT * FROM task_subtasks WHERE task_id = $1 ORDER BY sort_order', [t.id]),
        db.query('SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC', [t.id]),
        db.query('SELECT * FROM task_links WHERE task_id = $1', [t.id]),
        db.query('SELECT depends_on_id FROM task_dependencies WHERE task_id = $1', [t.id]),
      ]);
      return {
        ...t,
        subtasks: subs.rows,
        comments: comments.rows,
        links: links.rows,
        dependsOn: deps.rows.map(d => d.depends_on_id),
      };
    }));

    res.json(tasks);
  } catch (err) {
    console.error('[TASKS] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar tarefas' });
  }
});

// POST /api/tasks — só diretor
router.post('/', authorize('diretor'), async (req, res) => {
  try {
    const data = sanitizeObj(req.body);
    const { eventId, name, responsible, area, startDate, deadline, status,
            priority, isMilestone, description, dependsOn, subtasks, links,
            occurrenceDate, isRecurring } = data;

    if (!eventId || !name) {
      return res.status(400).json({ error: 'eventId e nome são obrigatórios' });
    }
    if (!isValidUUID(eventId)) return res.status(400).json({ error: 'eventId inválido' });

    const result = await db.transaction(async (client) => {
      // Criar tarefa
      const taskRes = await client.query(`
        INSERT INTO tasks (event_id, name, responsible, area, start_date, deadline, status, priority, is_milestone, description, occurrence_date, is_recurring)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
      `, [eventId, name, responsible || null, area || null, startDate || null,
          deadline || null, status || 'pendente', priority || 'media',
          isMilestone || false, description || null, occurrenceDate || null, isRecurring || false]);

      const taskId = taskRes.rows[0].id;

      // Subtasks
      if (subtasks?.length) {
        for (let i = 0; i < subtasks.length; i++) {
          await client.query(
            'INSERT INTO task_subtasks (task_id, name, done, sort_order) VALUES ($1,$2,$3,$4)',
            [taskId, subtasks[i].name, false, i]
          );
        }
      }

      // Links
      if (links?.length) {
        for (const link of links) {
          await client.query(
            'INSERT INTO task_links (task_id, label, url) VALUES ($1,$2,$3)',
            [taskId, link.label || null, link.url]
          );
        }
      }

      // Dependencies
      if (dependsOn?.length) {
        for (const depId of dependsOn) {
          if (isValidUUID(depId)) {
            await client.query(
              'INSERT INTO task_dependencies (task_id, depends_on_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
              [taskId, depId]
            );
          }
        }
      }

      return taskRes.rows[0];
    });

    await logActivity(db, {
      userId: req.user.userId,
      action: `Tarefa criada: ${name}`,
      entityType: 'task',
      entityId: result.id,
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('[TASKS] Erro ao criar:', err.message);
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
});

// PATCH /api/tasks/:id/status — só diretor
router.patch('/:id/status', authorize('diretor'), async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'ID inválido' });
    const { status } = req.body;
    if (!isValidEnum(status, STATUSES)) return res.status(400).json({ error: 'Status inválido' });

    const result = await db.query(
      'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tarefa não encontrada' });

    await logActivity(db, { userId: req.user.userId, action: `Status tarefa: ${result.rows[0].name} → ${status}`, entityType: 'task', entityId: req.params.id });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar status' });
  }
});

// POST /api/tasks/:id/comments — só diretor
router.post('/:id/comments', authorize('diretor'), async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'ID inválido' });
    const { text } = sanitizeObj(req.body);
    if (!text) return res.status(400).json({ error: 'Texto obrigatório' });

    const result = await db.query(
      'INSERT INTO task_comments (task_id, author, text) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, req.user.name, text]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar comentário' });
  }
});

// DELETE /api/tasks/:id — só diretor
router.delete('/:id', authorize('diretor'), async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'ID inválido' });
    await db.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir tarefa' });
  }
});

module.exports = router;
