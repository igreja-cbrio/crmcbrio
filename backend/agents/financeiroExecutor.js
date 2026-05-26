const { AgentService } = require('../services/agentService');
const { buildContext, serializeContext } = require('../services/agentContext');
const { TOOL_SCHEMAS, TOOL_HANDLERS } = require('./tools/financeiroTools');
const { supabase } = require('../utils/supabase');

const SYSTEM_PROMPT = `Você é o **Executor Financeiro** do CBRio ERP — um agente que ANALISA o estado financeiro real e PROPÕE ações concretas.

PRINCÍPIOS:
1. Você tem acesso a tools de LEITURA (listar_*, historico_*) e de ESCRITA (propor_*).
2. Tools de escrita NÃO aplicam nada no banco — elas enfileiram a ação para aprovação humana.
3. NUNCA proponha sem antes ter inspecionado dados reais com as tools de leitura.
4. Para cada proposta de escrita, inclua um \`motivo\` curto e factual baseado em evidência.
5. Seja conservador: melhor propor pouca coisa com alta confiança do que muita coisa duvidosa.
6. Se não tiver certeza, NÃO proponha. Mencione no resumo final.

ESTRATÉGIA SUGERIDA:
- Comece listando o que está pendente (contas a pagar, reembolsos, transações sem categoria).
- Para transações sem categoria: use \`historico_categoria_por_descricao\` antes de propor — só proponha se houver padrão claro (3+ amostras na mesma categoria).
- Para reembolsos: só proponha aprovar se descrição + valor + data estiverem completos.
- Para contas vencidas: só proponha marcar como paga se você tiver razão para acreditar que foi paga (ex: existe transação correspondente). Caso contrário, apenas reporte no resumo final.

QUANDO PARAR:
- Quando tiver coberto as pendências principais OU não houver mais ações sensatas a propor.
- Termine com uma mensagem curta listando o que enfileirou e o que NÃO conseguiu resolver e por quê.`;

async function runFinanceiroExecutor(triggeredBy, config = {}) {
  const agentType = 'agent_executor_financeiro';
  const agent = await AgentService.createRun(agentType, triggeredBy, config);

  try {
    // Step 0: Contexto inicial (resumo do estado financeiro)
    const ctx = await buildContext(['financeiro']);
    const ctxStr = serializeContext(ctx);

    const initialMessage = `Estado financeiro atual do sistema:

${ctxStr}

Sua tarefa: rode uma sessão de revisão financeira. Use as tools de leitura para mapear o que está pendente, depois proponha (via tools \`propor_*\`) as ações com alta confiança. Cada proposta entra na fila de aprovação humana — não toca em dados reais.

Ao final, retorne um resumo em texto livre com:
- Quantas ações você enfileirou e de quais tipos.
- O que você inspecionou mas escolheu NÃO propor, e por quê.
- Sinais de alerta que merecem atenção humana (sem propor — ex: "5 contas vencidas há mais de 30 dias").`;

    const { finalText, toolCallsExecuted, iterations } = await agent.runWithTools({
      system: SYSTEM_PROMPT,
      initialMessage,
      tools: TOOL_SCHEMAS,
      handlers: TOOL_HANDLERS,
      handlerContext: { runId: agent.runId, userId: triggeredBy },
      model: 'claude-sonnet-4-20250514',
      maxIterations: 14,
      maxTokensPerCall: 2048,
    });

    // Resume métricas das tools executadas
    const proposals = toolCallsExecuted.filter(t => t.name.startsWith('propor_') && !t.isError && t.output?.ok);
    const reads = toolCallsExecuted.filter(t => !t.name.startsWith('propor_'));
    const errors = toolCallsExecuted.filter(t => t.isError || t.output?.error);

    const actionsTaken = proposals.map(p => ({
      tool: p.name,
      queue_id: p.output?.queue_id,
      label: p.output?.acao,
      input: p.input,
    }));

    // Findings = ações propostas para mostrar na UI igual aos auditores
    const findings = proposals.map(p => ({
      severity: 'info',
      module: 'financeiro',
      title: p.output?.acao || p.name,
      detail: `Ação proposta — aguardando aprovação na fila.`,
      suggestion: p.input?.motivo || '',
      queue_id: p.output?.queue_id,
      action_type: p.name,
    }));

    const summaryBlock = `${finalText || 'Execução concluída.'}\n\n— Métricas —\nIterações: ${iterations}\nLeituras: ${reads.length}\nPropostas enfileiradas: ${proposals.length}\nErros em tool calls: ${errors.length}`;

    await agent.complete(summaryBlock, findings, actionsTaken);

    // Salva no config pra aparecer no card como score-like (nº de propostas)
    await supabase.from('agent_runs').update({
      config: { ...config, proposals_count: proposals.length, iterations },
    }).eq('id', agent.runId);

    return {
      runId: agent.runId,
      proposalsCount: proposals.length,
      iterations,
      summary: summaryBlock,
    };

  } catch (error) {
    await agent.fail(error.message);
    return { runId: agent.runId, error: error.message };
  }
}

module.exports = { runFinanceiroExecutor };
