const router = require('express').Router();
const { authenticate, authorizeModule } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');
const { notificar } = require('../services/notificar');

// Permissão granular: módulos DP + Pessoas (nível mínimo 2)
router.use(authenticate, authorizeModule('rh'));

// ── DASHBOARD ──────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const { data: funcionarios, error } = await supabase
      .from('rh_funcionarios')
      .select('id, status, tipo_contrato, area');

    if (error) return res.status(400).json({ error: error.message });

    const total = funcionarios.length;
    const ativos = funcionarios.filter(f => f.status === 'ativo').length;
    const ferias = funcionarios.filter(f => f.status === 'ferias').length;
    const licenca = funcionarios.filter(f => f.status === 'licenca').length;
    const inativos = funcionarios.filter(f => f.status === 'inativo').length;

    // Contagem por tipo de contrato
    const porContrato = {};
    funcionarios.forEach(f => {
      porContrato[f.tipo_contrato] = (porContrato[f.tipo_contrato] || 0) + 1;
    });

    // Contagem por área
    const porArea = {};
    funcionarios.forEach(f => {
      const area = f.area || 'Sem área';
      porArea[area] = (porArea[area] || 0) + 1;
    });

    // Férias/licenças nos próximos 30 dias (inclui em andamento e futuras)
    const hoje = new Date().toISOString().slice(0, 10);
    const em30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const { data: feriasProximas } = await supabase
      .from('rh_ferias_licencas')
      .select('*, rh_funcionarios(nome, cargo, area, foto_url)')
      .eq('status', 'aprovado')
      .lte('data_inicio', em30)
      .gte('data_fim', hoje)
      .order('data_inicio');

    // Documentos com vencimento próximo (60 dias)
    const em60 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
    const { data: docsVencendo } = await supabase
      .from('rh_documentos')
      .select('*, rh_funcionarios(nome)')
      .lte('data_expiracao', em60)
      .gte('data_expiracao', hoje)
      .order('data_expiracao');

    // Custo total mensal (salários ativos)
    const { data: salarios } = await supabase
      .from('rh_funcionarios')
      .select('salario, custo_total_mensal')
      .eq('status', 'ativo');
    const custoMensal = (salarios || []).reduce((sum, f) => sum + Number(f.custo_total_mensal || f.salario || 0), 0);
    const totalSalarios = (salarios || []).reduce((sum, f) => sum + Number(f.salario || 0), 0);

    // Admissões nos últimos 12 meses (para turnover)
    const umAnoAtras = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    const { count: admissoesAno } = await supabase
      .from('rh_funcionarios')
      .select('id', { count: 'exact', head: true })
      .gte('data_admissao', umAnoAtras);

    // Desligamentos nos últimos 12 meses
    const { count: desligamentosAno } = await supabase
      .from('rh_funcionarios')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'inativo')
      .gte('data_demissao', umAnoAtras);

    // Admissões pendentes
    const { count: admissoesPendentes } = await supabase
      .from('rh_admissoes')
      .select('id', { count: 'exact', head: true })
      .not('status', 'in', '("concluido","cancelado")');

    // Treinamentos pendentes
    const { count: treinosPendentes } = await supabase
      .from('rh_treinamentos_funcionarios')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'inscrito');

    // Taxa de turnover = desligamentos / média headcount * 100
    const turnover = total > 0 ? Math.round((desligamentosAno || 0) / total * 100) : 0;

    res.json({
      total, ativos, ferias, licenca, inativos,
      porContrato, porArea,
      feriasProximas: feriasProximas || [],
      docsVencendo: docsVencendo || [],
      custoMensal, totalSalarios,
      admissoesAno: admissoesAno || 0,
      desligamentosAno: desligamentosAno || 0,
      turnover,
      admissoesPendentes: admissoesPendentes || 0,
      treinosPendentes: treinosPendentes || 0,
    });
  } catch (e) {
    console.error('[RH] Dashboard:', e.message);
    res.status(500).json({ error: 'Erro ao carregar dashboard RH' });
  }
});

