const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');

router.use(authenticate);

// GET /api/notificacoes — listar notificações do usuário logado
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('usuario_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
});

// GET /api/notificacoes/count — contar não lidas
router.get('/count', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('notificacoes')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', req.user.id)
      .eq('lida', false);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ count: count || 0 });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao contar notificações' });
  }
});

// PATCH /api/notificacoes/:id/ler — marcar como lida
router.patch('/:id/ler', async (req, res) => {
  try {
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', req.params.id)
      .eq('usuario_id', req.user.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao marcar notificação' });
  }
});

// PATCH /api/notificacoes/ler-todas
router.patch('/ler-todas', async (req, res) => {
  try {
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('usuario_id', req.user.id)
      .eq('lida', false);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao marcar notificações' });
  }
});

module.exports = router;
