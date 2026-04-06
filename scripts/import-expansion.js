const path = require('path');
module.paths.unshift(path.join(__dirname, '../backend/node_modules'));
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const AXES = {
  2026: { axis: 'Unidade / Consolidação', obj: 'Finalizar estruturas pendentes e estabelecer bases sólidas para crescimento sustentável' },
  2027: { axis: 'Pausa Estratégica e Reavaliação', obj: 'Avaliar resultados, coletar dados e planejar próximo ciclo' },
  2028: { axis: 'Expansão Qualificada', obj: 'Crescer de forma planejada e baseada em evidências, expandindo alcance e impacto' },
  2029: { axis: 'Maturidade e Consolidação', obj: 'Consolidar modelo de sustentabilidade, documentar impacto e preparar o futuro' },
};

const M = [
  // 2026 — Unidade / Consolidação (#01-#18)
  { n:'Dimensionamento completo de quadro de pessoal', y:2026, a:'Pessoas', r:'Gestão (M. Paulo) + RH', ed:'Organograma + Plano de cargos' },
  { n:'Estudo de perfil de voluntariado', y:2026, a:'Pessoas', r:'RH + Líderes', ed:'Relatório de perfis' },
  { n:'Finalização fluxo ministerial', y:2026, a:'Ministerial', r:'Ministerial + Gestão', ed:'Fluxo documentado' },
  { n:'Documentação de processos', y:2026, a:'Processos', r:'Gestão', ed:'Manuais operacionais' },
  { n:'Lançamento CBSite 2.0', y:2026, a:'Tecnologia', r:'Arthur + Equipe Técnica', ed:'Site lançado' },
  { n:'Sistema de doações online', y:2026, a:'Tecnologia', r:'Tecnologia + Financeiro', ed:'Sistema ativo' },
  { n:'Implementação controles de gestão', y:2026, a:'Processos', r:'Gestão', ed:'Controles implementados' },
  { n:'Treinamento em novos processos', y:2026, a:'Pessoas', r:'RH + Gestão', ed:'Staff treinado' },
  { n:'Finalização projetos satélites', y:2026, a:'Expansão', r:'Gestão + Ministerial', ed:'Satélites definidos' },
  { n:'Aprovação projeto campus', y:2026, a:'Infraestrutura', r:'Quintela + Gestão', ed:'Projeto aprovado' },
  { n:'Orçamento detalhado obra', y:2026, a:'Infraestrutura', r:'Quintela + Financeiro', ed:'Orçamento completo' },
  { n:'Estratégia de campanha', y:2026, a:'Institucional', r:'Comunicação + Marketing', ed:'Plano completo' },
  { n:'Metodologia de fidelização 100%', y:2026, a:'Relacionamento', r:'Equipe Relacionamento', ed:'Metodologia pronta' },
  { n:'Testes piloto fidelização', y:2026, a:'Relacionamento', r:'Relacionamento + Voluntários', ed:'Piloto concluído' },
  { n:'Lições aprendidas 2024-2026', y:2026, a:'Gestão', r:'Gestão', ed:'Documento consolidado' },
  { n:'Framework avaliação 2027', y:2026, a:'Gestão', r:'Gestão', ed:'Framework pronto' },
  { n:'Redução de déficit operacional', y:2026, a:'Financeiro', r:'Financeiro + Gestão', ed:'Déficit reduzido' },
  { n:'Recuperação de frequência', y:2026, a:'Ministerial', r:'Ministerial', ed:'Frequência recuperada' },
  // 2027 — Pausa Estratégica e Reavaliação (#19-#44)
  { n:'Auditoria de efetividade de metodologias', y:2027, a:'Avaliação', r:'Gestão + Auditoria', ed:'Relatório de efetividade' },
  { n:'Análise ROI de iniciativas', y:2027, a:'Avaliação', r:'Gestão + Financeiro', ed:'Análise completa' },
  { n:'Diagnóstico de processos ministeriais', y:2027, a:'Avaliação', r:'Ministerial + Gestão', ed:'Diagnóstico pronto' },
  { n:'Diagnóstico de sistemas digitais', y:2027, a:'Tecnologia', r:'Tecnologia', ed:'Diagnóstico digital' },
  { n:'Pesquisa com doadores', y:2027, a:'Relacionamento', r:'Relacionamento', ed:'Pesquisa concluída' },
  { n:'Entrevistas com grandes doadores', y:2027, a:'Relacionamento', r:'Liderança + Relacionamento', ed:'Entrevistas concluídas' },
  { n:'Grupos focais com voluntários', y:2027, a:'Pessoas', r:'RH + Voluntariado', ed:'Relatório focais' },
  { n:'Pesquisa interna com staff', y:2027, a:'Pessoas', r:'RH + Gestão', ed:'Pesquisa concluída' },
  { n:'Estudo de impacto ministerial', y:2027, a:'Ministerial', r:'Ministerial', ed:'Estudo publicado' },
  { n:'Revisão sustentabilidade financeira', y:2027, a:'Financeiro', r:'Financeiro', ed:'Revisão concluída' },
  { n:'Projeções fluxo 2028-2029', y:2027, a:'Financeiro', r:'Financeiro + Gestão', ed:'Projeções prontas' },
  { n:'Plano diversificação receitas', y:2027, a:'Financeiro', r:'Financeiro + Gestão', ed:'Plano aprovado' },
  { n:'Workshop visão 2028-2029', y:2027, a:'Estratégia', r:'Liderança', ed:'Workshop realizado' },
  { n:'Revisão missão e valores', y:2027, a:'Estratégia', r:'Liderança', ed:'Missão revisada' },
  { n:'Cocriação com equipe-chave', y:2027, a:'Estratégia', r:'Gestão + Equipe-chave', ed:'Documento co-criado' },
  { n:'Definição objetivos 2028-2029', y:2027, a:'Estratégia', r:'Gestão + Liderança', ed:'Objetivos definidos' },
  { n:'Ajuste metodologia captação', y:2027, a:'Captação', r:'Captação', ed:'Metodologia ajustada' },
  { n:'Atualização fluxo ministerial', y:2027, a:'Ministerial', r:'Ministerial', ed:'Fluxo atualizado' },
  { n:'Otimização fidelização', y:2027, a:'Relacionamento', r:'Relacionamento', ed:'Processo otimizado' },
  { n:'Roadmap técnico 2028-2029', y:2027, a:'Tecnologia', r:'Arthur + Técnica', ed:'Roadmap pronto' },
  { n:'Elaboração Plano 2028-2029', y:2027, a:'Estratégia', r:'Gestão + Líderes', ed:'Plano estratégico' },
  { n:'Orçamento 2028-2029', y:2027, a:'Financeiro', r:'Financeiro + Gestão', ed:'Orçamento aprovado' },
  { n:'Capacitação para retomada', y:2027, a:'Pessoas', r:'RH + Líderes', ed:'Equipe capacitada' },
  { n:'Comunicação do plano', y:2027, a:'Comunicação', r:'Comunicação + Gestão', ed:'Plano comunicado' },
  { n:'Manutenção de relacionamento doadores', y:2027, a:'Relacionamento', r:'Relacionamento', ed:'Relacionamentos mantidos' },
  { n:'Atividades ministeriais essenciais', y:2027, a:'Ministerial', r:'Ministerial', ed:'Atividades executadas' },
  // 2028 — Expansão Qualificada (#45-#67)
  { n:'Lançamento Campanha CBS1 revisada', y:2028, a:'Captação', r:'Liderança + Comunicação', ed:'Campanha lançada' },
  { n:'Abordagem grandes doadores', y:2028, a:'Captação', r:'Liderança + Relacionamento', ed:'Doadores abordados' },
  { n:'Mobilização doadores médios', y:2028, a:'Captação', r:'Relacionamento', ed:'Doadores mobilizados' },
  { n:'CBSite 2.0 melhorias', y:2028, a:'Tecnologia', r:'Arthur + Técnica', ed:'Melhorias implantadas' },
  { n:'Lançamento app relacionamento', y:2028, a:'Tecnologia', r:'Tecnologia', ed:'App lançado' },
  { n:'Integração CRM', y:2028, a:'Tecnologia', r:'Tecnologia + Gestão', ed:'CRM integrado' },
  { n:'Decisão GO/NO GO campus', y:2028, a:'Estratégia', r:'Liderança + Conselho', ed:'Decisão tomada' },
  { n:'Contratação construtora', y:2028, a:'Infraestrutura', r:'Quintela + Gestão', ed:'Contrato assinado' },
  { n:'Início obras infraestrutura', y:2028, a:'Infraestrutura', r:'Construtora + Quintela', ed:'Obras iniciadas' },
  { n:'Identificação novos locais satélites', y:2028, a:'Expansão', r:'Gestão + Ministerial', ed:'2-3 locais aprovados' },
  { n:'Estrutura novos pontos', y:2028, a:'Expansão', r:'Gestão + Infraestrutura', ed:'Estrutura definida' },
  { n:'Lançamento 2 pontos satélites', y:2028, a:'Expansão', r:'Ministerial + Gestão', ed:'Pontos lançados' },
  { n:'Aplicação fluxo em novos pontos', y:2028, a:'Ministerial', r:'Líderes ministeriais', ed:'Fluxo aplicado' },
  { n:'Treinamento novos líderes', y:2028, a:'Pessoas', r:'Desenvolvimento pessoas', ed:'Líderes treinados' },
  { n:'Multiplicação programas', y:2028, a:'Ministerial', r:'Ministerial', ed:'Programas multiplicados' },
  { n:'Sistematização expansão', y:2028, a:'Processos', r:'Gestão', ed:'Processo sistematizado' },
  { n:'Manual de replicação', y:2028, a:'Processos', r:'Gestão', ed:'Manual pronto' },
  { n:'Campanha doação recorrente', y:2028, a:'Captação', r:'Captação + Comunicação', ed:'Campanha ativa' },
  { n:'Programa reconhecimento fiéis', y:2028, a:'Relacionamento', r:'Relacionamento', ed:'Programa lançado' },
  { n:'Expansão parcerias corporativas', y:2028, a:'Captação', r:'Captação + Gestão', ed:'Parcerias firmadas' },
  { n:'Eventos grandes doadores', y:2028, a:'Relacionamento', r:'Relacionamento + Eventos', ed:'Eventos realizados' },
  { n:'Relatórios personalizados impacto', y:2028, a:'Comunicação', r:'Comunicação + Gestão', ed:'Relatórios enviados' },
  { n:'Expansão portfólio grandes doadores', y:2028, a:'Captação', r:'Captação', ed:'Portfólio expandido' },
  // 2029 — Maturidade e Consolidação (#68-#93)
  { n:'Auditoria eficiência operacional', y:2029, a:'Qualidade', r:'Gestão + Auditoria', ed:'Relatório auditoria' },
  { n:'Implementação melhorias', y:2029, a:'Processos', r:'Todas as áreas', ed:'Melhorias implementadas' },
  { n:'Treinamento novos processos', y:2029, a:'Pessoas', r:'RH + Gestão', ed:'Staff treinado' },
  { n:'Preparação certificação', y:2029, a:'Qualidade', r:'Gestão + Qualidade', ed:'Preparação concluída' },
  { n:'Processo certificação', y:2029, a:'Qualidade', r:'Gestão + Auditoria', ed:'Certificação obtida' },
  { n:'Lançamento 3 novos programas', y:2029, a:'Ministerial', r:'Ministerial + Desenvolvimento', ed:'Programas lançados' },
  { n:'Expansão alcance 40%', y:2029, a:'Ministerial', r:'Ministerial', ed:'Alcance expandido' },
  { n:'Formação 2ª geração líderes', y:2029, a:'Pessoas', r:'Liderança + RH', ed:'Líderes formados' },
  { n:'Sistema de mensuração impacto', y:2029, a:'Gestão', r:'Gestão + Pesquisa', ed:'Sistema implementado' },
  { n:'Coleta dados de impacto', y:2029, a:'Gestão', r:'Gestão + Pesquisa', ed:'Dados coletados' },
  { n:'Relatório de impacto', y:2029, a:'Comunicação', r:'Gestão + Comunicação', ed:'Relatório publicado' },
  { n:'Documentação transformações', y:2029, a:'Documentação', r:'Gestão + Comunicação', ed:'Documentação completa' },
  { n:'Campanha fundo de reserva', y:2029, a:'Captação', r:'Captação + Comunicação', ed:'Campanha ativa' },
  { n:'Diversificação fontes receita', y:2029, a:'Financeiro', r:'Financeiro + Gestão', ed:'Fontes diversificadas' },
  { n:'Estabelecimento endowment', y:2029, a:'Financeiro', r:'Financeiro + Conselho', ed:'Endowment constituído' },
  { n:'Modelo financeiro', y:2029, a:'Financeiro', r:'Financeiro + Gestão', ed:'Modelo validado' },
  { n:'Validação sustentabilidade', y:2029, a:'Financeiro', r:'Auditoria + Conselho', ed:'Sustentabilidade validada' },
  { n:'Workshops 2030-2033', y:2029, a:'Estratégia', r:'Liderança + Facilitador', ed:'Workshops realizados' },
  { n:'Mapeamento oportunidades', y:2029, a:'Estratégia', r:'Gestão', ed:'Oportunidades mapeadas' },
  { n:'Plano 2030-2033', y:2029, a:'Estratégia', r:'Gestão + Liderança', ed:'Plano aprovado' },
  { n:'Avaliação competências', y:2029, a:'Pessoas', r:'RH + Gestão', ed:'Avaliação completa' },
  { n:'Plano desenvolvimento liderança', y:2029, a:'Pessoas', r:'RH + Liderança', ed:'Plano implementado' },
  { n:'Comunicação visão 2030-2033', y:2029, a:'Comunicação', r:'Comunicação + Liderança', ed:'Visão comunicada' },
  { n:'Evento celebração 2026-2029', y:2029, a:'Eventos', r:'Liderança + Eventos', ed:'Evento realizado' },
  { n:'Reconhecimento equipe', y:2029, a:'Pessoas', r:'Liderança + RH', ed:'Equipe reconhecida' },
  { n:'Relatório final 2026-2029', y:2029, a:'Documentação', r:'Gestão + Comunicação', ed:'Relatório publicado' },
];

