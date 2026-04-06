const router = require('express').Router();
const { authenticate, authorizeModule } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');
const { notificar } = require('../services/notificar');

router.use(authenticate, authorizeModule('logistica'));

// ── DASHBOARD ──────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const [fornecedores, solicitacoes, pedidos] = await Promise.all([
      supabase.from('log_fornecedores').select('id, ativo'),
      supabase.from('log_solicitacoes_compra').select('id, status, valor_estimado'),
      supabase.from('log_pedidos').select('id, status, valor_total'),
    ]);

    const forn = fornecedores.data || [];
    const solic = solicitacoes.data || [];
    const ped = pedidos.data || [];

    res.json({
      fornecedoresAtivos: forn.filter(f => f.ativo).length,
      solicitacoesPendentes: solic.filter(s => s.status === 'pendente').length,
      solicitacoesAprovadas: solic.filter(s => s.status === 'aprovado').length,
      pedidosAguardando: ped.filter(p => p.status === 'aguardando').length,
      pedidosEmTransito: ped.filter(p => p.status === 'em_transito').length,
      pedidosRecebidos: ped.filter(p => p.status === 'recebido').length,
      valorTotalPedidos: ped.filter(p => p.status !== 'cancelado').reduce((s, p) => s + Number(p.valor_total), 0),
    });
  } catch (e) {
    console.error('[LOG] Dashboard:', e.message);
    res.status(500).json({ error: 'Erro ao carregar dashboard logística' });
  }
});

// ── FORNECEDORES ───────────────────────────────────────────
router.get('/fornecedores', async (req, res) => {
  try {
    const { ativo } = req.query;
    let query = supabase.from('log_fornecedores').select('*').order('razao_social');
    if (ativo !== undefined) query = query.eq('ativo', ativo === 'true');
    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Erro ao listar fornecedores' }); }
});

router.post('/fornecedores', async (req, res) => {
  try {
    const { razao_social, nome_fantasia, cnpj, email, telefone, contato, categoria, observacoes } = req.body;
    if (!razao_social) return res.status(400).json({ error: 'Razão social é obrigatória' });
    const { data, error } = await supabase.from('log_fornecedores')
      .insert({ razao_social, nome_fantasia: nome_fantasia || null, cnpj: cnpj || null, email: email || null, telefone: telefone || null, contato: contato || null, categoria: categoria || null, observacoes: observacoes || null })
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Erro ao criar fornecedor' }); }
});

router.put('/fornecedores/:id', async (req, res) => {
  try {
    const { razao_social, nome_fantasia, cnpj, email, telefone, contato, categoria, ativo, observacoes } = req.body;
    const { data, error } = await supabase.from('log_fornecedores')
      .update({ razao_social, nome_fantasia, cnpj, email, telefone, contato, categoria, ativo, observacoes })
      .eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Erro ao atualizar fornecedor' }); }
});

router.delete('/fornecedores/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('log_fornecedores').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro ao remover fornecedor' }); }
});

// ── SOLICITAÇÕES DE COMPRA ─────────────────────────────────
router.get('/solicitacoes', async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase.from('log_solicitacoes_compra').select('*, profiles!solicitante_id(name)').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Erro ao listar solicitações' }); }
});

