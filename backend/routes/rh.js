const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');

const ADMIN = ['admin', 'diretor'];

// ── FUNCIONÁRIOS ─────────────────────────────────────────────

// GET /api/rh/funcionarios
router.get('/funcionarios', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const { status, area, tipo_contrato } = req.query;
    let query = supabase
      .from('rh_funcionarios')
      .select('*, rh_ferias_licencas(tipo, data_inicio, data_fim, status)')
      .order('nome');

    if (status)         query = query.eq('status', status);
    if (area)           query = query.eq('area', area);
    if (tipo_contrato)  query = query.eq('tipo_contrato', tipo_contrato);

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('[RH] GET /funcionarios:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/rh/funcionarios/:id
router.get('/funcionarios/:id', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rh_funcionarios')
      .select('*, rh_documentos(*), rh_ferias_licencas(*), rh_treinamentos_funcionarios(*, rh_treinamentos(*))')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'Funcionário não encontrado' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/rh/funcionarios
router.post('/funcionarios', authenticate, authorize('diretor'), async (req, res) => {
  try {
    const payload = { ...req.body, created_by: req.user.userId };
    const { data, error } = await supabase
      .from('rh_funcionarios')
      .insert(payload)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/rh/funcionarios/:id
router.put('/funcionarios/:id', authenticate, authorize('diretor'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rh_funcionarios')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /api/rh/funcionarios/:id (desativação lógica)
router.delete('/funcionarios/:id', authenticate, authorize('diretor'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('rh_funcionarios')
      .update({ status: 'inativo', data_demissao: new Date().toISOString().split('T')[0] })
      .eq('id', req.params.id);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ── TREINAMENTOS ─────────────────────────────────────────────

// GET /api/rh/treinamentos
router.get('/treinamentos', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rh_treinamentos')
      .select('*, rh_treinamentos_funcionarios(status, rh_funcionarios(nome))')
      .order('data_inicio', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/rh/treinamentos
router.post('/treinamentos', authenticate, authorize('diretor'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rh_treinamentos')
      .insert(req.body)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/rh/treinamentos/:id/inscrever
router.post('/treinamentos/:id/inscrever', authenticate, authorize('diretor'), async (req, res) => {
  try {
    const { funcionario_ids } = req.body;
    const insercoes = funcionario_ids.map((fid) => ({
      treinamento_id: req.params.id,
      funcionario_id: fid,
      status: 'inscrito',
    }));
    const { data, error } = await supabase
      .from('rh_treinamentos_funcionarios')
      .upsert(insercoes)
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ── FÉRIAS / LICENÇAS ─────────────────────────────────────────

// GET /api/rh/ferias
router.get('/ferias', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('rh_ferias_licencas')
      .select('*, rh_funcionarios(nome, cargo, area)')
      .order('data_inicio', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/rh/ferias
router.post('/ferias', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rh_ferias_licencas')
      .insert(req.body)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PATCH /api/rh/ferias/:id/aprovar
router.patch('/ferias/:id/aprovar', authenticate, authorize('diretor'), async (req, res) => {
  try {
    const { status } = req.body; // 'aprovado' ou 'rejeitado'
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

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ── KPIs ──────────────────────────────────────────────────────

// GET /api/rh/kpis
router.get('/kpis', authenticate, authorize(...ADMIN), async (req, res) => {
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
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
