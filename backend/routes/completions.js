const router = require('express').Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');
const storage = require('../services/storageService');

router.use(authenticate);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: storage.MAX_FILE_SIZE } });

// ── POST /api/completions — registrar conclusão de um card ──
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const {
      task_id, event_id, event_phase_id,
      phase_number, area, event_name,
    } = req.body;

    if (!task_id || !event_id) return res.status(400).json({ error: 'task_id e event_id são obrigatórios' });

    // Buscar task para snapshot
    const { data: task } = await supabase.from('cycle_phase_tasks')
      .select('titulo, entrega, responsavel_nome, subtasks:cycle_task_subtasks(name, done)')
      .eq('id', task_id).single();

    // Upload do arquivo (se enviado)
    let fileData = {};
    if (req.file) {
      const evName = event_name || event_id;
      const phaseStr = `F${String(phase_number || 0).padStart(2, '0')}`;
      const result = await storage.uploadFile(evName, `${phaseStr}/${area || 'geral'}`, req.file.originalname, req.file.buffer, req.file.mimetype);
      fileData = {
        file_name: req.file.originalname,
        file_url: result.url || null,
        file_sharepoint_path: result.provider === 'sharepoint' ? result.path : null,
        file_supabase_path: result.provider === 'supabase' ? result.path : null,
        file_sharepoint_item_id: result.itemId || null,
        file_mime_type: req.file.mimetype,
      };
    }

    // Salvar conclusão
    const { data: completion, error } = await supabase.from('card_completions').insert({
      task_id,
      event_id,
      event_phase_id: event_phase_id || null,
      phase_number: parseInt(phase_number) || 0,
      area: area || '',
      card_titulo: task?.titulo || req.body.card_titulo || '',
      card_subtarefas: task?.subtasks ? { items: task.subtasks } : null,
      observacao: req.body.observacao || null,
      ...fileData,
      completed_by: req.user.userId,
      completed_by_name: req.user.name,
    }).select().single();
    if (error) throw error;

    // Atualizar status do card para 'concluida'
    await supabase.from('cycle_phase_tasks')
      .update({ status: 'concluida' })
      .eq('id', task_id);

    // Recalcular status da fase
    if (event_phase_id) {
      const { data: phaseTasks } = await supabase.from('cycle_phase_tasks')
        .select('id, status').eq('event_phase_id', event_phase_id);
      if (phaseTasks) {
        const done = phaseTasks.filter(t => t.status === 'concluida').length;
        const pct = Math.round(done / phaseTasks.length * 100);
        const newStatus = pct === 100 ? 'concluida' : pct > 0 ? 'em_andamento' : 'pendente';
        await supabase.from('event_cycle_phases')
          .update({ status: newStatus }).eq('id', event_phase_id);
      }
    }

    res.json({ success: true, completion });
  } catch (err) {
    console.error('[COMPLETION POST]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/completions/task/:taskId — buscar conclusão de um card ──
router.get('/task/:taskId', async (req, res) => {
  try {
    const { data } = await supabase.from('card_completions')
      .select('*')
      .eq('task_id', req.params.taskId)
      .is('reopened_at', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Gerar URL assinada se tem arquivo no Supabase
    if (data?.file_supabase_path) {
      try { data.file_signed_url = await storage.getSignedUrl(data.file_supabase_path); } catch {}
    }
    if (data?.file_url) data.file_signed_url = data.file_url;

    res.json(data || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/completions/:taskId/reopen — PMO reabre card concluído ──
router.delete('/:taskId/reopen', async (req, res) => {
  try {
    // Só PMO (admin/diretor) pode reabrir
    if (!['admin', 'diretor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Apenas PMO pode reabrir cards' });
    }

    const { reason } = req.body || {};

    // Marcar conclusão como reaberta
    await supabase.from('card_completions')
      .update({
        reopened_by: req.user.userId,
        reopened_at: new Date().toISOString(),
        reopen_reason: reason || null,
      })
      .eq('task_id', req.params.taskId)
      .is('reopened_at', null);

    // Voltar status do card e buscar phase_id para recalcular
    const { data: task } = await supabase.from('cycle_phase_tasks')
      .update({ status: 'a_fazer' })
      .eq('id', req.params.taskId)
      .select('event_phase_id')
      .single();

    // Recalcular status da fase
    if (task?.event_phase_id) {
      const { data: phaseTasks } = await supabase.from('cycle_phase_tasks')
        .select('id, status').eq('event_phase_id', task.event_phase_id);
      if (phaseTasks) {
        const done = phaseTasks.filter(t => t.status === 'concluida').length;
        const pct = Math.round(done / phaseTasks.length * 100);
        const newStatus = pct === 100 ? 'concluida' : pct > 0 ? 'em_andamento' : 'pendente';
        await supabase.from('event_cycle_phases')
          .update({ status: newStatus }).eq('id', task.event_phase_id);
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/completions/event/:eventId — todas conclusões de um evento ──
router.get('/event/:eventId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('card_completions')
      .select('*')
      .eq('event_id', req.params.eventId)
      .is('reopened_at', null)
      .order('completed_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
