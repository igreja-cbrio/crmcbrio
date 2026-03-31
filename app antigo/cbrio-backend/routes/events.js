// ══════════════════════════════════════
// Rotas de Eventos
// GET    /api/events          — listar (todos autenticados)
// GET    /api/events/:id      — detalhe
// POST   /api/events          — criar (só diretor)
// PUT    /api/events/:id      — editar (só diretor)
// PATCH  /api/events/:id/status — mudar status (só diretor)
// DELETE /api/events/:id      — excluir (só diretor)
// ══════════════════════════════════════

const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const db = require('../utils/db');
const { sanitize, sanitizeObj, isValidUUID, isValidDate, isValidEnum, logActivity } = require('../utils/sanitize');

const STATUSES = ['no-prazo', 'em-risco', 'atrasado', 'concluido'];
const CATEGORIES = ['Evento especial', 'Rotina de Liturgia', 'Rotina Staff', 'Feriado', 'Geracional', 'Grupos', 'Outro'];

// Todas as rotas exigem autenticação
router.use(authenticate);

// GET /api/events
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT e.*,
        (SELECT COUNT(*) FROM tasks t WHERE t.event_id = e.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.event_id = e.id AND t.status = 'concluida') as tasks_done
      FROM events e
      ORDER BY e.date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[EVENTS] Erro ao listar:', err.message);
    res.status(500).json({ error: 'Erro ao buscar eventos' });
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const result = await db.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar evento' });
  }
});

// POST /api/events — só diretor
router.post('/', authorize('diretor'), async (req, res) => {
  try {
    const { name, date, category, status, description, location, responsible,
            budget, expected_attendance, recurrence, occurrences, notes } = sanitizeObj(req.body);

    if (!name || !date) {
      return res.status(400).json({ error: 'Nome e data são obrigatórios' });
    }
    if (!isValidDate(date)) {
      return res.status(400).json({ error: 'Data inválida' });
    }
    if (category && !isValidEnum(category, CATEGORIES)) {
      return res.status(400).json({ error: 'Categoria inválida' });
    }

    const result = await db.query(`
      INSERT INTO events (name, date, area, status, description, location, responsible, budget, expected_attendance, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [name, date, category || null, status || 'no-prazo', description || null,
        location || null, responsible || null, budget || null,
        expected_attendance || null, notes || null, req.user.userId]);

    await logActivity(db, {
      userId: req.user.userId,
      action: `Evento criado: ${name}`,
      entityType: 'event',
      entityId: result.rows[0].id,
      newValue: result.rows[0],
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[EVENTS] Erro ao criar:', err.message);
    res.status(500).json({ error: 'Erro ao criar evento' });
  }
});

// PUT /api/events/:id — só diretor
router.put('/:id', authorize('diretor'), async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const old = await db.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    const { name, date, category, status, description, location, responsible,
            budget, expected_attendance, notes, recurrence, occurrences, occurrenceData, occurrence_data, active_date, activeDate } = req.body;

    // Sanitize text fields only (not JSONB)
    const sName = name ? sanitize(name) : undefined;
    const sDesc = description ? sanitize(description) : undefined;
    const sLoc = location ? sanitize(location) : undefined;
    const sResp = responsible ? sanitize(responsible) : undefined;
    const sCat = category ? sanitize(category) : undefined;

    // Handle JSONB fields
    const occDataVal = occurrenceData || occurrence_data || null;
    const occVal = occurrences || null;

    const result = await db.query(`
      UPDATE events SET
        name = COALESCE($1, name), date = COALESCE($2, date), area = COALESCE($3, area),
        category = COALESCE($3, category),
        status = COALESCE($4, status), description = $5, location = $6,
        responsible = $7, budget = $8, expected_attendance = $9, notes = $10,
        recurrence = COALESCE($11, recurrence),
        occurrences = COALESCE($12, occurrences),
        occurrence_data = COALESCE($13, occurrence_data),
        active_date = $14
      WHERE id = $15 RETURNING *
    `, [sName, date, sCat, status, sDesc, sLoc,
        sResp, budget, expected_attendance, notes,
        recurrence, occVal ? JSON.stringify(occVal) : null,
        occDataVal ? JSON.stringify(occDataVal) : null,
        active_date || activeDate || null,
        req.params.id]);

    await logActivity(db, {
      userId: req.user.userId,
      action: `Evento editado: ${name || old.rows[0].name}`,
      entityType: 'event',
      entityId: req.params.id,
      oldValue: old.rows[0],
      newValue: result.rows[0],
    });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao editar evento' });
  }
});

// PATCH /api/events/:id/status — só diretor
router.patch('/:id/status', authorize('diretor'), async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const { status } = req.body;
    if (!isValidEnum(status, STATUSES)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const result = await db.query(
      'UPDATE events SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    await logActivity(db, {
      userId: req.user.userId,
      action: `Status do evento alterado para ${status}`,
      entityType: 'event',
      entityId: req.params.id,
    });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar status' });
  }
});

// DELETE /api/events/:id — só diretor (CASCADE exclui tasks, meetings, pendencies)
router.delete('/:id', authorize('diretor'), async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const old = await db.query('SELECT name FROM events WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    await db.query('DELETE FROM events WHERE id = $1', [req.params.id]);

    await logActivity(db, {
      userId: req.user.userId,
      action: `Evento excluído: ${old.rows[0].name}`,
      entityType: 'event',
      entityId: req.params.id,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir evento' });
  }
});

module.exports = router;
