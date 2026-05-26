import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';

/**
 * MCP in-process com tools financeiras do CBRio.
 *
 * Convenção:
 *  - LEITURA (listar_*, historico_*, buscar_*) executa direto.
 *  - ESCRITA (propor_*) enfileira em agent_queue com status='pending'.
 *    NUNCA toca em tabela de negócio — quem aplica é o /approve no
 *    backend Vercel via applyQueueAction.
 *  - APRENDIZADO (lembrar_*) escreve em agent_memory pra runs futuras lerem.
 *
 * Cada chamada recebe `runId` via closure (`buildFinanceiroServer(runId)`).
 */

type Json = Record<string, unknown> | unknown[];

function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function jsonResult(data: Json) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(text: string) {
  return { content: [{ type: 'text' as const, text }], isError: true };
}

export function buildFinanceiroServer(runId: string) {
  // ─── LEITURA ──────────────────────────────────────────────

  const listarContasPagarPendentes = tool(
    'listar_contas_pagar_pendentes',
    'Lista contas a pagar com status pendente, ordenadas por data de vencimento. Use para identificar pagamentos vencidos ou próximos.',
    {
      limit: z.number().int().min(1).max(100).default(50),
      somente_vencidas: z.boolean().default(false).describe('Se true, retorna só vencidas (data_vencimento < hoje).'),
    },
    async (args) => {
      const hoje = new Date().toISOString().slice(0, 10);
      let q = supabase
        .from('fin_contas_pagar')
        .select('id, descricao, fornecedor, valor, data_vencimento, conta_id, categoria_id, status')
        .eq('status', 'pendente')
        .order('data_vencimento', { ascending: true })
        .limit(args.limit);
      if (args.somente_vencidas) q = q.lt('data_vencimento', hoje);
      const { data, error } = await q;
      if (error) return errorResult(`Erro: ${error.message}`);
      return jsonResult({ hoje, total: data.length, items: data });
    },
    { annotations: { readOnlyHint: true } },
  );

  const listarReembolsosPendentes = tool(
    'listar_reembolsos_pendentes',
    'Lista reembolsos com status pendente aguardando decisão.',
    { limit: z.number().int().min(1).max(100).default(50) },
    async (args) => {
      const { data, error } = await supabase
        .from('fin_reembolsos')
        .select('id, descricao, valor, data_despesa, solicitante_id, categoria_id, observacoes, created_at')
        .eq('status', 'pendente')
        .order('created_at', { ascending: true })
        .limit(args.limit);
      if (error) return errorResult(`Erro: ${error.message}`);
      return jsonResult({ total: data.length, items: data });
    },
    { annotations: { readOnlyHint: true } },
  );

  const listarTransacoesSemCategoria = tool(
    'listar_transacoes_sem_categoria',
    'Lista transações financeiras sem categoria atribuída. Use junto com historico_categoria_por_descricao antes de propor categorização.',
    { limit: z.number().int().min(1).max(100).default(30) },
    async (args) => {
      const { data, error } = await supabase
        .from('fin_transacoes')
        .select('id, descricao, valor, tipo, data_competencia, conta_id')
        .is('categoria_id', null)
        .neq('status', 'cancelado')
        .order('data_competencia', { ascending: false })
        .limit(args.limit);
      if (error) return errorResult(`Erro: ${error.message}`);
      return jsonResult({ total: data.length, items: data });
    },
    { annotations: { readOnlyHint: true } },
  );

  const listarCategorias = tool(
    'listar_categorias',
    'Lista categorias financeiras disponíveis (receita ou despesa). Use para escolher categoria_id antes de propor categorização.',
    { tipo: z.enum(['receita', 'despesa']).optional() },
    async (args) => {
      let q = supabase.from('fin_categorias').select('id, nome, tipo, pai_id').order('tipo').order('nome');
      if (args.tipo) q = q.eq('tipo', args.tipo);
      const { data, error } = await q;
      if (error) return errorResult(`Erro: ${error.message}`);
      return jsonResult({ total: data.length, items: data });
    },
    { annotations: { readOnlyHint: true } },
  );

  const historicoCategoriaPorDescricao = tool(
    'historico_categoria_por_descricao',
    'Dada uma descrição (ou substring), retorna ranking das categorias mais usadas em transações passadas com descrição parecida. SEMPRE consulte antes de propor categorização — só proponha quando houver 3+ amostras na mesma categoria.',
    { descricao: z.string().min(2).describe('Texto da descrição ou parte dele.') },
    async (args) => {
      const { data, error } = await supabase
        .from('fin_transacoes')
        .select('descricao, categoria_id, fin_categorias(nome, tipo)')
        .ilike('descricao', `%${args.descricao}%`)
        .not('categoria_id', 'is', null)
        .limit(100);
      if (error) return errorResult(`Erro: ${error.message}`);

      const counts = new Map<string, { categoria_id: string; nome: string | null; tipo: string | null; count: number }>();
      for (const t of data ?? []) {
        const k = t.categoria_id as string;
        const cur = counts.get(k) ?? {
          categoria_id: k,
          nome: ((t as { fin_categorias?: { nome?: string | null } }).fin_categorias?.nome) ?? null,
          tipo: ((t as { fin_categorias?: { tipo?: string | null } }).fin_categorias?.tipo) ?? null,
          count: 0,
        };
        cur.count++;
        counts.set(k, cur);
      }
      const ranking = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
      return jsonResult({ amostras: data?.length ?? 0, ranking });
    },
    { annotations: { readOnlyHint: true } },
  );

  const listarContasBancarias = tool(
    'listar_contas_bancarias',
    'Lista contas bancárias ativas com saldo.',
    {},
    async () => {
      const { data, error } = await supabase
        .from('fin_contas')
        .select('id, nome, banco, tipo, saldo, ativa')
        .eq('ativa', true)
        .order('nome');
      if (error) return errorResult(`Erro: ${error.message}`);
      return jsonResult({ items: data });
    },
    { annotations: { readOnlyHint: true } },
  );

  // ─── ESCRITA (enfileira em agent_queue) ──────────────────

  async function enqueue(input: {
    actionType: string;
    actionLabel: string;
    reasoning: string;
    payload: Record<string, unknown>;
  }) {
    const { data, error } = await supabase
      .from('agent_queue')
      .insert({
        run_id: runId,
        agent: 'agent_executor_financeiro',
        action: input.actionLabel,
        action_type: input.actionType,
        action_label: input.actionLabel,
        payload: input.payload,
        reasoning: input.reasoning,
        status: 'pending',
        details: JSON.stringify(input),
      })
      .select()
      .single();
    if (error) return { error: error.message };
    return { ok: true, queue_id: data.id };
  }

  const proporCategorizar = tool(
    'propor_categorizar_transacao',
    'Propõe categoria pra uma transação sem categoria. NÃO aplica no banco — entra em fila de aprovação humana. Só use com 3+ amostras na mesma categoria no histórico.',
    {
      transacao_id: z.string().uuid(),
      categoria_id: z.string().uuid(),
      motivo: z.string().min(10).describe('Justificativa baseada em evidências do histórico.'),
    },
    async (args) => {
      const [{ data: tx }, { data: cat }] = await Promise.all([
        supabase.from('fin_transacoes').select('descricao, valor, tipo, categoria_id').eq('id', args.transacao_id).single(),
        supabase.from('fin_categorias').select('nome').eq('id', args.categoria_id).single(),
      ]);
      if (!tx) return errorResult('Transação não encontrada.');
      if (tx.categoria_id) return errorResult('Transação já tem categoria — pule.');
      if (!cat) return errorResult('Categoria não encontrada.');

      const r = await enqueue({
        actionType: 'fin.categorize_transaction',
        actionLabel: `Categorizar "${tx.descricao}" como "${cat.nome}"`,
        reasoning: args.motivo,
        payload: {
          transacao_id: args.transacao_id,
          categoria_id: args.categoria_id,
          snapshot: { descricao: tx.descricao, valor: tx.valor, tipo: tx.tipo, categoria_nome: cat.nome },
        },
      });
      return 'error' in r ? errorResult(`Falha ao enfileirar: ${r.error}`) : jsonResult(r);
    },
  );

  const proporMarcarPaga = tool(
    'propor_marcar_conta_paga',
    'Propõe marcar uma conta a pagar como paga. NÃO aplica — entra na fila. Use só com evidência clara (ex: vencida + transação correspondente identificada).',
    {
      conta_pagar_id: z.string().uuid(),
      data_pagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
      motivo: z.string().min(10),
    },
    async (args) => {
      const { data: cp } = await supabase.from('fin_contas_pagar')
        .select('descricao, fornecedor, valor, data_vencimento, status').eq('id', args.conta_pagar_id).single();
      if (!cp) return errorResult('Conta a pagar não encontrada.');
      if (cp.status === 'pago') return errorResult('Conta já está paga.');

      const r = await enqueue({
        actionType: 'fin.mark_payable_paid',
        actionLabel: `Marcar como paga: ${cp.descricao} (R$ ${Number(cp.valor).toFixed(2)})`,
        reasoning: args.motivo,
        payload: {
          conta_pagar_id: args.conta_pagar_id,
          data_pagamento: args.data_pagamento,
          snapshot: { descricao: cp.descricao, fornecedor: cp.fornecedor, valor: cp.valor, data_vencimento: cp.data_vencimento },
        },
      });
      return 'error' in r ? errorResult(`Falha ao enfileirar: ${r.error}`) : jsonResult(r);
    },
  );

  const proporDecidirReembolso = tool(
    'propor_aprovar_reembolso',
    'Propõe aprovar ou rejeitar um reembolso pendente. NÃO aplica — entra na fila. Só use se descrição, valor e data estiverem completos e dentro do padrão.',
    {
      reembolso_id: z.string().uuid(),
      decisao: z.enum(['aprovado', 'rejeitado']),
      motivo: z.string().min(10),
    },
    async (args) => {
      const { data: r0 } = await supabase.from('fin_reembolsos')
        .select('descricao, valor, status, solicitante_id').eq('id', args.reembolso_id).single();
      if (!r0) return errorResult('Reembolso não encontrado.');
      if (r0.status !== 'pendente') return errorResult(`Reembolso já está ${r0.status}.`);

      const r = await enqueue({
        actionType: 'fin.reimbursement_decision',
        actionLabel: `${args.decisao === 'aprovado' ? 'Aprovar' : 'Rejeitar'} reembolso: ${r0.descricao} (R$ ${Number(r0.valor).toFixed(2)})`,
        reasoning: args.motivo,
        payload: {
          reembolso_id: args.reembolso_id,
          decisao: args.decisao,
          snapshot: { descricao: r0.descricao, valor: r0.valor },
        },
      });
      return 'error' in r ? errorResult(`Falha ao enfileirar: ${r.error}`) : jsonResult(r);
    },
  );

  // ─── APRENDIZADO ─────────────────────────────────────────

  const lembrarAprendizado = tool(
    'lembrar_aprendizado',
    'Salva um aprendizado em memória persistente — runs futuras vão ler isto antes de agir. Use para registrar padrões observados (ex: "Pagamentos da Energisa caem dia 10 do mês").',
    {
      chave: z.string().min(3).max(80).describe('Identificador curto (kebab-case).'),
      valor: z.string().min(5).max(2000).describe('O aprendizado em texto livre.'),
    },
    async (args) => {
      const { error } = await supabase.from('agent_memory').upsert({
        agent_type: 'agent_executor_financeiro',
        module: 'financeiro',
        key: args.chave,
        value: args.valor,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'agent_type,module,key' });
      if (error) return errorResult(`Erro ao gravar memória: ${error.message}`);
      return textResult(`Memória "${args.chave}" salva.`);
    },
  );

  const lerMemorias = tool(
    'ler_memorias',
    'Lê todos os aprendizados acumulados de execuções anteriores. Chame UMA vez no início da run, antes de tomar decisões.',
    {},
    async () => {
      const { data, error } = await supabase
        .from('agent_memory')
        .select('key, value, updated_at')
        .eq('agent_type', 'agent_executor_financeiro')
        .eq('module', 'financeiro')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) return errorResult(`Erro: ${error.message}`);
      if (!data?.length) return textResult('Nenhuma memória anterior. Esta é a primeira execução de aprendizado.');
      return jsonResult({ total: data.length, memorias: data });
    },
    { annotations: { readOnlyHint: true } },
  );

  return createSdkMcpServer({
    name: 'cbrio_financeiro',
    version: '0.1.0',
    tools: [
      listarContasPagarPendentes,
      listarReembolsosPendentes,
      listarTransacoesSemCategoria,
      listarCategorias,
      historicoCategoriaPorDescricao,
      listarContasBancarias,
      proporCategorizar,
      proporMarcarPaga,
      proporDecidirReembolso,
      lembrarAprendizado,
      lerMemorias,
    ],
  });
}

export const FINANCEIRO_ALLOWED_TOOLS = [
  'mcp__cbrio_financeiro__listar_contas_pagar_pendentes',
  'mcp__cbrio_financeiro__listar_reembolsos_pendentes',
  'mcp__cbrio_financeiro__listar_transacoes_sem_categoria',
  'mcp__cbrio_financeiro__listar_categorias',
  'mcp__cbrio_financeiro__historico_categoria_por_descricao',
  'mcp__cbrio_financeiro__listar_contas_bancarias',
  'mcp__cbrio_financeiro__propor_categorizar_transacao',
  'mcp__cbrio_financeiro__propor_marcar_conta_paga',
  'mcp__cbrio_financeiro__propor_aprovar_reembolso',
  'mcp__cbrio_financeiro__lembrar_aprendizado',
  'mcp__cbrio_financeiro__ler_memorias',
];