// ── FUNCIONÁRIOS ───────────────────────────────────────────
// GET /api/rh/funcionarios
router.get('/funcionarios', async (req, res) => {
  try {
    const { status, area, busca, tipo_contrato } = req.query;
    let query = supabase
      .from('rh_funcionarios')
      .select('*, rh_ferias_licencas(tipo, data_inicio, data_fim, status)')
      .order('nome');

    if (status) query = query.eq('status', status);
    if (area) query = query.eq('area', area);
    if (tipo_contrato) query = query.eq('tipo_contrato', tipo_contrato);
    if (busca) query = query.ilike('nome', `%${busca}%`);

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    console.error('[RH] Listar funcionários:', e.message);
    res.status(500).json({ error: 'Erro ao listar funcionários' });
  }
});

// GET /api/rh/funcionarios/:id
router.get('/funcionarios/:id', async (req, res) => {
  try {
    const { data: func, error } = await supabase
      .from('rh_funcionarios')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'Funcionário não encontrado' });

    // Buscar dados relacionados
    const [docs, treinamentos, ferias] = await Promise.all([
      supabase.from('rh_documentos').select('*').eq('funcionario_id', req.params.id).order('created_at', { ascending: false }),
      supabase.from('rh_treinamentos_funcionarios')
        .select('*, rh_treinamentos(*)')
        .eq('funcionario_id', req.params.id)
        .order('rh_treinamentos(data_inicio)', { ascending: false }),
      supabase.from('rh_ferias_licencas').select('*').eq('funcionario_id', req.params.id).order('data_inicio', { ascending: false }),
    ]);

    res.json({
      ...func,
      documentos: docs.data || [],
      treinamentos: treinamentos.data || [],
      ferias_licencas: ferias.data || [],
    });
  } catch (e) {
    console.error('[RH] Detalhe funcionário:', e.message);
    res.status(500).json({ error: 'Erro ao buscar funcionário' });
  }
});

// POST /api/rh/funcionarios
router.post('/funcionarios', async (req, res) => {
  try {
    const { nome, cpf, email, telefone, cargo, area, tipo_contrato, data_admissao, salario, observacoes, foto_url,
      complemento_salario, alimentacao, transporte, saude, seguro_vida, educacao, saldo_livre,
      plano_saude, gratificacao, adicional_nivel, participacao_comite, veiculo,
      adicional_pastores, adicional_lideranca, adicional_pulpito,
      bonus_anual_50, bonus_anual_integral, ferias_integral,
      remuneracao_bruta, remuneracao_liquida, fgts, ir, inss, custo_total_mensal } = req.body;
    if (!nome || !cargo || !data_admissao) {
      return res.status(400).json({ error: 'Nome, cargo e data de admissão são obrigatórios' });
    }

    const { data, error } = await supabase
      .from('rh_funcionarios')
      .insert({
        nome, cpf: cpf || null, email: email || null, telefone: telefone || null,
        cargo, area: area || null, tipo_contrato: tipo_contrato || 'clt',
        data_admissao, salario: salario || null, observacoes: observacoes || null,
        foto_url: foto_url || null,
        complemento_salario, alimentacao, transporte, saude, seguro_vida, educacao, saldo_livre,
        plano_saude, gratificacao, adicional_nivel, participacao_comite, veiculo,
        adicional_pastores, adicional_lideranca, adicional_pulpito,
        bonus_anual_50, bonus_anual_integral, ferias_integral,
        remuneracao_bruta, remuneracao_liquida, fgts, ir, inss, custo_total_mensal,
        created_by: req.user.userId,
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) {
    console.error('[RH] Criar funcionário:', e.message);
    res.status(500).json({ error: 'Erro ao criar funcionário' });
  }
});

// PUT /api/rh/funcionarios/:id
router.put('/funcionarios/:id', async (req, res) => {
  try {
    const { id: _id, created_at, created_by, updated_at: _ua, ...fields } = req.body;
    const { data, error } = await supabase
      .from('rh_funcionarios')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    console.error('[RH] Atualizar funcionário:', e.message);
    res.status(500).json({ error: 'Erro ao atualizar funcionário' });
  }
});

// DELETE /api/rh/funcionarios/:id (desativação lógica)
router.delete('/funcionarios/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('rh_funcionarios')
      .update({ status: 'inativo', data_demissao: new Date().toISOString().split('T')[0] })
      .eq('id', req.params.id);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) {
    console.error('[RH] Desativar funcionário:', e.message);
    res.status(500).json({ error: 'Erro ao desativar funcionário' });
  }
});