function lastDay(year, month) {
  return new Date(year, month, 0).getDate();
}

async function run() {
  console.log('Importando 93 marcos estratégicos do Plano de Expansão 2026-2029...\n');

  // Group by year to calculate positions
  const byYear = { 2026: [], 2027: [], 2028: [], 2029: [] };
  M.forEach((m, i) => { byYear[m.y].push({ ...m, globalIdx: i }); });

  let ok = 0, fail = 0;

  for (const [yearStr, items] of Object.entries(byYear)) {
    const year = parseInt(yearStr);
    const ax = AXES[year];
    const total = items.length;

    for (let i = 0; i < total; i++) {
      const m = items[i];
      const sortOrder = m.globalIdx + 1;

      // Distribute evenly across the year
      const startMonth = Math.floor((i / total) * 12) + 1;
      const endMonth = Math.min(startMonth + 1, 12);
      const ds = `${year}-${String(startMonth).padStart(2, '0')}-01`;
      const de = `${year}-${String(endMonth).padStart(2, '0')}-${lastDay(year, endMonth)}`;

      try {
        const { error } = await supabase.from('expansion_milestones').insert({
          name: m.n,
          year,
          strategic_axis: ax.axis,
          strategic_objective: ax.obj,
          area: m.a,
          responsible: m.r,
          date_start: ds,
          date_end: de,
          expected_delivery: m.ed,
          status: 'pendente',
          phase: 'planejamento',
          sort_order: sortOrder,
          swot_strengths: 'Equipe de gestão capacitada; Alinhamento com o plano de expansão; Liderança comprometida com resultados',
          swot_weaknesses: 'Dependência de voluntários; Recursos financeiros limitados; Necessidade de coordenação entre múltiplas áreas',
          swot_opportunities: 'Momento estratégico favorável; Crescimento do segmento evangélico; Alinhamento com o tema anual',
          swot_threats: 'Cenário econômico instável; Concorrência de agenda; Fatores externos imprevisíveis',
        });
        if (error) throw error;
        ok++;
        console.log(`✓ ${String(sortOrder).padStart(2, '0')}. [${year}] ${m.n}`);
      } catch (err) {
        fail++;
        console.error(`✗ ${m.n}: ${err.message}`);
      }
    }
  }

  console.log(`\n=== Importação concluída: ${ok} marcos importados, ${fail} erros ===`);
  process.exit(0);
}

run();
