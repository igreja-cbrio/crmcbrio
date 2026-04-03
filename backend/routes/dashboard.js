const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');

router.use(authenticate);

// GET /api/dashboard/pmo — KPIs agregados
router.get('/pmo', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vw_pmo_kpis').select('*').single();
    if (error) throw error;
    res.json(data);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao buscar KPIs' }); }
});

// GET /api/dashboard/workload — carga por responsável
router.get('/workload', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vw_workload').select('*');
    if (error) throw error;
    res.json(data);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao buscar carga' }); }
});

// POST /api/dashboard/sync-areas — sincronizar area dos profiles com RH
router.post('/sync-areas', async (req, res) => {
  try {
    const { data: profiles } = await supabase.from('profiles').select('id, email, area');
    const { data: funcionarios } = await supabase.from('rh_funcionarios').select('email, area, cargo').eq('status', 'ativo');

    let updated = 0;
    for (const f of (funcionarios || [])) {
      if (!f.email || !f.email.trim()) continue;
      const p = (profiles || []).find(pr => pr.email === f.email);
      if (p && (!p.area || p.area !== f.area)) {
        await supabase.from('profiles').update({ area: f.area }).eq('id', p.id);
        updated++;
      }
    }
    res.json({ success: true, updated, message: `${updated} profiles sincronizados com RH` });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

module.exports = router;