router.post('/solicitacoes', async (req, res) => {
  try {
    const { titulo, descricao, justificativa, valor_estimado, urgencia, area } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Título é obrigatório' });
    const { data, error } = await supabase.from('log_solicitacoes_compra')
      .insert({ titulo, descricao: descricao || null, justificativa: justificativa || null, valor_estimado: valor_estimado || null, urgencia: urgencia || 'normal', area: area || null, solicitante_id: req.user.userId })
      .select().single();
    if (error) return res.status(400).json({ error: error.message });

    // Notificar Logística sobre nova solicitação
    try {
      await notificar({
        modulo: 'logistica',
        tipo: 'solicitacao_criada',
        titulo: 'Nova solicitação de compra',
        mensagem: `Nova solicitação: ${titulo}`,
        link: '/admin/logistica?tab=solicitacoes',
        severidade: 'info',
        chaveDedup: `solicitacao-criada-${data.id}`,
      });
    } catch (notifErr) {
      console.error('[LOG] Erro ao notificar solicitação:', notifErr.message);
    }

    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Erro ao criar solicitação' }); }
});

router.patch('/solicitacoes/:id', async (req, res) => {
  try {
    const { status, observacoes } = req.body;
    const update = { status };
    if (observacoes !== undefined) update.observacoes = observacoes;
    if (['aprovado', 'rejeitado'].includes(status)) update.aprovado_por = req.user.userId;
    const { data, error } = await supabase.from('log_solicitacoes_compra')
      .update(update).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });

    // Notificar solicitante sobre aprovação/rejeição
    if (['aprovado', 'rejeitado'].includes(status)) {
      try {
        const statusTexto = status === 'aprovado' ? 'aprovada' : 'rejeitada';
        await notificar({
          modulo: 'logistica',
          tipo: 'solicitacao_status',
          titulo: `Solicitação ${statusTexto}`,
          mensagem: `Sua solicitação foi ${statusTexto}`,
          link: '/admin/logistica?tab=solicitacoes',
          severidade: status === 'aprovado' ? 'info' : 'aviso',
          chaveDedup: `solicitacao-status-${data.id}-${status}`,
          targetIds: data.solicitante_id ? [data.solicitante_id] : undefined,
        });
      } catch (notifErr) {
        console.error('[LOG] Erro ao notificar status solicitação:', notifErr.message);
      }
    }

    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Erro ao atualizar solicitação' }); }
});

// ── PEDIDOS ────────────────────────────────────────────────
router.get('/pedidos', async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase.from('log_pedidos').select('*, log_fornecedores(razao_social, nome_fantasia)').order('data_pedido', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Erro ao listar pedidos' }); }
});

router.post('/pedidos', async (req, res) => {
  try {
    const { solicitacao_id, fornecedor_id, descricao, valor_total, data_prevista, codigo_rastreio, transportadora } = req.body;
    if (!fornecedor_id || !descricao || !valor_total) return res.status(400).json({ error: 'Fornecedor, descrição e valor são obrigatórios' });
    const { data, error } = await supabase.from('log_pedidos')
      .insert({ solicitacao_id: solicitacao_id || null, fornecedor_id, descricao, valor_total, data_prevista: data_prevista || null, codigo_rastreio: codigo_rastreio || null, transportadora: transportadora || null, created_by: req.user.userId })
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Erro ao criar pedido' }); }
});

router.put('/pedidos/:id', async (req, res) => {
  try {
    const { descricao, valor_total, data_prevista, status, codigo_rastreio, transportadora } = req.body;
    const { data, error } = await supabase.from('log_pedidos')
      .update({ descricao, valor_total, data_prevista, status, codigo_rastreio, transportadora })
      .eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Erro ao atualizar pedido' }); }
});

router.delete('/pedidos/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('log_pedidos').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro ao remover pedido' }); }
});

// ── RECEBIMENTOS ───────────────────────────────────────────
router.post('/pedidos/:id/recebimento', async (req, res) => {
  try {
    const { observacoes, status } = req.body;
    const { data, error } = await supabase.from('log_recebimentos')
      .insert({ pedido_id: req.params.id, recebido_por: req.user.userId, observacoes: observacoes || null, status: status || 'ok' })
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    // Atualizar status do pedido
    await supabase.from('log_pedidos').update({ status: 'recebido' }).eq('id', req.params.id);

    // Notificar Logística sobre recebimento
    try {
      await notificar({
        modulo: 'logistica',
        tipo: 'pedido_recebido',
        titulo: 'Pedido recebido',
        mensagem: `Pedido recebido`,
        link: '/admin/logistica?tab=pedidos',
        severidade: 'info',
        chaveDedup: `pedido-recebido-${req.params.id}`,
      });
    } catch (notifErr) {
      console.error('[LOG] Erro ao notificar recebimento:', notifErr.message);
    }

    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Erro ao registrar recebimento' }); }
});

// ── ITENS DE PEDIDO ───────────────────────────────────────

router.get('/pedidos/:id/itens', async (req, res) => {
  try {
    const { data, error } = await supabase.from('log_itens_pedido')
      .select('*').eq('pedido_id', req.params.id).order('descricao');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Erro ao listar itens' }); }
});

router.post('/pedidos/:id/itens', async (req, res) => {
  try {
    const { descricao, quantidade, unidade, valor_unit } = req.body;
    if (!descricao || !quantidade) return res.status(400).json({ error: 'Descrição e quantidade são obrigatórios' });
    const valor_total = valor_unit ? Number(valor_unit) * Number(quantidade) : null;
    const { data, error } = await supabase.from('log_itens_pedido')
      .insert({ pedido_id: req.params.id, descricao, quantidade, unidade: unidade || 'un', valor_unit: valor_unit || null, valor_total })
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) { res.status(500).json({ error: 'Erro ao adicionar item' }); }
});

router.delete('/itens/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('log_itens_pedido').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro ao remover item' }); }
});

