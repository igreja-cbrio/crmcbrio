const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { authenticate, authorize } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');
const db = require('../utils/db');
const { sanitizeObj } = require('../utils/sanitize');
const { runSystemAudit } = require('../agents/systemAuditor');

router.use(authenticate, authorize('admin', 'diretor'));

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AI_RATE_LIMIT_MAX) || 10,
  message: { error: 'Limite de uso da IA atingido. Aguarde 15 minutos.' }
});

// ═══════════════════════════════════════════════════════════
// Novo: Framework de Agentes
// ═══════════════════════════════════════════════════════════

// POST /api/agents/run — Iniciar execução de agente
router.post('/run', aiLimiter, async (req, res) => {
  try {
    const { agentType, config } = req.body;
    if (!agentType) return res.status(400).json({ error: 'agentType obrigatório' });

    // Dispara o agente assincronamente
    let runPromise;
    switch (agentType) {
      case 'system_auditor':
        runPromise = runSystemAudit(req.user.id, config || {});
        break;
      default:
        return res.status(400).json({ error: `Tipo de agente desconhecido: ${agentType}` });
    }

    // Não aguarda — retorna imediatamente
    runPromise.then(result => {
      console.log(`[Agent] ${agentType} concluído: run=${result.runId}`);
    }).catch(err => {
      console.error(`[Agent] ${agentType} erro:`, err.message);
    });

    // Buscar o runId que foi criado
    const { data: latestRun } = await supabase.from('agent_runs')
      .select('id')
      .eq('agent_type', agentType)
      .eq('triggered_by', req.user.id)
      .eq('status', 'running')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    res.json({ runId: latestRun?.id, status: 'running' });
  } catch (e) {
    console.error('[Agent] Erro ao iniciar:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/agents/runs — Listar execuções
router.get('/runs', async (req, res) => {
  try {
    let query = supabase.from('agent_runs')
      .select('id, agent_type, status, triggered_by, tokens_input, tokens_output, cost_usd, summary, started_at, completed_at, created_at, config, findings')
      .order('created_at', { ascending: false })
      .limit(50);

    if (req.query.agent_type) query = query.eq('agent_type', req.query.agent_type);
    if (req.query.status) query = query.eq('status', req.query.status);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/agents/runs/:id — Detalhe de uma execução
router.get('/runs/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('agent_runs')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/agents/runs/:id/steps — Steps de uma execução
router.get('/runs/:id/steps', async (req, res) => {
  try {
    const { data, error } = await supabase.from('agent_steps')
      .select('*')
      .eq('run_id', req.params.id)
      .order('step_number');
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/agents/runs/:id/cancel — Cancelar execução
router.post('/runs/:id/cancel', async (req, res) => {
  try {
    const { error } = await supabase.from('agent_runs')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('status', 'running');
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/agents/stats — Estatísticas de uso
router.get('/stats', async (req, res) => {
  try {
    const { data: runs } = await supabase.from('agent_runs')
      .select('agent_type, status, tokens_input, tokens_output, cost_usd')
      .order('created_at', { ascending: false })
      .limit(100);

    const stats = { totalRuns: 0, totalCost: 0, totalTokens: 0, byType: {}, byStatus: {} };
    for (const r of runs || []) {
      stats.totalRuns++;
      stats.totalCost += Number(r.cost_usd || 0);
      stats.totalTokens += (r.tokens_input || 0) + (r.tokens_output || 0);
      stats.byType[r.agent_type] = (stats.byType[r.agent_type] || 0) + 1;
      stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1;
    }
    stats.totalCost = Math.round(stats.totalCost * 1000000) / 1000000;

    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// Legacy: endpoints existentes
// ═══════════════════════════════════════════════════════════

// POST /api/agents/generate — proxy simples para Anthropic
router.post('/generate', aiLimiter, async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'API da Anthropic não configurada' });

    const { prompt, agent, context } = sanitizeObj(req.body);
    if (!prompt) return res.status(400).json({ error: 'Prompt obrigatório' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `Você é um assistente do PMO da CBRio (igreja). Responda em português. Contexto: ${context || 'gestão de projetos e eventos'}`,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || 'Sem resposta';

    try {
      await db.query('INSERT INTO agent_log (agent, action, details) VALUES ($1,$2,$3)',
        [agent || 'general', `Gerou resposta: ${prompt.slice(0, 100)}`, JSON.stringify({ prompt_length: prompt.length })]);
    } catch { /* log failure is not critical */ }

    res.json({ text, usage: data.usage });
  } catch (e) {
    console.error('[AGENTS] Erro:', e.message);
    res.status(500).json({ error: 'Erro ao chamar IA' });
  }
});

// GET /api/agents/queue
router.get('/queue', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM agent_queue WHERE status = $1 ORDER BY created_at DESC LIMIT 20', ['pending']);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Erro' }); }
});

// PATCH /api/agents/queue/:id/approve
router.patch('/queue/:id/approve', async (req, res) => {
  try {
    await db.query('UPDATE agent_queue SET status=$1, reviewed_by=$2, reviewed_at=NOW() WHERE id=$3', ['approved', req.user.userId, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro' }); }
});

// PATCH /api/agents/queue/:id/reject
router.patch('/queue/:id/reject', async (req, res) => {
  try {
    await db.query('UPDATE agent_queue SET status=$1, reviewed_by=$2, reviewed_at=NOW() WHERE id=$3', ['rejected', req.user.userId, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro' }); }
});

// GET /api/agents/log
router.get('/log', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM agent_log ORDER BY created_at DESC LIMIT 50');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Erro' }); }
});

module.exports = router;
