// ══════════════════════════════════════
// Rotas dos Agentes IA
// API key da Anthropic NUNCA vai pro frontend
// ══════════════════════════════════════

const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { authenticate, authorize } = require('../middleware/auth');
const db = require('../utils/db');
const { sanitizeObj, isValidUUID } = require('../utils/sanitize');

// Só diretor pode usar agentes
router.use(authenticate, authorize('diretor'));

// Rate limit para IA: 10 req/15min
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AI_RATE_LIMIT_MAX) || 10,
  message: { error: 'Limite de uso da IA atingido. Aguarde 15 minutos.' },
});

// Helper: chamar Anthropic API (server-side, key protegida)
const callAnthropic = async (prompt) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada');

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!resp.ok) {
    throw new Error(`Anthropic API: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  return data.content?.map(c => c.text || '').join('') || '';
};

// POST /api/agents/transcribe
router.post('/transcribe', aiLimiter, async (req, res) => {
  try {
    const { eventId, transcript } = sanitizeObj(req.body);
    if (!eventId || !transcript) {
      return res.status(400).json({ error: 'eventId e transcript obrigatórios' });
    }
    if (!isValidUUID(eventId)) return res.status(400).json({ error: 'eventId inválido' });

    // Buscar nome do evento
    const evResult = await db.query('SELECT name FROM events WHERE id = $1', [eventId]);
    if (evResult.rows.length === 0) return res.status(404).json({ error: 'Evento não encontrado' });
    const evName = evResult.rows[0].name;

    const prompt = `Agente PMO. Evento: ${evName}. Transcrição:\n${transcript}\n\nExtraia em JSON puro:\n{"title":"","date":"${new Date().toISOString().slice(0, 10)}","participants":[],"decisions":"","notes":"","pendencies":[{"description":"","responsible":"","area":""}],"taskSuggestions":[{"name":"","responsible":"","area":"","priority":"media"}]}\nSó JSON, sem markdown.`;

    const rawResponse = await callAnthropic(prompt);

    // Parse com validação
    let parsed;
    try {
      parsed = JSON.parse(rawResponse.replace(/```json|```/g, '').trim());
    } catch {
      return res.status(422).json({ error: 'Resposta da IA não é JSON válido', raw: rawResponse.slice(0, 200) });
    }

    // Validar schema mínimo
    if (!parsed.title && !parsed.decisions && !parsed.taskSuggestions) {
      return res.status(422).json({ error: 'Resposta da IA não contém dados úteis' });
    }

    // Salvar na fila de aprovação
    const items = [];

    // Reunião
    const queueRes = await db.query(
      `INSERT INTO agent_queue (agent, type, status, event_id, label, preview, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      ['transcriber', 'meeting', 'pending', eventId,
       `Reunião: ${parsed.title || 'Sem título'}`,
       `${parsed.participants?.length || 0} participantes`,
       JSON.stringify(parsed)]
    );
    items.push(queueRes.rows[0]);

    // Sugestões de tarefas
    for (const ts of (parsed.taskSuggestions || [])) {
      const tsRes = await db.query(
        `INSERT INTO agent_queue (agent, type, status, event_id, label, preview, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        ['transcriber', 'task', 'pending', eventId,
         `Tarefa: ${ts.name}`, ts.responsible || '',
         JSON.stringify(ts)]
      );
      items.push(tsRes.rows[0]);
    }

    // Log
    await db.query(
      'INSERT INTO agent_log (agent, action, event_name) VALUES ($1,$2,$3)',
      ['transcriber', `Processou transcrição → ${items.length} itens`, evName]
    );

    res.json({ items, parsed });
  } catch (err) {
    console.error('[AGENTS] Erro transcrição:', err.message);
    res.status(500).json({ error: 'Erro ao processar transcrição' });
  }
});

// POST /api/agents/monitor — varredura de riscos
router.post('/monitor', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.*, e.name as event_name, e.date as event_date
      FROM tasks t JOIN events e ON e.id = t.event_id
      WHERE t.status != 'concluida' AND t.deadline IS NOT NULL
      ORDER BY t.deadline ASC
    `);

    const alerts = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const t of result.rows) {
      const deadline = new Date(t.deadline);
      const days = Math.ceil((deadline - today) / 86400000);

      if (days >= 0 && days <= 3) {
        alerts.push({ severity: 'urgente', message: `${t.name} vence em ${days}d — ${t.responsible || '?'} (${t.event_name})` });
      }
      if (days <= -1) {
        alerts.push({ severity: 'critico', message: `${t.name} ATRASADA ${Math.abs(days)}d — ${t.responsible || '?'} (${t.event_name})` });
      }
    }

    await db.query(
      'INSERT INTO agent_log (agent, action) VALUES ($1,$2)',
      ['monitor', `Varredura → ${alerts.length} alertas`]
    );

    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: 'Erro na varredura' });
  }
});

