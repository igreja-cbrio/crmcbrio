const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');

router.use(authenticate);

// GET /api/meetings
router.get('/', async (req, res) => {
  try {
    const { eventId, projectId } = req.query;
    let query = supabase.from('meetings').select('*').order('date', { ascending: false });
    if (eventId) query = query.eq('event_id', eventId);
    if (projectId) query = query.eq('project_id', projectId);
    const { data: meetings, error } = await query;
    if (error) throw error;

    const meetingIds = meetings.map(m => m.id);
    const { data: allPends } = meetingIds.length > 0
      ? await supabase.from('pendencies').select('*').in('meeting_id', meetingIds).order('created_at')
      : { data: [] };

    const result = meetings.map(m => ({
      ...m,
      pendencies: (allPends || []).filter(p => p.meeting_id === m.id),
    }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: 'Erro ao buscar reuniões' }); }
});

// POST /api/meetings
router.post('/', async (req, res) => {
  try {
    const d = req.body;
    const { data: meeting, error } = await supabase.from('meetings').insert({
      event_id: d.event_id || null, occurrence_id: d.occurrence_id || null,
      project_id: d.project_id || null, title: d.title || 'Reunião', date: d.date,
      occurrence_date: d.occurrence_date || null,
      participants: d.participants || [], decisions: d.decisions || '',
      notes: d.notes || '', created_by: req.user.userId,
    }).select().single();
    if (error) throw error;

    if (d.pendencies && Array.isArray(d.pendencies)) {
      const pends = d.pendencies.filter(p => p.description).map(p => ({
        event_id: d.event_id || null, meeting_id: meeting.id, project_id: d.project_id || null,
        description: p.description, responsible: p.responsible || '', area: p.area || '',
        deadline: p.deadline || null,
      }));
      if (pends.length > 0) await supabase.from('pendencies').insert(pends);
    }
    if (d.event_id) await supabase.from('audit_log').insert({ table_name: 'meetings', record_id: meeting.id, event_id: d.event_id, action: 'create', description: `Reunião criada: ${d.title || 'Reunião'}`, changed_by: req.user.userId, changed_by_name: req.user.name });
    res.json(meeting);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao criar reunião' }); }
});

// PUT /api/meetings/:id
router.put('/:id', async (req, res) => {
  try {
    const d = req.body;
    const { data, error } = await supabase.from('meetings').update({
      title: d.title, date: d.date, participants: d.participants || [],
      decisions: d.decisions || '', notes: d.notes || '',
    }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Erro' }); }
});

// DELETE /api/meetings/:id
router.delete('/:id', async (req, res) => {
  try {
    await supabase.from('meetings').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro' }); }
});

// ── PENDENCIES ──
router.patch('/pendencies/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('pendencies').update({
      done: req.body.done, done_at: req.body.done ? new Date().toISOString() : null,
    }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Erro' }); }
});

router.delete('/pendencies/:id', async (req, res) => {
  try {
    await supabase.from('pendencies').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro' }); }
});

module.exports = router;
