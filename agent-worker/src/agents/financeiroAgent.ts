import { query } from '@anthropic-ai/claude-agent-sdk';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { supabase } from '../lib/supabase.js';
import { buildFinanceiroServer, FINANCEIRO_ALLOWED_TOOLS } from '../tools/financeiroTools.js';

// Resolve caminho da SKILL.md em build (dist/) e em dev (src/)
const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = join(__dirname, '..', '..', 'skills', 'financeiro-cbrio', 'SKILL.md');
let SKILL_CONTENT: string;
try {
  SKILL_CONTENT = readFileSync(SKILL_PATH, 'utf8');
} catch (e) {
  console.warn('[financeiroAgent] SKILL.md não encontrada em', SKILL_PATH, '— prosseguindo sem ela');
  SKILL_CONTENT = '';
}

// ─── Pricing (USD por milhão de tokens) — alinhado ao backend Vercel ───
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4 },
};

export interface RunResult {
  runId: string;
  totalCost: number;
  totalTokensIn: number;
  totalTokensOut: number;
  proposalsCount: number;
  iterations: number;
  summary: string;
  error?: string;
}

export async function runFinanceiroAgent(opts: {
  triggeredBy?: string | null;
  config?: Record<string, unknown>;
}): Promise<RunResult> {
  const triggeredBy = opts.triggeredBy ?? null;
  const config = opts.config ?? {};

  // 1. Cria run em agent_runs
  const { data: runRow, error: runErr } = await supabase
    .from('agent_runs')
    .insert({
      agent_type: 'agent_executor_financeiro',
      status: 'running',
      triggered_by: triggeredBy,
      config: { ...config, sdk: 'agent_sdk_v1' },
    })
    .select()
    .single();
  if (runErr) throw new Error(`Não consegui criar agent_run: ${runErr.message}`);
  const runId: string = runRow.id;

  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let totalCost = 0;
  let stepNumber = 0;
  let proposalsCount = 0;
  let iterations = 0;
  let lastResultText = '';

  try {
    const mcpServer = buildFinanceiroServer(runId);

    const systemPrompt = [
      SKILL_CONTENT,
      '',
      '## Contexto desta execução',
      `Data/hora: ${new Date().toISOString()}`,
      `Run ID: ${runId}`,
      'Você está em uma execução autônoma agendada. Não há humano disponível para responder perguntas — tome decisões baseadas em dados, ou registre a indecisão na resposta final.',
    ].join('\n');

    const initialPrompt = `Conduza uma sessão de revisão financeira do CBRio. Siga a estratégia descrita na skill. Termine com um resumo em texto livre.`;

    const iter = query({
      prompt: initialPrompt,
      options: {
        mcpServers: { cbrio_financeiro: mcpServer },
        allowedTools: FINANCEIRO_ALLOWED_TOOLS,
        // tools: [] → remove todos os builtins (Read/Write/Bash/etc).
        // Só nossas tools custom ficam disponíveis.
        tools: [],
        systemPrompt: { type: 'preset', preset: 'claude_code', append: systemPrompt },
        settingSources: [],
        permissionMode: 'bypassPermissions',
        model: 'claude-sonnet-4-5',
        maxTurns: 25,
      },
    });

    for await (const msg of iter) {
      // ─ Mensagens da assistente (com tool calls + texto) ────
      if (msg.type === 'assistant') {
        iterations++;
        const assistantMsg = msg.message;
        const blocks = assistantMsg?.content ?? [];
        const usage = assistantMsg?.usage;
        const model = assistantMsg?.model ?? 'claude-sonnet-4-5';

        const tokIn = usage?.input_tokens ?? 0;
        const tokOut = usage?.output_tokens ?? 0;
        const pricing = PRICING[model] ?? PRICING['claude-sonnet-4-5'];
        const stepCost = (tokIn * pricing.input + tokOut * pricing.output) / 1_000_000;

        totalTokensIn += tokIn;
        totalTokensOut += tokOut;
        totalCost += stepCost;

        const textBlock = blocks.find((b: { type?: string }) => b.type === 'text') as { text?: string } | undefined;
        const toolUses = blocks.filter((b: { type?: string }) => b.type === 'tool_use') as Array<{ id: string; name: string; input: unknown }>;

        for (const tu of toolUses) {
          if (typeof tu.name === 'string' && tu.name.includes('__propor_')) proposalsCount++;
        }

        if (textBlock?.text) lastResultText = textBlock.text;

        stepNumber++;
        await supabase.from('agent_steps').insert({
          run_id: runId,
          step_number: stepNumber,
          model,
          role: toolUses.length ? 'tool_iter' : 'assistant',
          tokens_input: tokIn,
          tokens_output: tokOut,
          cost_usd: stepCost,
          response_text: textBlock?.text?.slice(0, 10000) ?? null,
          tool_calls: toolUses.map((t) => ({ id: t.id, name: t.name, input: t.input })),
          duration_ms: null,
        });
      }

      // ─ Mensagem final (ResultMessage) ──────────────────────
      else if (msg.type === 'result') {
        if (msg.subtype === 'success') {
          lastResultText = (msg as { result?: string }).result ?? lastResultText;
        } else {
          throw new Error(`Agent SDK retornou erro: ${msg.subtype}`);
        }
      }
    }

    // 2. Finaliza run com sucesso
    const summaryBlock = `${lastResultText}\n\n— Métricas —\nIterações: ${iterations}\nPropostas enfileiradas: ${proposalsCount}\nTokens: ${totalTokensIn} in / ${totalTokensOut} out\nCusto: $${totalCost.toFixed(4)}`;

    await supabase.from('agent_runs').update({
      status: 'completed',
      summary: summaryBlock,
      tokens_input: totalTokensIn,
      tokens_output: totalTokensOut,
      cost_usd: totalCost,
      config: { ...config, sdk: 'agent_sdk_v1', proposals_count: proposalsCount, iterations },
      completed_at: new Date().toISOString(),
    }).eq('id', runId);

    return { runId, totalCost, totalTokensIn, totalTokensOut, proposalsCount, iterations, summary: summaryBlock };

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[financeiroAgent] erro:', msg);
    await supabase.from('agent_runs').update({
      status: 'failed',
      error: msg,
      tokens_input: totalTokensIn,
      tokens_output: totalTokensOut,
      cost_usd: totalCost,
      completed_at: new Date().toISOString(),
    }).eq('id', runId);

    return { runId, totalCost, totalTokensIn, totalTokensOut, proposalsCount, iterations, summary: '', error: msg };
  }
}