// POST /api/agents/generate-report — gerar relatório
router.post('/generate-report', aiLimiter, async (req, res) => {
  try {
    const eventsResult = await db.query(`
      SELECT e.name, e.date, e.status,
        (SELECT COUNT(*) FROM tasks t WHERE t.event_id = e.id) as tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.event_id = e.id AND t.status = 'concluida') as done
      FROM events e WHERE e.status != 'concluido'
      ORDER BY e.date ASC LIMIT 15
    `);

    const evData = eventsResult.rows.map(e =>
      `- ${e.name} (${e.date}, ${e.status}) Tarefas: ${e.tasks}, ${e.done} ok`
    ).join('\n');

    const prompt = `PMO CBRio. Relatório semanal. ${new Date().toLocaleDateString('pt-BR')}\n\nEVENTOS:\n${evData || 'Nenhum.'}\n\n1.RESUMO 2.DESTAQUES 3.BLOQUEIOS 4.AVANÇOS 5.PENDÊNCIAS 6.ENTREGAS 7.GESTOR\n\nCorporativo, direto. PT-BR.`;

    const report = await callAnthropic(prompt);
    res.json({ report });
  } catch (err) {
    console.error('[AGENTS] Erro relatório:', err.message);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

// PATCH /api/agents/queue/:id/approve — aprovar item da fila
router.patch('/queue/:id/approve', async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'ID inválido' });

    const item = await db.query('SELECT * FROM agent_queue WHERE id = $1', [req.params.id]);
    if (item.rows.length === 0) return res.status(404).json({ error: 'Item não encontrado' });

    const q = item.rows[0];
    const payload = q.payload;

    // Aplicar no sistema conforme tipo
    if (q.type === 'meeting') {
      const parts = payload.participants || [];
      const meetRes = await db.query(
        'INSERT INTO meetings (event_id, title, date, participants, decisions, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [q.event_id, payload.title, payload.date, parts, payload.decisions, payload.notes]
      );
      // Pendências
      for (const p of (payload.pendencies || [])) {
        if (p.description) {
          await db.query(
            'INSERT INTO pendencies (event_id, meeting_id, description, responsible, area) VALUES ($1,$2,$3,$4,$5)',
            [q.event_id, meetRes.rows[0].id, p.description, p.responsible, p.area]
          );
        }
      }
    } else if (q.type === 'task') {
      await db.query(
        'INSERT INTO tasks (event_id, name, responsible, area, priority, status) VALUES ($1,$2,$3,$4,$5,$6)',
        [q.event_id, payload.name, payload.responsible, payload.area, payload.priority || 'media', 'pendente']
      );
    }

    // Marcar como aprovado
    await db.query(
      'UPDATE agent_queue SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3',
      ['approved', req.user.userId, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[AGENTS] Erro aprovação:', err.message);
    res.status(500).json({ error: 'Erro ao aprovar' });
  }
});

// PATCH /api/agents/queue/:id/reject
router.patch('/queue/:id/reject', async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'ID inválido' });
    await db.query(
      'UPDATE agent_queue SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3',
      ['rejected', req.user.userId, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao rejeitar' });
  }
});

// GET /api/agents/queue — fila pendente
router.get('/queue', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM agent_queue WHERE status = $1 ORDER BY created_at DESC LIMIT 20',
      ['pending']
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar fila' });
  }
});

module.exports = router;
