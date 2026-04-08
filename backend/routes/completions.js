const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');
const { getGraphToken, ensureSharePointFolder, sanitizePath, SHAREPOINT_CONFIGURED } = require('../services/storageService');
require('dotenv').config();

router.use(authenticate);

// ── POST /api/completions/upload-url — gerar URL de upload direto para SharePoint ──
router.post('/upload-url', async (req, res) => {
  try {
    const { fileName, eventName, phaseName, area } = req.body;
    if (!fileName) return res.status(400).json({ error: 'fileName é obrigatório' });
    if (!SHAREPOINT_CONFIGURED) return res.status(400).json({ error: 'SharePoint não configurado (variáveis de ambiente ausentes)' });

    const siteId = process.env.SHAREPOINT_SITE_ID;
    const token = await getGraphToken();
    const safeName = sanitizePath(fileName);
    const folder = `Eventos/${sanitizePath(eventName || 'geral')}/${sanitizePath(phaseName || 'geral')}`;
    const filePath = `${folder}/${safeName}`;

    // Garantir que a estrutura de pastas existe no SharePoint
    await ensureSharePointFolder(folder);

    // Criar upload session (suporta arquivos de qualquer tamanho)
    const sessionRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${filePath}:/createUploadSession`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'rename' } }),
    });
    const session = await sessionRes.json();
    if (!session.uploadUrl) throw new Error('Falha ao criar sessão de upload');

    res.json({
      uploadUrl: session.uploadUrl,
      sharepointPath: filePath,
      fileName: safeName,
    });
  } catch (err) {
    console.error('[COMPLETION UPLOAD-URL]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/completions — registrar conclusão de um card ──
// Aceita JSON com array de files (metadata dos uploads já feitos pelo frontend)
router.post('/', async (req, res) => {
  try {
    const {
      task_id, event_id, event_phase_id,
      phase_number, area, observacao,
      files, // array: [{ file_name, file_url, sharepoint_path, mime_type, size }]
    } = req.body;

    if (!task_id || !event_id) return res.status(400).json({ error: 'task_id e event_id são obrigatórios' });

    // Buscar task para snapshot
    const { data: task } = await supabase.from('cycle_phase_tasks')
      .select('titulo, entrega, responsavel_nome, subtasks:cycle_task_subtasks(name, done)')
      .eq('id', task_id).single();

    // Montar dados do primeiro arquivo (para card_completions — backward compat)
    const firstFile = (files && files.length > 0) ? files[0] : null;

    // Salvar conclusão
    const { data: completion, error } = await supabase.from('card_completions').insert({
      task_id,
      event_id,
      event_phase_id: event_phase_id || null,
      phase_number: parseInt(phase_number) || 0,
      area: area || '',
      card_titulo: task?.titulo || '',
      card_subtarefas: task?.subtasks ? { items: task.subtasks } : null,
      observacao: observacao || null,
      file_name: firstFile?.file_name || null,
      file_url: firstFile?.file_url || null,
      file_sharepoint_path: firstFile?.sharepoint_path || null,
      file_mime_type: firstFile?.mime_type || null,
      completed_by: req.user.userId,
      completed_by_name: req.user.name,
    }).select().single();
    if (error) throw error;

    // Salvar todos os arquivos em event_task_attachments (para relatório IA)
    if (files && files.length > 0) {
      const filesWithoutUrl = files.filter(f => !f.file_url);
      if (filesWithoutUrl.length > 0) {
        console.warn(`[COMPLETION POST] ${filesWithoutUrl.length} arquivo(s) sem URL SharePoint:`, filesWithoutUrl.map(f => f.file_name));
      }
      const attachments = files.map(f => ({
        cycle_task_id: task_id,
        event_id,
        file_name: f.file_name,
        file_type: f.mime_type,
        file_size: f.size || null,
        sharepoint_url: f.file_url || null,
        sharepoint_item_id: f.sharepoint_item_id || null,
        phase_name: req.body.phase_name || null,
        area: area || null,
        description: observacao || null,
        uploaded_by: req.user.userId,
        uploaded_by_name: req.user.name,
      }));
      await supabase.from('event_task_attachments').insert(attachments);
    }

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

    res.json({ success: true, completion, filesCount: files?.length || 0 });
  } catch (err) {
    console.error('[COMPLETION POST]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/completions/task/:taskId — buscar conclusão + arquivos ──
router.get('/task/:taskId', async (req, res) => {
  try {
    const { data } = await supabase.from('card_completions')
      .select('*')
      .eq('task_id', req.params.taskId)
      .is('reopened_at', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Buscar todos os arquivos vinculados
    let files = [];
    if (data) {
      const { data: attachs } = await supabase.from('event_task_attachments')
        .select('*')
        .eq('cycle_task_id', req.params.taskId)
        .order('created_at', { ascending: false });
      files = attachs || [];
    }

    res.json(data ? { ...data, files } : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/completions/:taskId/reopen — PMO reabre card concluído ──
router.delete('/:taskId/reopen', async (req, res) => {
  try {
    if (!['admin', 'diretor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Apenas PMO pode reabrir cards' });
    }

    const { reason } = req.body || {};

    await supabase.from('card_completions')
      .update({
        reopened_by: req.user.userId,
        reopened_at: new Date().toISOString(),
        reopen_reason: reason || null,
      })
      .eq('task_id', req.params.taskId)
      .is('reopened_at', null);

    const { data: task } = await supabase.from('cycle_phase_tasks')
      .update({ status: 'a_fazer' })
      .eq('id', req.params.taskId)
      .select('event_phase_id')
      .single();

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

// ── GET /api/completions/event/:eventId ──
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
