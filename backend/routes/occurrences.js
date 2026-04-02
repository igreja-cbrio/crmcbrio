const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const db = require('../utils/db');
const { isValidUUID } = require('../utils/sanitize');

router.use(authenticate);

// GET /api/occurrences/:occId — detalhe da ocorrência com tarefas e reuniões
router.get('/:occId', async (req, res) => {
  try {
    if (!isValidUUID(req.params.occId)) return res.status(400).json({ error: 'ID inválido' });
    const occ = await db.query('SELECT * FROM event_occurrences WHERE id = $1', [req.params.occId]);
    if (!occ.rows[0]) return res.status(404).json({ error: 'Ocorrência não encontrada' });

    const [tasks, meetings] = await Promise.all([
      db.query('SELECT * FROM occurrence_tasks WHERE occurrence_id = $1 ORDER BY created_at', [req.params.occId]),
      db.query('SELECT * FROM occurrence_meetings WHERE occurrence_id = $1 ORDER BY date DESC', [req.params.occId]),
    ]);

    const meetingsWithPends = await Promise.all(meetings.rows.map(async m => {
      const pends = await db.query('SELECT * FROM occurrence_meeting_pendencies WHERE meeting_id = $1 ORDER BY created_at', [m.id]);
      return { ...m, pendencies: pends.rows };
    }));

    res.json({ ...occ.rows[0], tasks: tasks.rows, meetings: meetingsWithPends });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao buscar ocorrência' }); }
});

// ── TASKS ──

// POST /api/occurrences/:occId/tasks
router.post('/:occId/tasks', async (req, res) => {
  try {
    const { name, responsible, area, deadline, status, priority, description } = req.body;
    const occ = await db.query('SELECT event_id FROM event_occurrences WHERE id = $1', [req.params.occId]);
    if (!occ.rows[0]) return res.status(404).json({ error: 'Ocorrência não encontrada' });
    const r = await db.query(
      `INSERT INTO occurrence_tasks (occurrence_id, event_id, name, responsible, area, deadline, status, priority, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.params.occId, occ.rows[0].event_id, name, responsible || null, area || null,
       deadline || null, status || 'pendente', priority || 'media', description || null, req.user.userId]
    );
    res.json(r.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao criar tarefa' }); }
});

// PATCH /api/occurrences/tasks/:taskId/status
router.patch('/tasks/:taskId/status', async (req, res) => {
  try {
    const r = await db.query('UPDATE occurrence_tasks SET status=$1 WHERE id=$2 RETURNING *', [req.body.status, req.params.taskId]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Tarefa não encontrada' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Erro ao atualizar tarefa' }); }
});

// DELETE /api/occurrences/tasks/:taskId
router.delete('/tasks/:taskId', async (req, res) => {
  try {
    await db.query('DELETE FROM occurrence_tasks WHERE id = $1', [req.params.taskId]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro ao excluir tarefa' }); }
});

// ── MEETINGS ──

// POST /api/occurrences/:occId/meetings
router.post('/:occId/meetings', async (req, res) => {
  try {
    const d = req.body;
    const occ = await db.query('SELECT event_id FROM event_occurrences WHERE id = $1', [req.params.occId]);
    if (!occ.rows[0]) return res.status(404).json({ error: 'Ocorrência não encontrada' });
    const r = await db.query(
      `INSERT INTO occurrence_meetings (occurrence_id, event_id, title, date, participants, decisions, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.occId, occ.rows[0].event_id, d.title || 'Reunião', d.date,
       d.participants ? `{${d.participants.join(',')}}` : null,
       d.decisions || '', d.notes || '', req.user.userId]
    );

    if (d.pendencies && Array.isArray(d.pendencies)) {
      for (const p of d.pendencies) {
        await db.query(
          `INSERT INTO occurrence_meeting_pendencies (meeting_id, occurrence_id, description, responsible, deadline)
           VALUES ($1,$2,$3,$4,$5)`,
          [r.rows[0].id, req.params.occId, p.description, p.responsible || null, p.deadline || null]
        );
      }
    }
    res.json(r.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao criar reunião' }); }
});

// PATCH /api/occurrences/pendencies/:id
router.patch('/pendencies/:id', async (req, res) => {
  try {
    const r = await db.query(
      'UPDATE occurrence_meeting_pendencies SET done=$1, done_at=$2 WHERE id=$3 RETURNING *',
      [req.body.done, req.body.done ? new Date() : null, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Erro' }); }
});

// DELETE /api/occurrences/meetings/:id
router.delete('/meetings/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM occurrence_meetings WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro' }); }
});

module.exports = router;
