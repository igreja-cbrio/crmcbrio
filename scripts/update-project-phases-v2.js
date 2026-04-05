const path = require('path');
module.paths.unshift(path.join(__dirname, '../backend/node_modules'));
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const TEMPLATE = require('../backend/project_phases_template.json');

const PHASE_PCTS = [0.10, 0.10, 0.15, 0.10, 0.30, 0.15, 0.10]; // 7 phases = 100%

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function run() {
  console.log('Atualizando fases dos projetos para 7 fases...\n');

  const { data: allProjects } = await supabase.from('projects').select('id, name, date_start, date_end, leader');

  let updated = 0;
  for (const proj of (allProjects || [])) {
    try {
      const ds = proj.date_start; const de = proj.date_end;

      // Delete old phases
      await supabase.from('project_phases').delete().eq('project_id', proj.id);

      if (!ds || !de) {
        console.log(`⏭ ${proj.name} — sem datas, fases criadas sem período`);
      }

      const start = ds ? new Date(ds) : new Date('2026-01-01');
      const end = de ? new Date(de) : new Date('2026-12-31');
      const totalDays = Math.max(Math.round((end - start) / 86400000), 7);

      let dayOffset = 0;
      const phaseInserts = [];
      const taskInserts = [];

      for (let i = 0; i < TEMPLATE.length; i++) {
        const tmpl = TEMPLATE[i];
        const phaseDays = Math.max(Math.round(totalDays * PHASE_PCTS[i]), 1);
        const phaseStart = addDays(start, dayOffset);
        const phaseEnd = addDays(start, dayOffset + phaseDays - 1);
        dayOffset += phaseDays;

        const phaseId = crypto.randomUUID();
        phaseInserts.push({
          id: phaseId,
          project_id: proj.id,
          name: tmpl.name,
          phase_order: tmpl.phase_order,
          date_start: phaseStart,
          date_end: phaseEnd,
          status: 'pendente',
          responsible: proj.leader || '',
        });

        // Create tasks for this phase
        for (const task of tmpl.tasks) {
          taskInserts.push({
            project_id: proj.id,
            name: task.name,
            area: task.area,
            start_date: phaseStart,
            deadline: phaseEnd,
            status: 'pendente',
            priority: 'media',
            description: `Fase: ${tmpl.name}`,
          });
        }
      }

      // Batch insert phases
      const { error: phErr } = await supabase.from('project_phases').insert(phaseInserts);
      if (phErr) throw phErr;

      // Batch insert tasks
      const { error: tkErr } = await supabase.from('project_tasks').insert(taskInserts);
      if (tkErr) throw tkErr;

      updated++;
      console.log(`✓ ${updated}. ${proj.name} — 7 fases + 42 tarefas`);
    } catch (err) {
      console.error(`✗ ${proj.name}: ${err.message}`);
    }
  }

  console.log(`\n=== ${updated} projetos atualizados com 7 fases ===`);
  process.exit(0);
}

run();
