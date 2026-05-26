import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { verifyHmac, captureRawBody } from './lib/auth.js';
import { supabase } from './lib/supabase.js';
import { runFinanceiroAgent } from './agents/financeiroAgent.js';
import { startScheduler } from './scheduler.js';

const app = express();
app.use(express.json({ verify: captureRawBody, limit: '512kb' }));
app.use(verifyHmac);

// ── Liveness / readiness ───────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString(), version: '0.1.0' });
});

// ── Dispatch on-demand ────────────────────────────────
// Body: { agent: 'financeiro', triggeredBy?: '<uuid>', config?: {} }
// Resposta: { runId } imediato. O run continua em background.
app.post('/run', async (req: Request, res: Response) => {
  const { agent, triggeredBy, config } = req.body as {
    agent?: string;
    triggeredBy?: string;
    config?: Record<string, unknown>;
  };

  if (!agent) return res.status(400).json({ error: 'agent obrigatório' });

  try {
    if (agent === 'financeiro') {
      // Dispara em background — não bloqueia a resposta
      const promise = runFinanceiroAgent({ triggeredBy: triggeredBy ?? null, config: config ?? {} });

      // Espera só o runId inicial (criado nos primeiros ms do agent)
      const runId = await new Promise<string | null>((resolve) => {
        let resolved = false;
        const t = setTimeout(() => { if (!resolved) { resolved = true; resolve(null); } }, 4000);
        promise.then((r) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(t);
          resolve(r.runId);
        }).catch(() => {
          if (resolved) return;
          resolved = true;
          clearTimeout(t);
          resolve(null);
        });
      });

      // Não aguarda — promise continua rodando
      promise.then((r) => {
        console.log(`[worker] agent=${agent} finalizado: runId=${r.runId} cost=$${r.totalCost?.toFixed(4) ?? '?'} proposals=${r.proposalsCount ?? 0}`);
      }).catch((e) => {
        console.error(`[worker] agent=${agent} ERRO:`, e?.message ?? e);
      });

      return res.json({ status: 'running', runId, agent });
    }

    return res.status(400).json({ error: `Agent desconhecido: ${agent}` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[worker] /run erro:', msg);
    return res.status(500).json({ error: msg });
  }
});

// ── Status de uma run específica ──────────────────────
app.get('/status/:runId', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('agent_runs')
      .select('id, agent_type, status, summary, tokens_input, tokens_output, cost_usd, findings, actions_taken, config, started_at, completed_at')
      .eq('id', req.params.runId)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

// ── Boot ──────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3030;
app.listen(PORT, () => {
  console.log(`[worker] up on :${PORT} — node ${process.version}`);
  if (process.env.ENABLE_SCHEDULER === '1') {
    startScheduler();
  } else {
    console.log('[worker] scheduler desabilitado (ENABLE_SCHEDULER != 1)');
  }
});
