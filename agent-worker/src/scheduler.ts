import cron from 'node-cron';
import { supabase } from './lib/supabase.js';
import { runFinanceiroAgent } from './agents/financeiroAgent.js';

const TZ = process.env.CRON_TZ || 'America/Sao_Paulo';

/**
 * Agendamentos:
 *  - Financeiro: 9h, 14h, 19h (horário de Brasília)
 *
 * Lock simples: antes de disparar, checa se já tem run 'running' do mesmo
 * agent_type. Se tiver, pula — evita duplo trigger se o anterior demorou.
 */

async function withLock(agentType: string, fn: () => Promise<void>) {
  const { data: running } = await supabase
    .from('agent_runs')
    .select('id, started_at')
    .eq('agent_type', agentType)
    .eq('status', 'running')
    .limit(1);

  if (running && running.length > 0) {
    console.log(`[scheduler] skip ${agentType} — já tem run em andamento (id=${running[0].id})`);
    return;
  }

  await fn();
}

export function startScheduler() {
  console.log(`[scheduler] iniciando — TZ=${TZ}`);

  // Financeiro: 9h, 14h, 19h
  cron.schedule('0 9,14,19 * * *', async () => {
    console.log('[scheduler] disparando financeiro_executor');
    try {
      await withLock('agent_executor_financeiro', async () => {
        const r = await runFinanceiroAgent({ triggeredBy: null, config: { trigger: 'cron' } });
        console.log(`[scheduler] financeiro done: runId=${r.runId} cost=$${r.totalCost.toFixed(4)} proposals=${r.proposalsCount}`);
      });
    } catch (e) {
      console.error('[scheduler] financeiro erro:', e instanceof Error ? e.message : e);
    }
  }, { timezone: TZ });

  console.log('[scheduler] jobs registrados: financeiro (cron "0 9,14,19 * * *")');
}
