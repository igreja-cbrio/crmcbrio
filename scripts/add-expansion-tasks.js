const path = require('path');
module.paths.unshift(path.join(__dirname, '../backend/node_modules'));
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 5 tarefas padrão por marco (baseado nos planos de ação dos documentos do SharePoint)
const TASK_TEMPLATES = [
  { name: 'Definição de escopo, cronograma e alocação de recursos', phase: 'planejamento', offset: 0 },
  { name: 'Mobilização de equipe, aquisição de insumos e comunicação', phase: 'preparacao', offset: 0.2 },
  { name: null, phase: 'execucao', offset: 0.3 }, // nome será "Execução: {nome do marco}"
  { name: null, phase: 'entrega', offset: 0.7 }, // nome será "Entrega: {entrega esperada}"
  { name: 'Análise de resultados, lições aprendidas e relatório final', phase: 'avaliacao', offset: 0.85 },
];

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function run() {
  console.log('Adicionando tarefas aos 93 marcos estratégicos...\n');

  const { data: milestones } = await supabase
    .from('expansion_milestones')
    .select('id, name, responsible, area, date_start, date_end, expected_delivery')
    .order('sort_order');

  let totalTasks = 0, errors = 0;

  for (const ms of (milestones || [])) {
    try {
      const ds = ms.date_start ? new Date(ms.date_start) : new Date('2026-01-01');
      const de = ms.date_end ? new Date(ms.date_end) : new Date('2026-12-31');
      const totalDays = Math.max(Math.ceil((de - ds) / 86400000), 5);

      const tasks = TASK_TEMPLATES.map((tmpl, i) => {
        let taskName = tmpl.name;
        if (i === 2) taskName = `Execução: ${ms.name}`;
        if (i === 3) taskName = `Entrega: ${ms.expected_delivery || ms.name}`;

        const taskStart = addDays(ds, Math.round(totalDays * tmpl.offset));
        const taskEnd = i < 4 ? addDays(ds, Math.round(totalDays * TASK_TEMPLATES[i + 1].offset) - 1) : ms.date_end;

        return {
          milestone_id: ms.id,
          name: taskName,
          responsible: ms.responsible || '',
          area: ms.area || '',
          start_date: taskStart,
          deadline: taskEnd || ms.date_end,
          description: `Fase: ${tmpl.phase}`,
          status: 'pendente',
          sort_order: i + 1,
        };
      });

      const { error } = await supabase.from('expansion_tasks').insert(tasks);
      if (error) throw error;

      totalTasks += 5;
      console.log(`✓ ${ms.name} — 5 tarefas`);
    } catch (err) {
      errors++;
      console.error(`✗ ${ms.name}: ${err.message}`);
    }
  }

  console.log(`\n=== ${totalTasks} tarefas criadas para ${milestones?.length || 0} marcos, ${errors} erros ===`);
  process.exit(0);
}

run();
