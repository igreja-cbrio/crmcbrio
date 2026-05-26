const { supabase } = require('../../utils/supabase');
const { notificar } = require('../../services/notificar');

/**
 * Aplica de fato uma ação aprovada da agent_queue.
 * Chamado por PATCH /api/agents/queue/:id/approve no momento da aprovação.
 *
 * Cada handler recebe (payload, reviewerId) e aplica a mudança real no banco.
 * Lança Error em caso de problema — o caller marca a row como 'failed' + apply_error.
 */

const APPLY_HANDLERS = {
  async 'fin.categorize_transaction'(payload, reviewerId) {
    const { transacao_id, categoria_id } = payload;
    if (!transacao_id || !categoria_id) throw new Error('Payload inválido: transacao_id e categoria_id obrigatórios');

    // Idempotência: confere se ainda não tem categoria
    const { data: tx, error: txErr } = await supabase.from('fin_transacoes')
      .select('categoria_id, descricao').eq('id', transacao_id).single();
    if (txErr) throw new Error(`Transação não encontrada: ${txErr.message}`);
    if (tx.categoria_id && tx.categoria_id === categoria_id) {
      return { applied: true, idempotent: true, message: 'Já estava categorizada igual.' };
    }

    const { error } = await supabase.from('fin_transacoes')
      .update({ categoria_id })
      .eq('id', transacao_id);
    if (error) throw new Error(error.message);
    return { applied: true, message: `Transação "${tx.descricao}" categorizada.` };
  },

  async 'fin.mark_payable_paid'(payload, reviewerId) {
    const { conta_pagar_id, data_pagamento } = payload;
    if (!conta_pagar_id || !data_pagamento) throw new Error('Payload inválido');

    const { data: cp, error: cpErr } = await supabase.from('fin_contas_pagar')
      .select('status, descricao, valor').eq('id', conta_pagar_id).single();
    if (cpErr) throw new Error(`Conta não encontrada: ${cpErr.message}`);
    if (cp.status === 'pago') return { applied: true, idempotent: true, message: 'Já estava paga.' };

    const { error } = await supabase.from('fin_contas_pagar')
      .update({ status: 'pago', data_pagamento })
      .eq('id', conta_pagar_id);
    if (error) throw new Error(error.message);

    // Notifica
    try {
      await notificar({
        modulo: 'financeiro',
        tipo: 'conta_pagar_quitada',
        titulo: 'Conta paga (via Agente IA)',
        mensagem: `${cp.descricao} — R$ ${Number(cp.valor).toFixed(2)} marcada como paga.`,
        link: '/admin/financeiro?tab=contas-pagar',
        severidade: 'info',
        chaveDedup: `agent-conta-paga-${conta_pagar_id}`,
      });
    } catch { /* não bloqueia */ }

    return { applied: true, message: `Conta "${cp.descricao}" marcada como paga em ${data_pagamento}.` };
  },

  async 'fin.reimbursement_decision'(payload, reviewerId) {
    const { reembolso_id, decisao } = payload;
    if (!reembolso_id || !['aprovado', 'rejeitado'].includes(decisao)) throw new Error('Payload inválido');

    const { data: r, error: rErr } = await supabase.from('fin_reembolsos')
      .select('status, descricao, solicitante_id').eq('id', reembolso_id).single();
    if (rErr) throw new Error(`Reembolso não encontrado: ${rErr.message}`);
    if (r.status !== 'pendente') return { applied: true, idempotent: true, message: `Já estava ${r.status}.` };

    const { error } = await supabase.from('fin_reembolsos')
      .update({ status: decisao, aprovado_por: reviewerId })
      .eq('id', reembolso_id);
    if (error) throw new Error(error.message);

    // Notifica solicitante
    try {
      await notificar({
        modulo: 'financeiro',
        tipo: 'reembolso_status',
        titulo: `Reembolso ${decisao}`,
        mensagem: `Seu reembolso "${r.descricao}" foi ${decisao}.`,
        link: '/admin/financeiro?tab=reembolsos',
        severidade: decisao === 'rejeitado' ? 'aviso' : 'info',
        chaveDedup: `agent-reembolso-${reembolso_id}-${decisao}`,
        targetIds: r.solicitante_id ? [r.solicitante_id] : undefined,
      });
    } catch { /* não bloqueia */ }

    return { applied: true, message: `Reembolso "${r.descricao}" ${decisao}.` };
  },
};

/**
 * Roteia um item da agent_queue para o handler correto.
 * Retorna { ok: true, result } em sucesso. Lança em falha.
 */
async function applyQueueAction(queueRow, reviewerId) {
  const actionType = queueRow.action_type;
  const handler = APPLY_HANDLERS[actionType];
  if (!handler) throw new Error(`Sem handler de aplicação para action_type='${actionType}'`);

  let payload = queueRow.payload;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { /* ignore */ }
  }
  if (!payload) throw new Error('Payload vazio na queue row');

  const result = await handler(payload, reviewerId);
  return { ok: true, result };
}

module.exports = { applyQueueAction, APPLY_HANDLERS };
