const path = require('path');
module.paths.unshift(path.join(__dirname, '../backend/node_modules'));
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Mapeamento: nome do projeto → [date_start, date_end]
// Baseado nos períodos dos documentos do SharePoint
const DATES = {
  'Gênesis': ['2026-05-01', '2026-05-31'],
  'Reuniões Gênesis (online e presencial)': ['2026-01-01', '2026-12-31'],
  'Campanha de Generosidade': ['2026-04-01', '2026-06-30'],
  'Carta': ['2026-10-01', '2026-11-30'],
  'Você faz Parte': ['2026-09-01', '2026-09-30'],
  'Projeto Jornada 180 - Recreio': ['2026-08-01', '2026-10-31'],
  'Próximos Passos': ['2026-01-01', '2026-12-31'],
  'Jornada 180 - Barra': ['2026-03-01', '2026-06-30'],
  'Capelania': ['2026-01-01', '2026-12-31'],
  'Papo com o Pastor': ['2026-01-01', '2026-12-31'],
  'Aconselhamento Pastoral': ['2026-01-01', '2026-12-31'],
  'Escola de Discipulos': ['2026-03-01', '2026-10-31'],
  'Retiro': ['2026-02-01', '2026-02-28'],
  'Festival (nome passível de alteração)': ['2026-09-01', '2026-09-30'],
  'Quinto Domingo': ['2026-01-31', '2026-10-31'],
  'GRUPOS': ['2026-01-01', '2026-12-31'],
  'Abertura da 2ª Temporada de Inscrições de Grupos': ['2026-08-01', '2026-08-30'],
  'Reunião com os Líderes - 1ª Temporada': ['2026-02-22', '2026-06-28'],
  'Reunião com os Líderes - 2ª Temporada': ['2026-07-26', '2026-11-22'],
  'Convite para Abertura de Novos Grupos': ['2026-02-01', '2026-07-31'],
  'Ceia': ['2026-01-04', '2026-12-06'],
  'Intercessão / Live de oração': ['2026-01-01', '2026-12-31'],
  'Treinamento anual': ['2026-04-20', '2026-04-25'],
  'Treinamento de área': ['2026-01-15', '2026-10-31'],
  'Autocheckin': ['2026-01-01', '2026-06-30'],
  'Campanha de novos voluntários': ['2026-01-25', '2026-08-30'],
  'Next': ['2026-01-01', '2026-12-31'],
  'Treinamento Primeiros Socorros': ['2026-06-01', '2026-06-30'],
  'Culto do Amigo': ['2026-03-29', '2026-11-29'],
  'Culto de Páscoa': ['2026-04-01', '2026-04-05'],
  'Dia das Mães': ['2026-05-04', '2026-05-10'],
  'Copa Mundo': ['2026-06-08', '2026-06-14'],
  'Dia dos Pais': ['2026-08-03', '2026-08-09'],
  'Festival Kids': ['2026-09-01', '2026-09-30'],
  'Dia das Crianças': ['2026-10-05', '2026-10-11'],
  'Presente visitante': ['2026-01-01', '2026-12-31'],
  'Presente aniversariante': ['2026-01-01', '2026-12-31'],
  'Material Passagem para adolescentes': ['2026-01-01', '2026-12-31'],
  'Material de aceitação e crescimento': ['2026-01-01', '2026-12-31'],
  '2 Novas lentes': ['2026-03-01', '2026-06-30'],
  '2 Novas câmeras': ['2026-03-01', '2026-06-30'],
  'Unificação dos computadores do broadcast': ['2026-04-01', '2026-08-31'],
  'PONTO DE ENCONTRO (Cada Casa, uma Igreja)': ['2026-01-01', '2026-12-31'],
  'Alcance e Impacto Digital (YouTube)': ['2026-01-01', '2026-12-31'],
  'Pintura e acabamentos da igreja': ['2026-01-01', '2026-12-31'],
  'Compra de equipamentos de manutenção': ['2026-01-01', '2026-01-31'],
  'Acabamentos do Hall e templo novo': ['2026-01-01', '2026-03-31'],
  'Reposição de materiais de manutenção': ['2026-01-01', '2026-12-31'],
  'Gastos com manutenção de refrigeração': ['2026-01-01', '2026-12-31'],
  'Capacitação de Equipe': ['2026-03-01', '2026-11-30'],
  'Natal 2026': ['2026-12-07', '2026-12-25'],
  'Modernização de processos administrativos': ['2026-03-01', '2026-04-30'],
  'Inovação UNICBRio': ['2026-06-01', '2026-12-31'],
  'Reforço de cultura organizacional': ['2026-01-01', '2026-12-31'],
  'Desenvolvimento comportamental': ['2026-01-01', '2026-12-31'],
  'Desenvolvimento especializado': ['2026-01-01', '2026-12-31'],
  'Endomarketing': ['2026-01-01', '2026-12-31'],
  'Gallup - Avaliação Q12': ['2026-05-01', '2026-05-14'],
  'Ações de Bem Estar': ['2026-01-01', '2026-12-31'],
  'Dia da Saúde CBRio': ['2026-04-01', '2026-10-31'],
  'Reestruturação dos Organogramas': ['2026-02-01', '2026-06-30'],
  'Culto sem momento de Dízimo': ['2026-01-01', '2026-12-31'],
  'Capacitação Cbkids e Quarta com Deus': ['2026-01-01', '2026-12-31'],
  'Ensaio e Treinamento Vocal Quarta com Deus': ['2026-01-01', '2026-12-31'],
  'Encontro de Comunhão e Adoração': ['2026-01-01', '2026-12-31'],
};

async function run() {
  console.log('Atualizando datas dos projetos...\n');

  // Buscar todos os projetos
  const { data: projects } = await supabase.from('projects').select('id, name').eq('year', 2026);

  let updated = 0;
  for (const proj of (projects || [])) {
    const dates = DATES[proj.name];
    if (!dates) {
      console.log(`⏭ ${proj.name} — sem mapeamento de datas`);
      continue;
    }

    const [ds, de] = dates;

    // Update project dates
    await supabase.from('projects').update({ date_start: ds, date_end: de }).eq('id', proj.id);

    // Update phase dates (distribuir proporcionalmente)
    const start = new Date(ds);
    const end = new Date(de);
    const totalDays = Math.max(Math.round((end - start) / 86400000), 4);
    const q1 = Math.round(totalDays * 0.2); // Planejamento: 20%
    const q2 = Math.round(totalDays * 0.2); // Preparação: 20%
    const q3 = Math.round(totalDays * 0.5); // Execução: 50%
    // Avaliação: restante (10%)

    const d = (base, addDays) => {
      const r = new Date(base);
      r.setDate(r.getDate() + addDays);
      return r.toISOString().slice(0, 10);
    };

    const phases = [
      { order: 1, ds: ds, de: d(start, q1) },
      { order: 2, ds: d(start, q1 + 1), de: d(start, q1 + q2) },
      { order: 3, ds: d(start, q1 + q2 + 1), de: d(start, q1 + q2 + q3) },
      { order: 4, ds: d(start, q1 + q2 + q3 + 1), de: de },
    ];

    for (const ph of phases) {
      await supabase.from('project_phases')
        .update({ date_start: ph.ds, date_end: ph.de })
        .eq('project_id', proj.id)
        .eq('phase_order', ph.order);
    }

    updated++;
    console.log(`✓ ${updated}. ${proj.name} → ${ds} a ${de}`);
  }

  console.log(`\n=== ${updated} projetos atualizados com datas ===`);
  process.exit(0);
}

run();
