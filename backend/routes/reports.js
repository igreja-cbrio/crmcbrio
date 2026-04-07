const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');
const storage = require('../services/storageService');
const AgentService = require('../services/agentService');

router.use(authenticate);

// ── Text extraction helpers ──
async function extractText(buffer, mimeType, fileName) {
  try {
    if (mimeType === 'application/pdf') {
      const pdf = require('pdf-parse');
      const data = await pdf(buffer);
      return data.text?.slice(0, 15000) || '';
    }
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName?.endsWith('.docx')) {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value?.slice(0, 15000) || '';
    }
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || fileName?.endsWith('.xlsx')) {
      const XLSX = require('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let text = '';
      for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name];
        text += `\n--- Planilha: ${name} ---\n`;
        text += XLSX.utils.sheet_to_csv(sheet);
      }
      return text.slice(0, 15000);
    }
    // Images and others — just return metadata
    return `[Arquivo binário: ${fileName || 'desconhecido'}, tipo: ${mimeType}]`;
  } catch (e) {
    return `[Erro ao extrair texto de ${fileName}: ${e.message}]`;
  }
}

// POST /api/events/:eventId/report — gerar relatório por IA
router.post('/:eventId/report', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { type = 'full', phase_name } = req.body;

    // Buscar evento
    const { data: event } = await supabase.from('events').select('name, date, status, description').eq('id', eventId).single();
    if (!event) return res.status(404).json({ error: 'Evento não encontrado' });

    // Buscar anexos
    let q = supabase.from('event_task_attachments').select('*').eq('event_id', eventId);
    if (type === 'phase' && phase_name) q = q.eq('phase_name', phase_name);
    const { data: attachs } = await q.order('created_at');

    // Buscar conclusões de cards (card_completions)
    let compQ = supabase.from('card_completions').select('*').eq('event_id', eventId).is('reopened_at', null);
    if (type === 'phase' && phase_name) {
      // Buscar phase_number da fase pelo nome
      const { data: phaseRow } = await supabase.from('event_cycle_phases')
        .select('numero_fase').eq('event_id', eventId).eq('nome_fase', phase_name).limit(1).maybeSingle();
      if (phaseRow) compQ = compQ.eq('phase_number', phaseRow.numero_fase);
    }
    const { data: completions } = await compQ.order('completed_at');

    if ((!attachs || attachs.length === 0) && (!completions || completions.length === 0)) {
      return res.status(400).json({ error: 'Nenhum anexo ou conclusão encontrado para gerar relatório.' });
    }

    // Extrair texto dos arquivos
    const fileContents = [];
    for (const a of attachs) {
      let text = '';
      if (a.supabase_path || a.sharepoint_item_id) {
        try {
          const buffer = await storage.downloadFile(a.supabase_path, a.sharepoint_item_id);
          text = await extractText(buffer, a.file_type, a.file_name);
        } catch (e) {
          text = `[Erro ao ler ${a.file_name}: ${e.message}]`;
        }
      }
      fileContents.push({
        file_name: a.file_name,
        area: a.area || 'não especificada',
        phase: a.phase_name || 'geral',
        description: a.description || '',
        uploaded_by: a.uploaded_by_name || 'desconhecido',
        content: text,
      });
    }

    // Montar dados de conclusões para o prompt
    const completionsSummary = (completions || []).map(c =>
      `- Card: "${c.card_titulo}" | Área: ${c.area} | Fase: ${c.phase_number} | Concluído por: ${c.completed_by_name || 'desconhecido'} em ${new Date(c.completed_at).toLocaleDateString('pt-BR')}${c.observacao ? ` | Observação: "${c.observacao}"` : ''}${c.file_name ? ` | Arquivo: ${c.file_name}` : ''}`
    ).join('\n');

    // Montar prompt
    const scope = type === 'phase' ? `Fase: ${phase_name}` : 'Evento Completo';
    const system = `Você é um analista de eventos da Igreja Comunidade Batista do Rio de Janeiro (CBRio).
Gere um relatório estruturado em markdown com base nos entregáveis e conclusões de cards.

Evento: ${event.name}
Data: ${event.date || 'não definida'}
Escopo: ${scope}
Total de anexos: ${attachs?.length || 0}
Total de cards concluídos: ${completions?.length || 0}

O relatório deve conter:
1. **Resumo Executivo** — visão geral do que foi entregue
2. **Entregas por Área** — o que cada área (marketing, produção, financeiro, etc.) entregou, quem concluiu e quando
3. **Status Geral** — avaliação da completude (cards concluídos vs pendentes)
4. **Observações dos Responsáveis** — destaque as observações relevantes registradas nas conclusões
5. **Pontos de Atenção** — gaps, entregas faltantes ou problemas identificados
6. **Recomendações** — próximos passos sugeridos

Baseie-se APENAS nos dados fornecidos. Não invente informações.`;

    let userMessage = '';
    if (fileContents.length > 0) {
      userMessage += '=== ARQUIVOS ANEXADOS ===\n' + fileContents.map((f, i) =>
        `--- Arquivo ${i + 1}: ${f.file_name} ---\nÁrea: ${f.area}\nFase: ${f.phase}\nDescrição: ${f.description}\nEnviado por: ${f.uploaded_by}\n\nConteúdo:\n${f.content}\n`
      ).join('\n');
    }
    if (completionsSummary) {
      userMessage += '\n=== CONCLUSÕES DE CARDS ===\n' + completionsSummary;
    }

    // Criar run do agente
    const agent = await AgentService.createRun('event_report', req.user.userId, { eventId, type, phase_name });
    const result = await agent.call({
      model: 'claude-sonnet-4-20250514',
      system,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 4096,
      role: 'report',
    });
    await agent.finalize();

    const reportContent = result.text || 'Não foi possível gerar o relatório.';

    // Salvar no banco
    const { data: report, error } = await supabase.from('event_reports').insert({
      event_id: eventId,
      phase_name: type === 'phase' ? phase_name : null,
      report_type: type,
      content: reportContent,
      generated_by: req.user.userId,
      attachments_count: attachs.length,
      token_cost: agent.totalCost,
    }).select().single();
    if (error) throw error;

    res.json(report);
  } catch (e) {
    console.error('[Reports] Generate:', e.message);
    res.status(500).json({ error: e.message || 'Erro ao gerar relatório' });
  }
});

// GET /api/events/:eventId/reports — listar relatórios
router.get('/:eventId/reports', async (req, res) => {
  try {
    const { data, error } = await supabase.from('event_reports')
      .select('*')
      .eq('event_id', req.params.eventId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar relatórios' });
  }
});

// GET /api/events/:eventId/reports/:id — ler relatório
router.get('/:eventId/reports/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('event_reports')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar relatório' });
  }
});

module.exports = router;
