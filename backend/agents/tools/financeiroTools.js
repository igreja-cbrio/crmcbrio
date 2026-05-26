const { supabase } = require('../../utils/supabase');

/**
 * Tool registry do Agente Executor Financeiro.
 *
 * Convenção:
 *  - tools de LEITURA (`listar_*`, `buscar_*`) executam direto e retornam dados.
 *  - tools de ESCRITA (`propor_*`) inserem em `agent_queue` com status 'pending'
 *    + action_type/payload — não tocam nas tabelas de negócio.
 *  - É o endpoint /queue/:id/approve que, ao ser chamado por um humano, aplica
 *    de fato a ação via applyQueueAction() (financeiroApply.js).
 *
 * Cada handler recebe (input, ctx). ctx contém { runId, userId } injetado pelo agente.
 */

// ───────────────────────────────────────────────────────────
// Schemas (formato Anthropic tool use)
// ───────────────────────────────────────────────────────────

const SCHEMAS = [
  {
    name: 'listar_contas_pagar_pendentes',
    description: 'Lista todas as contas a pagar com status pendente, ordenadas por data de vencimento. Use para identificar pagamentos próximos do vencimento ou já vencidos.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', description: 'Máximo de itens. Default 50.' },
        somente_vencidas: { type: 'boolean', description: 'Se true, retorna só vencidas.' },
      },
    },
  },
  {
    name: 'listar_reembolsos_pendentes',
    description: 'Lista reembolsos com status pendente aguardando aprovação. Use para priorizar análise.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', description: 'Máximo de itens. Default 50.' },
      },
    },
  },
  {
    name: 'listar_transacoes_sem_categoria',
    description: 'Lista transações sem categoria atribuída. Use junto com historico_categoria_por_descricao para propor categorização.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', description: 'Máximo de itens. Default 30.' },
      },
    },
  },
  {
    name: 'listar_categorias',
    description: 'Lista todas as categorias financeiras disponíveis (receita/despesa). Use para escolher o categoria_id correto antes de propor categorização.',
    input_schema: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: ['receita', 'despesa'], description: 'Filtra por tipo.' },
      },
    },
  },
  {
    name: 'historico_categoria_por_descricao',
    description: 'Dada uma descrição (ou substring), retorna a categoria mais usada em transações anteriores com descrição parecida. Use isso ANTES de propor categorização — base sua sugestão em padrões reais.',
    input_schema: {
      type: 'object',
      properties: {
        descricao: { type: 'string', description: 'Texto da descrição (ou parte dela).' },
      },
      required: ['descricao'],
    },
  },
  {
    name: 'listar_contas_bancarias',
    description: 'Lista contas bancárias ativas com saldo. Use para escolher de qual conta sair um pagamento.',
    input_schema: { type: 'object', properties: {} },
  },

  // ─── ESCRITA (propõe — vai pra fila de aprovação) ───────────────

  {
    name: 'propor_categorizar_transacao',
    description: 'Propõe atribuir uma categoria a uma transação sem categoria. NÃO aplica direto — entra na fila de aprovação humana. Use apenas quando tiver alta confiança baseada em histórico ou descrição clara.',
    input_schema: {
      type: 'object',
      properties: {
        transacao_id: { type: 'string', description: 'UUID da transação.' },
        categoria_id: { type: 'string', description: 'UUID da categoria a aplicar.' },
        motivo: { type: 'string', description: 'Justificativa curta (ex: "Histórico mostra que 8/10 transações com `Energisa` foram categorizadas como `Contas de consumo`").' },
      },
      required: ['transacao_id', 'categoria_id', 'motivo'],
    },
  },
  {
    name: 'propor_marcar_conta_paga',
    description: 'Propõe marcar uma conta a pagar como paga. NÃO aplica direto — entra na fila. Use quando houver evidência clara (ex: vencida há muitos dias e há transação correspondente no extrato).',
    input_schema: {
      type: 'object',
      properties: {
        conta_pagar_id: { type: 'string', description: 'UUID da conta a pagar.' },
        data_pagamento: { type: 'string', description: 'Data do pagamento YYYY-MM-DD.' },
        motivo: { type: 'string', description: 'Justificativa curta.' },
      },
      required: ['conta_pagar_id', 'data_pagamento', 'motivo'],
    },
  },
  {
    name: 'propor_aprovar_reembolso',
    description: 'Propõe aprovar ou rejeitar um reembolso pendente. NÃO aplica direto — entra na fila. Use só quando os dados estão completos (descrição, valor, data) e dentro de padrões razoáveis.',
    input_schema: {
      type: 'object',
      properties: {
        reembolso_id: { type: 'string', description: 'UUID do reembolso.' },
        decisao: { type: 'string', enum: ['aprovado', 'rejeitado'], description: 'Decisão proposta.' },
        motivo: { type: 'string', description: 'Justificativa curta.' },
      },
      required: ['reembolso_id', 'decisao', 'motivo'],
    },
  },
];