// ── DOCUMENTOS ─────────────────────────────────────────────
// POST /api/rh/funcionarios/:id/documentos
router.post('/funcionarios/:id/documentos', async (req, res) => {
  try {
    const { tipo, nome, storage_path, data_expiracao } = req.body;
    if (!tipo || !nome) return res.status(400).json({ error: 'Tipo e nome são obrigatórios' });

    const { data, error } = await supabase
      .from('rh_documentos')
      .insert({
        funcionario_id: req.params.id,
        tipo, nome,
        storage_path: storage_path || null,
        data_expiracao: data_expiracao || null,
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    console.error('[RH] Criar documento:', e.message);
    res.status(500).json({ error: 'Erro ao criar documento' });
  }
});

// DELETE /api/rh/documentos/:id
router.delete('/documentos/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('rh_documentos')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) {
    console.error('[RH] Remover documento:', e.message);
    res.status(500).json({ error: 'Erro ao remover documento' });
  }
});

// ── TREINAMENTOS ───────────────────────────────────────────
// GET /api/rh/treinamentos
router.get('/treinamentos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rh_treinamentos')
      .select('*, rh_treinamentos_funcionarios(*, rh_funcionarios(id, nome, cargo, foto_url))')
      .order('data_inicio', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    console.error('[RH] Listar treinamentos:', e.message);
    res.status(500).json({ error: 'Erro ao listar treinamentos' });
  }
});

// POST /api/rh/treinamentos
router.post('/treinamentos', async (req, res) => {
  try {
    const { titulo, descricao, data_inicio, data_fim, instrutor, obrigatorio } = req.body;
    if (!titulo || !data_inicio) return res.status(400).json({ error: 'Título e data início são obrigatórios' });

    const { data, error } = await supabase
      .from('rh_treinamentos')
      .insert({ titulo, descricao: descricao || null, data_inicio, data_fim: data_fim || null, instrutor: instrutor || null, obrigatorio: obrigatorio || false })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) {
    console.error('[RH] Criar treinamento:', e.message);
    res.status(500).json({ error: 'Erro ao criar treinamento' });
  }
});

// PUT /api/rh/treinamentos/:id
router.put('/treinamentos/:id', async (req, res) => {
  try {
    const { titulo, descricao, data_inicio, data_fim, instrutor, obrigatorio } = req.body;
    const { data, error } = await supabase
      .from('rh_treinamentos')
      .update({ titulo, descricao, data_inicio, data_fim, instrutor, obrigatorio })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    console.error('[RH] Atualizar treinamento:', e.message);
    res.status(500).json({ error: 'Erro ao atualizar treinamento' });
  }
});

// DELETE /api/rh/treinamentos/:id
router.delete('/treinamentos/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('rh_treinamentos').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) {
    console.error('[RH] Remover treinamento:', e.message);
    res.status(500).json({ error: 'Erro ao remover treinamento' });
  }
});

// POST /api/rh/treinamentos/:id/inscrever — inscrever funcionários
router.post('/treinamentos/:id/inscrever', async (req, res) => {
  try {
    const { funcionario_id, funcionario_ids } = req.body;

    // Suporta tanto inscrição única quanto em lote
    let insercoes;
    if (funcionario_ids && Array.isArray(funcionario_ids)) {
      insercoes = funcionario_ids.map((fid) => ({
        treinamento_id: req.params.id,
        funcionario_id: fid,
        status: 'inscrito',
      }));
    } else if (funcionario_id) {
      insercoes = [{ treinamento_id: req.params.id, funcionario_id, status: 'inscrito' }];
    } else {
      return res.status(400).json({ error: 'funcionario_id ou funcionario_ids é obrigatório' });
    }

    const { data, error } = await supabase
      .from('rh_treinamentos_funcionarios')
      .upsert(insercoes)
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    console.error('[RH] Inscrever em treinamento:', e.message);
    res.status(500).json({ error: 'Erro ao inscrever no treinamento' });
  }
});

// PATCH /api/rh/treinamentos-funcionarios/:id — atualizar status
router.patch('/treinamentos-funcionarios/:id', async (req, res) => {
  try {
    const { status, data_conclusao } = req.body;
    const update = { status };
    if (data_conclusao) update.data_conclusao = data_conclusao;
    if (status === 'concluido' && !data_conclusao) update.data_conclusao = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('rh_treinamentos_funcionarios')
      .update(update)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    console.error('[RH] Atualizar inscrição:', e.message);
    res.status(500).json({ error: 'Erro ao atualizar inscrição' });
  }
});