// ── NOTAS FISCAIS ─────────────────────────────────────────

router.get('/notas', async (req, res) => {
  try {
    const { data, error } = await supabase.from('log_notas_fiscais')
      .select('*, log_fornecedores(razao_social, nome_fantasia), log_pedidos(descricao)')
      .order('data_emissao', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Erro ao listar notas fiscais' }); }
});

router.post('/notas', async (req, res) => {
  try {
    const { pedido_id, fornecedor_id, numero, serie, chave_acesso, valor, data_emissao, storage_path } = req.body;
    if (!numero || !valor || !data_emissao) return res.status(400).json({ error: 'Número, valor e data são obrigatórios' });
    const { data, error } = await supabase.from('log_notas_fiscais')
      .insert({
        pedido_id: pedido_id || null, fornecedor_id: fornecedor_id || null,
        numero, serie: serie || null, chave_acesso: chave_acesso || null,
        valor, data_emissao, storage_path: storage_path || null,
      })
      .select('*, log_fornecedores(razao_social, nome_fantasia), log_pedidos(descricao)')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) { res.status(500).json({ error: 'Erro ao cadastrar nota fiscal' }); }
});

router.delete('/notas/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('log_notas_fiscais').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro ao remover nota fiscal' }); }
});

// ── MOVIMENTAÇÕES (código de barras) ──────────────────────

router.get('/movimentacoes', async (req, res) => {
  try {
    const { codigo_barras, tipo, limit: lim } = req.query;
    let query = supabase.from('log_movimentacoes')
      .select('*, profiles!responsavel_id(name)')
      .order('created_at', { ascending: false });
    if (codigo_barras) query = query.eq('codigo_barras', codigo_barras);
    if (tipo) query = query.eq('tipo', tipo);
    if (lim) query = query.limit(Number(lim));
    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Erro ao listar movimentações' }); }
});

router.post('/movimentacoes', async (req, res) => {
  try {
    const { pedido_id, tipo, codigo_barras, descricao, quantidade, unidade, localizacao, observacoes, foto_url } = req.body;
    if (!tipo || !codigo_barras) return res.status(400).json({ error: 'Tipo e código de barras são obrigatórios' });
    const { data, error } = await supabase.from('log_movimentacoes')
      .insert({
        pedido_id: pedido_id || null, tipo, codigo_barras, descricao: descricao || null,
        quantidade: quantidade || 1, unidade: unidade || 'un',
        localizacao: localizacao || null, responsavel_id: req.user.userId,
        observacoes: observacoes || null, foto_url: foto_url || null,
      })
      .select('*, profiles!responsavel_id(name)')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) { res.status(500).json({ error: 'Erro ao registrar movimentação' }); }
});

router.get('/movimentacoes/historico/:codigo', async (req, res) => {
  try {
    const { data, error } = await supabase.from('log_movimentacoes')
      .select('*, profiles!responsavel_id(name)')
      .eq('codigo_barras', req.params.codigo)
      .order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Erro ao buscar histórico' }); }
});

module.exports = router;