// ───────────────────────────────────────────────────────────
// Handlers de LEITURA
// ───────────────────────────────────────────────────────────

const READ_HANDLERS = {
  async listar_contas_pagar_pendentes({ limit = 50, somente_vencidas = false }) {
    const hoje = new Date().toISOString().slice(0, 10);
    let q = supabase.from('fin_contas_pagar')
      .select('id, descricao, fornecedor, valor, data_vencimento, conta_id, categoria_id, status')
      .eq('status', 'pendente')
      .order('data_vencimento', { ascending: true })
      .limit(Math.min(limit, 100));
    if (somente_vencidas) q = q.lt('data_vencimento', hoje);
    const { data, error } = await q;
    if (error) return { error: error.message };
    return { total: data.length, items: data, hoje };
  },

  async listar_reembolsos_pendentes({ limit = 50 }) {
    const { data, error } = await supabase.from('fin_reembolsos')
      .select('id, descricao, valor, data_despesa, solicitante_id, categoria_id, observacoes, created_at')
      .eq('status', 'pendente')
      .order('created_at', { ascending: true })
      .limit(Math.min(limit, 100));
    if (error) return { error: error.message };
    return { total: data.length, items: data };
  },

  async listar_transacoes_sem_categoria({ limit = 30 }) {
    const { data, error } = await supabase.from('fin_transacoes')
      .select('id, descricao, valor, tipo, data_competencia, conta_id')
      .is('categoria_id', null)
      .neq('status', 'cancelado')
      .order('data_competencia', { ascending: false })
      .limit(Math.min(limit, 100));
    if (error) return { error: error.message };
    return { total: data.length, items: data };
  },

  async listar_categorias({ tipo }) {
    let q = supabase.from('fin_categorias').select('id, nome, tipo, pai_id').order('tipo').order('nome');
    if (tipo) q = q.eq('tipo', tipo);
    const { data, error } = await q;
    if (error) return { error: error.message };
    return { total: data.length, items: data };
  },

  async historico_categoria_por_descricao({ descricao }) {
    if (!descricao || descricao.length < 2) return { error: 'descricao muito curta' };
    // Pega transações com descrição parecida + categoria preenchida
    const { data, error } = await supabase.from('fin_transacoes')
      .select('descricao, categoria_id, fin_categorias(nome, tipo)')
      .ilike('descricao', `%${descricao}%`)
      .not('categoria_id', 'is', null)
      .limit(100);
    if (error) return { error: error.message };

    // Agrupa por categoria_id
    const counts = {};
    for (const t of data || []) {
      const k = t.categoria_id;
      if (!counts[k]) counts[k] = { categoria_id: k, nome: t.fin_categorias?.nome, tipo: t.fin_categorias?.tipo, count: 0 };
      counts[k].count++;
    }
    const ranking = Object.values(counts).sort((a, b) => b.count - a.count);
    return { total_amostras: data.length, ranking: ranking.slice(0, 5) };
  },

  async listar_contas_bancarias() {
    const { data, error } = await supabase.from('fin_contas')
      .select('id, nome, banco, tipo, saldo, ativa')
      .eq('ativa', true)
      .order('nome');
    if (error) return { error: error.message };
    return { items: data };
  },
};

// ───────────────────────────────────────────────────────────
// Handlers de ESCRITA (enfileiram em agent_queue)
// ───────────────────────────────────────────────────────────

