const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { authenticate, authorizeModule } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');
const db = require('../utils/db');
const { sanitizeObj } = require('../utils/sanitize');
const { runSystemAudit } = require('../agents/systemAuditor');
const { runModuleAudit, MODULE_PROMPTS } = require('../agents/moduleAuditor');
const { runDesignAudit } = require('../agents/designAuditor');
const { runFinanceiroExecutor } = require('../agents/financeiroExecutor');
const { applyQueueAction } = require('../agents/tools/financeiroApply');
const crypto = require('crypto');

/**
 * Dispatch via worker remoto (Railway) quando AGENT_WORKER_URL está definido.
 * Caso contrário, retorna null e o caller usa o executor inline (legacy).
 */
async function dispatchToWorker(agent, triggeredBy, config) {
  const url = process.env.AGENT_WORKER_URL;
  const secret = process.env.WORKER_SECRET;
  if (!url || !secret) return null;

  const body = JSON.stringify({ agent, triggeredBy, config });
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${url.replace(/\/$/, '')}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CBRio-Signature': signature },
      body,
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Worker respondeu ${res.status}: ${txt.slice(0, 200)}`);
    }
    return await res.json();
  } catch (e) {
    console.error('[Worker] dispatch erro:', e.message);
    throw e;
  }
}

router.use(authenticate, authorizeModule('agents'));

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
    // Tipos que rodam no worker (Agent SDK + scheduler). Se AGENT_WORKER_URL
    // estiver setado, dispatcha — senão fallback pro executor inline.
    if (agentType === 'agent_executor_financeiro' && process.env.AGENT_WORKER_URL) {
      try {
        const workerResp = await dispatchToWorker('financeiro', req.user.id, config || {});
        return res.json({ runId: workerResp?.runId || null, status: 'running', via: 'worker' });
      } catch (e) {
        return res.status(502).json({ error: `Worker indisponível: ${e.message}` });
      }
    }

    if (agentType === 'system_auditor') {
      runPromise = runSystemAudit(req.user.id, config || {});
    } else if (agentType === 'design_auditor') {
      runPromise = runDesignAudit(req.user.id, config || {});
    } else if (agentType === 'agent_executor_financeiro') {
      runPromise = runFinanceiroExecutor(req.user.id, config || {});
    } else if (agentType.startsWith('module_') && MODULE_PROMPTS[agentType.replace('module_', '')]) {
      runPromise = runModuleAudit(agentType, req.user.id, config || {});
    } else {
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

// GET /api/agents/scores — Score history per module
router.get('/scores', async (req, res) => {
  try {
    const { data, error } = await supabase.from('agent_runs')
      .select('agent_type, config, created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) throw error;

    // Group by agent_type, extract score from config
    const scores = {};
    for (const r of data || []) {
      const score = r.config?.score;
      if (score == null) continue;
      const type = r.agent_type;
      if (!scores[type]) scores[type] = [];
      scores[type].push({ date: r.created_at, score });
    }
    res.json(scores);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/agents/memory/:module — Get agent memories
router.get('/memory/:module', async (req, res) => {
  try {
    const { data, error } = await supabase.from('agent_memory')
      .select('*')
      .eq('module', req.params.module)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json(data);
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

// GET /api/agents/queue — fila de ações pendentes
router.get('/queue', async (req, res) => {
  try {
    const { status, agent, limit } = req.query;
    let query = supabase.from('agent_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Number(limit) || 50);
    if (status) query = query.eq('status', status);
    else query = query.eq('status', 'pending'); // default: só pendentes
    if (agent) query = query.eq('agent', agent);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    console.error('[Queue] GET:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/agents/queue/:id/approve — aprova E aplica a ação real
router.patch('/queue/:id/approve', async (req, res) => {
  try {
    // 1. Lê a row e garante que ainda está 'pending'
    const { data: row, error: readErr } = await supabase.from('agent_queue')
      .select('*').eq('id', req.params.id).single();
    if (readErr) return res.status(404).json({ error: 'Item da fila não encontrado' });
    if (row.status !== 'pending') return res.status(409).json({ error: `Já está ${row.status}` });

    // 2. Aplica a ação real (depende do action_type)
    let applyResult, applyError;
    try {
      const out = await applyQueueAction(row, req.user.id);
      applyResult = out.result;
    } catch (e) {
      applyError = e.message;
    }

    // 3. Atualiza a row com o resultado
    const updatePayload = applyError
      ? { status: 'failed', apply_error: applyError, reviewed_by: req.user.id, reviewed_at: new Date().toISOString() }
      : { status: 'applied', applied_at: new Date().toISOString(), reviewed_by: req.user.id, reviewed_at: new Date().toISOString() };

    const { error: updErr } = await supabase.from('agent_queue').update(updatePayload).eq('id', req.params.id);
    if (updErr) console.error('[Queue] update após apply:', updErr.message);

    if (applyError) return res.status(500).json({ error: applyError, status: 'failed' });
    res.json({ success: true, status: 'applied', result: applyResult });
  } catch (e) {
    console.error('[Queue] approve:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/agents/queue/:id/reject — rejeita sem aplicar
router.patch('/queue/:id/reject', async (req, res) => {
  try {
    const { data: row } = await supabase.from('agent_queue').select('status').eq('id', req.params.id).single();
    if (!row) return res.status(404).json({ error: 'Item da fila não encontrado' });
    if (row.status !== 'pending') return res.status(409).json({ error: `Já está ${row.status}` });

    const { error } = await supabase.from('agent_queue')
      .update({ status: 'rejected', reviewed_by: req.user.id, reviewed_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, status: 'rejected' });
  } catch (e) {
    console.error('[Queue] reject:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/agents/log
router.get('/log', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM agent_log ORDER BY created_at DESC LIMIT 50');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Erro' }); }
});

module.exports = router;