// ── FÉRIAS E LICENÇAS ──────────────────────────────────────
// GET /api/rh/ferias?status=&area=&data_de=&data_ate=&funcionario_id=
router.get('/ferias', async (req, res) => {
  try {
    const { status, area, data_de, data_ate, funcionario_id } = req.query;
    let query = supabase
      .from('rh_ferias_licencas')
      .select('*, rh_funcionarios(nome, cargo, area, foto_url)')
      .order('data_inicio', { ascending: false });

    if (status) query = query.eq('status', status);
    if (funcionario_id) query = query.eq('funcionario_id', funcionario_id);
    if (data_de) query = query.gte('data_inicio', data_de);
    if (data_ate) query = query.lte('data_inicio', data_ate);

    let { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    // Filter by area (post-query since it's a joined field)
    if (area && data) {
      data = data.filter(f => f.rh_funcionarios?.area === area);
    }

    res.json(data);
  } catch (e) {
    console.error('[RH] Listar férias:', e.message);
    res.status(500).json({ error: 'Erro ao listar férias' });
  }
});

// POST /api/rh/funcionarios/:id/ferias
router.post('/funcionarios/:id/ferias', async (req, res) => {
  try {
    const { tipo, data_inicio, data_fim, observacoes } = req.body;
    if (!tipo || !data_inicio || !data_fim) {
      return res.status(400).json({ error: 'Tipo, data início e data fim são obrigatórios' });
    }

    const { data, error } = await supabase
      .from('rh_ferias_licencas')
      .insert({
        funcionario_id: req.params.id,
        tipo, data_inicio, data_fim,
        observacoes: observacoes || null,
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // Notificar RH sobre solicitação de férias
    try {
      const { data: func } = await supabase.from('rh_funcionarios').select('nome').eq('id', req.params.id).single();
      await notificar({
        modulo: 'rh',
        tipo: 'ferias_solicitada',
        titulo: 'Solicitação de férias',
        mensagem: `Solicitação de férias de ${func?.nome || 'Funcionário'}`,
        link: '/admin/rh?tab=ferias',
        severidade: 'info',
        chaveDedup: `ferias-solicitada-${data.id}`,
      });
    } catch (notifErr) {
      console.error('[RH] Erro ao notificar férias:', notifErr.message);
    }

    res.json(data);
  } catch (e) {
    console.error('[RH] Solicitar férias:', e.message);
    res.status(500).json({ error: 'Erro ao solicitar férias/licença' });
  }
});

// PATCH /api/rh/ferias/:id — aprovar/rejeitar
router.patch('/ferias/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['aprovado', 'rejeitado'].includes(status)) {
      return res.status(400).json({ error: 'Status deve ser aprovado ou rejeitado' });
    }

    const { data, error } = await supabase
      .from('rh_ferias_licencas')
      .update({ status, aprovado_por: req.user.userId })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // Atualiza status do funcionário se aprovado
    if (status === 'aprovado') {
      const tipo = data.tipo === 'ferias' ? 'ferias' : 'licenca';
      await supabase.from('rh_funcionarios').update({ status: tipo }).eq('id', data.funcionario_id);
    }

    // Notificar o funcionário sobre aprovação/rejeição
    try {
      const statusTexto = status === 'aprovado' ? 'aprovadas' : 'rejeitadas';
      const { data: func } = await supabase.from('rh_funcionarios').select('user_id').eq('id', data.funcionario_id).single();
      await notificar({
        modulo: 'rh',
        tipo: 'ferias_status',
        titulo: `Férias ${statusTexto}`,
        mensagem: `Suas férias foram ${statusTexto}`,
        link: '/admin/rh?tab=ferias',
        severidade: status === 'aprovado' ? 'info' : 'aviso',
        chaveDedup: `ferias-status-${data.id}`,
        targetIds: func?.user_id ? [func.user_id] : undefined,
      });
    } catch (notifErr) {
      console.error('[RH] Erro ao notificar status férias:', notifErr.message);
    }

    res.json(data);
  } catch (e) {
    console.error('[RH] Aprovar/rejeitar férias:', e.message);
    res.status(500).json({ error: 'Erro ao atualizar férias/licença' });
  }
});