async function enqueue({ runId, actionType, actionLabel, reasoning, payload }) {
  const { data, error } = await supabase.from('agent_queue').insert({
    run_id: runId || null,
    agent: 'agent_executor_financeiro',
    action: actionLabel,        // legacy column ("action" = nome amigável)
    action_type: actionType,
    action_label: actionLabel,
    payload,
    reasoning: reasoning || null,
    status: 'pending',
    details: JSON.stringify({ actionType, payload, reasoning }),
  }).select().single();

  if (error) return { error: error.message };
  return { ok: true, queue_id: data.id, status: 'pending', acao: actionLabel };
}

const WRITE_HANDLERS = {
  async propor_categorizar_transacao({ transacao_id, categoria_id, motivo }, ctx) {
    if (!transacao_id || !categoria_id) return { error: 'transacao_id e categoria_id obrigatórios' };

    // Snapshot do alvo pra mostrar no painel
    const [{ data: tx }, { data: cat }] = await Promise.all([
      supabase.from('fin_transacoes').select('descricao, valor, tipo, categoria_id').eq('id', transacao_id).single(),
      supabase.from('fin_categorias').select('nome').eq('id', categoria_id).single(),
    ]);
    if (!tx) return { error: 'Transação não encontrada' };
    if (tx.categoria_id) return { error: 'Transação já tem categoria — pule.' };
    if (!cat) return { error: 'Categoria não encontrada' };

    return enqueue({
      runId: ctx?.runId,
      actionType: 'fin.categorize_transaction',
      actionLabel: `Categorizar "${tx.descricao}" como "${cat.nome}"`,
      reasoning: motivo,
      payload: { transacao_id, categoria_id, snapshot: { descricao: tx.descricao, valor: tx.valor, tipo: tx.tipo, categoria_nome: cat.nome } },
    });
  },

  async propor_marcar_conta_paga({ conta_pagar_id, data_pagamento, motivo }, ctx) {
    if (!conta_pagar_id || !data_pagamento) return { error: 'conta_pagar_id e data_pagamento obrigatórios' };
    const { data: cp } = await supabase.from('fin_contas_pagar')
      .select('descricao, fornecedor, valor, data_vencimento, status').eq('id', conta_pagar_id).single();
    if (!cp) return { error: 'Conta a pagar não encontrada' };
    if (cp.status === 'pago') return { error: 'Conta já está paga.' };

    return enqueue({
      runId: ctx?.runId,
      actionType: 'fin.mark_payable_paid',
      actionLabel: `Marcar como paga: ${cp.descricao} (R$ ${Number(cp.valor).toFixed(2)})`,
      reasoning: motivo,
      payload: { conta_pagar_id, data_pagamento, snapshot: { descricao: cp.descricao, fornecedor: cp.fornecedor, valor: cp.valor, data_vencimento: cp.data_vencimento } },
    });
  },

  async propor_aprovar_reembolso({ reembolso_id, decisao, motivo }, ctx) {
    if (!reembolso_id || !['aprovado', 'rejeitado'].includes(decisao)) {
      return { error: 'reembolso_id obrigatório; decisao deve ser aprovado|rejeitado' };
    }
    const { data: r } = await supabase.from('fin_reembolsos')
      .select('descricao, valor, status, solicitante_id').eq('id', reembolso_id).single();
    if (!r) return { error: 'Reembolso não encontrado' };
    if (r.status !== 'pendente') return { error: `Reembolso já está ${r.status}` };

    return enqueue({
      runId: ctx?.runId,
      actionType: 'fin.reimbursement_decision',
      actionLabel: `${decisao === 'aprovado' ? 'Aprovar' : 'Rejeitar'} reembolso: ${r.descricao} (R$ ${Number(r.valor).toFixed(2)})`,
      reasoning: motivo,
      payload: { reembolso_id, decisao, snapshot: { descricao: r.descricao, valor: r.valor } },
    });
  },
};

// ───────────────────────────────────────────────────────────
// Export bundle pro agente
// ───────────────────────────────────────────────────────────

module.exports = {
  TOOL_SCHEMAS: SCHEMAS,
  TOOL_HANDLERS: { ...READ_HANDLERS, ...WRITE_HANDLERS },
};
