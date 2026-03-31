// ══════════════════════════════════════
// Rotas de Reuniões e Pendências
// ══════════════════════════════════════

const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const db = require('../utils/db');
const { sanitizeObj, isValidUUID, logActivity } = require('../utils/sanitize');

router.use(authenticate);

// GET /api/meetings?eventId=xxx
router.get('/', async (req, res) => {
  try {
    const { eventId } = req.query;
    let q = 'SELECT * FROM meetings';
    let params = [];
    if (eventId) {
      if (!isValidUUID(eventId)) return res.status(400).json({ error: 'eventId inválido' });
      q += ' WHERE event_id = $1';
      params = [eventId];
    }
    q += ' ORDER BY date DESC';
    const result = await db.query(q, params);

    // Buscar pendências de cada reunião
    const meetings = await Promise.all(result.rows.map(async (m) => {
      const pends = await db.query(
        'SELECT * FROM pendencies WHERE meeting_id = $1 ORDER BY created_at ASC',
        [m.id]
      );
      return { ...m, pendencies: pends.rows };
    }));

    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar reuniões' });
  }
});

// POST /api/meetings — só diretor
router.post('/', authorize('diretor'), async (req, res) => {
  try {
    const data = sanitizeObj(req.body);
    const { eventId, title, date, participants, decisions, notes, occurrenceDate, pendencies } = data;

    if (!eventId || !date) return res.status(400).json({ error: 'eventId e data obrigatórios' });
    if (!isValidUUID(eventId)) return res.status(400).json({ error: 'eventId inválido' });

    const result = await db.transaction(async (client) => {
      const parts = Array.isArray(participants) ? participants : (participants || '').split(',').map(s => s.trim()).filter(Boolean);

      const meetRes = await client.query(`
        INSERT INTO meetings (event_id, title, date, participants, decisions, notes, occurrence_date)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
      `, [eventId, title || 'Reunião', date, parts, decisions || null, notes || null, occurrenceDate || null]);

      const meetingId = meetRes.rows[0].id;

      // Pendências
      if (pendencies?.length) {
        for (const p of pendencies) {
          if (p.description?.trim()) {
            await client.query(
              'INSERT INTO pendencies (event_id, meeting_id, description, responsible, area, deadline) VALUES ($1,$2,$3,$4,$5,$6)',
              [eventId, meetingId, p.description, p.responsible || null, p.area || null, p.deadline || null]
            );
          }
        }
      }

      return meetRes.rows[0];
    });

    await logActivity(db, { userId: req.user.userId, action: `Reunião criada: ${title || 'Reunião'}`, entityType: 'meeting', entityId: result.id });
    res.status(201).json(result);
  } catch (err) {
    console.error('[MEETINGS] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao criar reunião' });
  }
});

// PATCH /api/meetings/pendencies/:id/toggle — só diretor
router.patch('/pendencies/:id/toggle', authorize('diretor'), async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'ID inválido' });
    const result = await db.query(
      'UPDATE pendencies SET done = NOT done WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pendência não encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar pendência' });
  }
});

// DELETE /api/meetings/:id — só diretor
router.delete('/:id', authorize('diretor'), async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'ID inválido' });
    await db.query('DELETE FROM meetings WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir reunião' });
  }
});

module.exports = router;