// DELETE /api/rh/ferias/:id
router.delete('/ferias/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('rh_ferias_licencas').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) {
    console.error('[RH] Remover férias:', e.message);
    res.status(500).json({ error: 'Erro ao remover férias/licença' });
  }
});

// ── KPIs ──────────────────────────────────────────────────────
// GET /api/rh/kpis
router.get('/kpis', async (req, res) => {
  try {
    const [{ count: total }, { count: ativos }, { count: ferias }, admissoes] = await Promise.all([
      supabase.from('rh_funcionarios').select('*', { count: 'exact', head: true }),
      supabase.from('rh_funcionarios').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
      supabase.from('rh_funcionarios').select('*', { count: 'exact', head: true }).in('status', ['ferias', 'licenca']),
      supabase.from('rh_funcionarios')
        .select('id, nome, cargo, data_admissao')
        .gte('data_admissao', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
        .order('data_admissao', { ascending: false }),
    ]);

    res.json({
      total_funcionarios: total ?? 0,
      ativos: ativos ?? 0,
      em_ferias_licenca: ferias ?? 0,
      admissoes_mes: admissoes.data ?? [],
    });
  } catch (e) {
    console.error('[RH] KPIs:', e.message);
    res.status(500).json({ error: 'Erro ao carregar KPIs' });
  }
});

// ══════════════════════════════════════════════════════════
// ESCALAS DE EXTRAS
// ══════════════════════════════════════════════════════════

// GET /api/rh/extras
router.get('/extras', async (req, res) => {
  try {
    const { status, mes } = req.query;
    let query = supabase
      .from('rh_escalas_extras')
      .select('*, funcionario:rh_funcionarios(id, nome, cpf, cargo, foto_url)')
      .order('data', { ascending: true });

    if (status) query = query.eq('status', status);
    if (mes) {
      const [year, month] = mes.split('-');
      const start = `${year}-${month}-01`;
      const end = new Date(year, month, 0).toISOString().split('T')[0];
      query = query.gte('data', start).lte('data', end);
    }

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    console.error('[RH] Listar extras:', e.message);
    res.status(500).json({ error: 'Erro ao buscar escalas de extras' });
  }
});

// POST /api/rh/extras — escalar funcionário + enviar notificação
router.post('/extras', async (req, res) => {
  try {
    const { funcionario_id, titulo, descricao, data, horario_inicio, horario_fim, valor, observacoes } = req.body;

    // Criar escala
    const { data: escala, error } = await supabase
      .from('rh_escalas_extras')
      .insert({
        funcionario_id, titulo, descricao, data,
        horario_inicio, horario_fim, valor,
        escalado_por: req.user.id, observacoes,
      })
      .select('*, funcionario:rh_funcionarios(nome, email)')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // Buscar profile_id do funcionário pelo email (se tiver conta no sistema)
    if (escala.funcionario?.email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', escala.funcionario.email)
        .single();

      if (profile) {
        // Criar notificação
        await supabase.from('notificacoes').insert({
          usuario_id: profile.id,
          titulo: '📋 Escala de Extra',
          mensagem: `Você foi escalado para "${titulo}" em ${new Date(data).toLocaleDateString('pt-BR')} das ${horario_inicio} às ${horario_fim}. Valor: R$ ${Number(valor).toFixed(2)}${descricao ? '. ' + descricao : ''}`,
          tipo: 'extra',
          link: '/admin/rh?tab=extras',
          dados: { escala_id: escala.id, data, horario_inicio, horario_fim, valor },
        });
      }
    }

    res.status(201).json(escala);
  } catch (e) {
    console.error('[RH] Criar extra:', e.message);
    res.status(500).json({ error: 'Erro ao criar escala de extra' });
  }
});

// PATCH /api/rh/extras/:id
router.patch('/extras/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rh_escalas_extras')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    console.error('[RH] Atualizar extra:', e.message);
    res.status(500).json({ error: 'Erro ao atualizar extra' });
  }
});

// DELETE /api/rh/extras/:id
router.delete('/extras/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('rh_escalas_extras').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) {
    console.error('[RH] Remover extra:', e.message);
    res.status(500).json({ error: 'Erro ao remover extra' });
  }
});

// GET /api/rh/config (valor padrão de extra, etc.)
router.get('/config', async (req, res) => {
  try {
    const { data, error } = await supabase.from('rh_config').select('*');
    if (error) return res.status(400).json({ error: error.message });
    const config = {};
    (data || []).forEach(r => { config[r.chave] = r.valor; });
    res.json(config);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// PUT /api/rh/config/:chave
router.put('/config/:chave', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rh_config')
      .upsert({ chave: req.params.chave, valor: req.body.valor })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao salvar configuração' });
  }
});

// ── MATERIAIS DE TREINAMENTO ──────────────────────────────

// GET /api/rh/materiais?treinamento_id=xxx
router.get('/materiais', async (req, res) => {
  try {
    let query = supabase
      .from('rh_materiais')
      .select('*, rh_materiais_funcionarios(*, funcionario:rh_funcionarios(id, nome, cargo, foto_url))')
      .order('created_at', { ascending: false });

    if (req.query.treinamento_id) {
      query = query.eq('treinamento_id', req.query.treinamento_id);
    }

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    console.error('[RH] Listar materiais:', e.message);
    res.status(500).json({ error: 'Erro ao listar materiais' });
  }
});

// POST /api/rh/materiais
router.post('/materiais', async (req, res) => {
  try {
    const { treinamento_id, titulo, descricao, tipo, arquivo_url, arquivo_nome, arquivo_tipo, obrigatorio } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Título é obrigatório' });

    const { data, error } = await supabase
      .from('rh_materiais')
      .insert({
        treinamento_id: treinamento_id || null,
        titulo, descricao: descricao || null,
        tipo: tipo || 'material',
        arquivo_url: arquivo_url || null,
        arquivo_nome: arquivo_nome || null,
        arquivo_tipo: arquivo_tipo || null,
        obrigatorio: obrigatorio || false,
        created_by: req.user.userId,
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) {
    console.error('[RH] Criar material:', e.message);
    res.status(500).json({ error: 'Erro ao criar material' });
  }
});

// DELETE /api/rh/materiais/:id
router.delete('/materiais/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('rh_materiais').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) {
    console.error('[RH] Remover material:', e.message);
    res.status(500).json({ error: 'Erro ao remover material' });
  }
});

// POST /api/rh/materiais/:id/enviar — envia material para colaboradores
router.post('/materiais/:id/enviar', async (req, res) => {
  try {
    const { funcionario_ids } = req.body;
    if (!funcionario_ids || !funcionario_ids.length) {
      return res.status(400).json({ error: 'Selecione ao menos um colaborador' });
    }

    const rows = funcionario_ids.map(fid => ({
      material_id: req.params.id,
      funcionario_id: fid,
      status: 'pendente',
    }));

    const { data, error } = await supabase
      .from('rh_materiais_funcionarios')
      .upsert(rows, { onConflict: 'material_id,funcionario_id' })
      .select('*, funcionario:rh_funcionarios(id, nome, cargo, foto_url)');

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) {
    console.error('[RH] Enviar material:', e.message);
    res.status(500).json({ error: 'Erro ao enviar material' });
  }
});

// PATCH /api/rh/materiais-funcionarios/:id — atualiza status (visualizado/concluido)
router.patch('/materiais-funcionarios/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const update = { status };
    if (status === 'visualizado') update.data_visualizacao = new Date().toISOString();
    if (status === 'concluido') update.data_conclusao = new Date().toISOString();

    const { data, error } = await supabase
      .from('rh_materiais_funcionarios')
      .update(update)
      .eq('id', req.params.id)
      .select('*, funcionario:rh_funcionarios(id, nome, cargo, foto_url)')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    console.error('[RH] Atualizar status material:', e.message);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMISSÕES
// ═══════════════════════════════════════════════════════════

// GET /api/rh/admissoes
router.get('/admissoes', async (req, res) => {
  try {
    let query = supabase.from('rh_admissoes').select('*').order('created_at', { ascending: false });
    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.tipo_contrato) query = query.eq('tipo_contrato', req.query.tipo_contrato);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('[RH] Listar admissões:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/rh/admissoes/:id
router.get('/admissoes/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('rh_admissoes').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/rh/admissoes
router.post('/admissoes', async (req, res) => {
  try {
    const { data, error } = await supabase.from('rh_admissoes')
      .insert({ ...req.body, created_by: req.user.id })
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('[RH] Criar admissão:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/rh/admissoes/:id
router.patch('/admissoes/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('rh_admissoes')
      .update(req.body)
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('[RH] Atualizar admissão:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/rh/admissoes/:id
router.delete('/admissoes/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('rh_admissoes').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/rh/admissoes/:id/concluir — finaliza admissão e cria funcionário
router.post('/admissoes/:id/concluir', async (req, res) => {
  try {
    const { data: adm, error: admErr } = await supabase.from('rh_admissoes').select('*').eq('id', req.params.id).single();
    if (admErr) throw admErr;

    // Cria funcionário a partir da admissão
    const funcData = {
      nome: adm.nome,
      cpf: adm.cpf,
      email: adm.email,
      telefone: adm.telefone,
      cargo: adm.cargo,
      area: adm.area,
      tipo_contrato: adm.tipo_contrato,
      data_admissao: adm.data_inicio || new Date().toISOString().slice(0, 10),
      salario: adm.salario,
      status: 'ativo',
      observacoes: adm.observacoes,
      created_by: req.user.id,
    };

    const { data: func, error: funcErr } = await supabase.from('rh_funcionarios')
      .insert(funcData).select().single();
    if (funcErr) throw funcErr;

    // Atualiza admissão como concluída
    await supabase.from('rh_admissoes')
      .update({ status: 'concluido', funcionario_id: func.id })
      .eq('id', req.params.id);

    // Notificar RH sobre admissão concluída
    try {
      await notificar({
        modulo: 'rh',
        tipo: 'admissao_concluida',
        titulo: 'Admissão concluída',
        mensagem: `Admissão concluída: ${adm.nome}`,
        link: '/admin/rh?tab=admissoes',
        severidade: 'info',
        chaveDedup: `admissao-concluida-${adm.id}`,
      });
    } catch (notifErr) {
      console.error('[RH] Erro ao notificar admissão:', notifErr.message);
    }

    res.json({ admissao: adm, funcionario: func });
  } catch (e) {
    console.error('[RH] Concluir admissão:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// AVALIAÇÕES DE DESEMPENHO
// ═══════════════════════════════════════════════════════════

router.get('/avaliacoes', async (req, res) => {
  try {
    let query = supabase.from('rh_avaliacoes')
      .select('*, rh_funcionarios(nome, cargo, area, foto_url)')
      .order('created_at', { ascending: false });
    if (req.query.funcionario_id) query = query.eq('funcionario_id', req.query.funcionario_id);
    if (req.query.periodo) query = query.eq('periodo', req.query.periodo);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/avaliacoes', async (req, res) => {
  try {
    const body = { ...req.body, avaliador_id: req.user.id };
    // Calcular nota geral
    const notas = [body.nota_produtividade, body.nota_qualidade, body.nota_pontualidade, body.nota_trabalho_equipe, body.nota_iniciativa, body.nota_comunicacao].filter(n => n);
    if (notas.length) body.nota_geral = (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1);
    const { data, error } = await supabase.from('rh_avaliacoes').insert(body).select().single();
    if (error) throw error;

    // Notificar RH sobre nova avaliação
    try {
      const { data: func } = await supabase.from('rh_funcionarios').select('nome').eq('id', body.funcionario_id).single();
      await notificar({
        modulo: 'rh',
        tipo: 'avaliacao_criada',
        titulo: 'Nova avaliação registrada',
        mensagem: `Nova avaliação registrada para ${func?.nome || 'Funcionário'}`,
        link: '/admin/rh?tab=avaliacoes',
        severidade: 'info',
        chaveDedup: `avaliacao-criada-${data.id}`,
      });
    } catch (notifErr) {
      console.error('[RH] Erro ao notificar avaliação:', notifErr.message);
    }

    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/avaliacoes/:id', async (req, res) => {
  try {
    const body = { ...req.body };
    const notas = [body.nota_produtividade, body.nota_qualidade, body.nota_pontualidade, body.nota_trabalho_equipe, body.nota_iniciativa, body.nota_comunicacao].filter(n => n);
    if (notas.length) body.nota_geral = (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1);
    const { data, error } = await supabase.from('rh_avaliacoes').update(body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/avaliacoes/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('rh_avaliacoes').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
