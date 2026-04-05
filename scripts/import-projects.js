const path = require('path');
// Resolve modules from backend/node_modules
module.paths.unshift(path.join(__dirname, '../backend/node_modules'));
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CATEGORY_MAP = {
  'CBA': 'CBA', 'Generosidade': 'Generosidade', 'Ministério de Cuidados': 'Cuidados',
  'Cuidados': 'Cuidados', 'Ami Movement': 'Ministerial', 'Integração': 'Integração',
  'Todos os ministérios': 'Social', 'Voluntariado': 'Social', 'Cbkids': 'Kids',
  'Produção': 'Tecnologia', 'Online': 'Online', 'Infraestrutura': 'Infraestrutura',
  'Administração': 'Administrativo', 'GRUPOS': 'Grupos', 'Grupos': 'Grupos',
  'Marketing - Gestão de Marca': 'Marketing', 'Marketing': 'Marketing',
  'RH': 'RH', 'Institucional': 'Administrativo', 'Louvor CBRio': 'Louvor',
};

const P = [
  { n:'Gênesis', a:'CBA', l:'Pr. Nélio Paiva', f:'1 vez no ano', pt:'Pastores e Líderes Eclesiásticos', cx:'alto', im:'alto', ou:'nao', gu:true, ce:true, bp:15000, br:0, bc:15000, d:'Promover o crescimento do Reino, compartilhando conhecimento e experiências, assim como a EBA fez conosco.' },
  { n:'Reuniões Gênesis (online e presencial)', a:'CBA', l:'Pr. Nélio Paiva', f:'2 vezes por mês', pt:'Pastores e Líderes Eclesiásticos', cx:'baixo', im:'baixo', ou:'nao', gu:true, ce:true, bp:0, br:0, bc:0, d:'Divulgação através do marketing nas redes sociais' },
  { n:'Campanha de Generosidade', a:'Generosidade', l:'Keila', f:'Pontual', pt:'Toda a Igreja', cx:'medio', im:'alto', ou:'sim', gu:true, ce:true, bp:0, br:1500000, bc:0, d:'Incentivar o desenvolvimento de uma cultura de generosidade e arrecadar fundos para a obra do templo novo.' },
  { n:'Carta', a:'Generosidade', l:'Keila', f:'Anual', pt:'Grupo A', cx:'medio', im:'alto', ou:'sim', gu:true, ce:true, bp:5000, br:0, bc:5000, d:'Uma vez ao ano, escrevemos cartas para as pessoas mais comprometidas e engajadas com a igreja naquele ano.' },
  { n:'Você faz Parte', a:'Generosidade', l:'Keila', f:'Anual', pt:'Toda a Igreja', cx:'baixo', im:'alto', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Um dia para prestação de contas dos projetos sociais que a igreja ajuda.' },
  { n:'Projeto Jornada 180 - Recreio', a:'Ministério de Cuidados', l:'Wesley e Marcelo', f:'Semanal - 12 semanas', pt:'Pessoas com ansiedade, depressão e dificuldades com vícios', cx:'medio', im:'alto', ou:'sim', gu:true, ce:false, bp:0, br:0, bc:0, d:'Cuidado e auxílio espiritual para cura interior.' },
  { n:'Próximos Passos', a:'Ministério de Cuidados', l:'Wesley e Marcelo', f:'Semanal', pt:'Novos convertidos', cx:'medio', im:'alto', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Recepção e atendimento de novos convertidos.' },
  { n:'Jornada 180 - Barra', a:'Ministério de Cuidados', l:'Wesley e Marcelo', f:'Semanal - 12 semanas', pt:'Pessoas com ansiedade, depressão e dificuldades com vícios', cx:'medio', im:'alto', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Cuidado e auxílio espiritual para cura interior.' },
  { n:'Capelania', a:'Ministério de Cuidados', l:'Wesley e Marcelo', f:'Semanal', pt:'Membros e frequentadores', cx:'baixo', im:'medio', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Atendimento e visitas a hospitais; apoio espiritual a enlutados em sepultamentos.' },
  { n:'Papo com o Pastor', a:'Ministério de Cuidados', l:'Wesley e Marcelo', f:'Semanal', pt:'Staff CBRio', cx:'medio', im:'medio', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Atendimento espiritual e aconselhamento ao Staff.' },
  { n:'Aconselhamento Pastoral', a:'Ministério de Cuidados', l:'Wesley', f:'Semanal', pt:'Membros e frequentadores', cx:'baixo', im:'medio', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Aconselhamento para pessoas com dificuldades espirituais.' },
  { n:'Escola de Discipulos', a:'Ami Movement', l:'Filipe Carmet', f:'2 vezes por ano', pt:'Jovens e Adolescentes', cx:'medio', im:'alto', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Capacitar os jovens com ensinos elementares da maturidade cristã.' },
  { n:'Retiro', a:'Ami Movement', l:'Filipe Carmet', f:'1 vez no ano', pt:'Jovens e Adolescentes', cx:'alto', im:'alto', ou:'sim', gu:true, ce:false, bp:276173, br:278750, bc:278750, d:'Edificação, conexão e experiências com Deus.' },
  { n:'Festival (nome passível de alteração)', a:'Ami Movement', l:'Filipe Carmet', f:'1 vez no ano', pt:'Igreja Toda', cx:'alto', im:'alto', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Unidade, senso de pertencimento e serviço.' },
  { n:'Quinto Domingo', a:'Ami Movement', l:'Filipe Carmet', f:'4 vezes no ano', pt:'Igreja Toda', cx:'medio', im:'baixo', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Senso de Pertencimento para os jovens e adolescentes na CBRio.' },
  { n:'GRUPOS', a:null, l:'A definir', f:'A definir', pt:'A definir', cx:null, im:null, ou:'na', gu:false, ce:false, bp:0, br:0, bc:0, d:'Descrição a ser detalhada pela liderança responsável.' },
  { n:'Abertura da 2ª Temporada de Inscrições de Grupos', a:'GRUPOS', l:'Pr. Nélio', f:'1 vez', pt:'Toda a Igreja', cx:'medio', im:'alto', ou:'sim', gu:true, ce:true, bp:1800, br:0, bc:1800, d:'A abertura da nova temporada de Grupos é um momento estratégico para fortalecer a vida em comunidade.' },
  { n:'Reunião com os Líderes - 1ª Temporada', a:'GRUPOS', l:'Pr. Nélio', f:'1 vez', pt:'Líderes de GRUPOS', cx:'baixo', im:'alto', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Reuniões periódicas com os líderes para saúde e alinhamento dos Grupos.' },
  { n:'Reunião com os Líderes - 2ª Temporada', a:'GRUPOS', l:'Pr. Nélio', f:'1 vez', pt:'Líderes de GRUPOS', cx:'baixo', im:'alto', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Reuniões periódicas com os líderes para saúde e alinhamento dos Grupos.' },
  { n:'Convite para Abertura de Novos Grupos', a:'GRUPOS', l:'Pr. Nélio', f:'1 vez', pt:'Toda a Igreja', cx:'baixo', im:'alto', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Tela com QRCODE entre cultos convidando membros a abrir novos grupos.' },
  { n:'Ceia', a:'Integração', l:'Lorena Andrade', f:'Mensal', pt:'Todos os membros', cx:'baixo', im:'alto', ou:'sim', gu:true, ce:false, bp:0, br:0, bc:0, d:'Santa ceia.' },
  { n:'Intercessão / Live de oração', a:'Integração', l:'Lorena Andrade', f:'Semanal', pt:'Todos os membros da igreja', cx:'baixo', im:'medio', ou:'sim', gu:true, ce:false, bp:0, br:0, bc:0, d:'Divulgação através do marketing nas redes sociais.' },
  { n:'Treinamento anual', a:'Integração', l:'Lorena Andrade', f:'Anual', pt:'Todos os voluntários da integração', cx:'baixo', im:'medio', ou:'nao', gu:true, ce:true, bp:0, br:0, bc:0, d:'Treinar e alinhar expectativas do ministério.' },
  { n:'Treinamento de área', a:'Todos os ministérios', l:'Jessica Salviano', f:'Trimestral', pt:'Voluntários', cx:'medio', im:'alto', ou:'sim', gu:true, ce:true, bp:300, br:0, bc:1200, d:'Encontros práticos e dinâmicos para capacitação e integração dos voluntários.' },
  { n:'Autocheckin', a:'Voluntariado', l:'Jessica Salviano', f:'-', pt:'Voluntários', cx:'alto', im:'alto', ou:'nao', gu:false, ce:true, bp:0, br:0, bc:0, d:'Implementar sistema de checkin automatizado integrado ao Planning Center.' },
  { n:'Campanha de novos voluntários', a:'Voluntariado', l:'Jessica Salviano', f:'Semestral', pt:'Membros e frequentadores da igreja', cx:'baixo', im:'alto', ou:'sim', gu:true, ce:true, bp:1000, br:0, bc:2500, d:'Montagem de mesas temáticas de cada ministério com materiais visuais.' },
  { n:'Next', a:'Cuidados', l:'Pr. Wesley', f:'Semanal', pt:'Todos os novos na CBRio', cx:'baixo', im:'alto', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Primeiro passo da Jornada. Apresenta a Cultura da Visão.' },
  { n:'Treinamento Primeiros Socorros', a:'Cbkids', l:'Mariane Gaia', f:'Uma vez ao ano', pt:'Voluntários e crianças', cx:'baixo', im:'baixo', ou:'nao', gu:false, ce:false, bp:800, br:0, bc:800, d:'Treinar voluntários para saber agir em situação de urgência.' },
  { n:'Culto do Amigo', a:'Cbkids', l:'Mariane Gaia', f:'4 vezes ao ano', pt:'Crianças e visitantes', cx:'baixo', im:'baixo', ou:'sim', gu:true, ce:true, bp:3500, br:0, bc:3500, d:'5° domingo com algo mais descontraído estimulando crianças a trazer visitantes.' },
  { n:'Culto de Páscoa', a:'Cbkids', l:'Mariane Gaia', f:'Uma vez ao ano', pt:'Crianças', cx:'baixo', im:'baixo', ou:'sim', gu:true, ce:false, bp:2000, br:0, bc:2000, d:'Celebrar uma das principais datas do cristianismo.' },
  { n:'Dia das Mães', a:'Cbkids', l:'Mariane Gaia', f:'Uma vez ao ano', pt:'Mães', cx:'baixo', im:'baixo', ou:'nao', gu:false, ce:false, bp:2000, br:0, bc:2000, d:'Homenagear as mães da igreja. Trabalhar a honra com as crianças.' },
  { n:'Copa Mundo', a:'Cbkids', l:'Mariane Gaia', f:'Uma vez ao ano', pt:'Crianças', cx:'baixo', im:'baixo', ou:'sim', gu:true, ce:false, bp:2000, br:0, bc:2000, d:'Estratégia dos outros cultos com este perfil.' },
  { n:'Dia dos Pais', a:'Cbkids', l:'Mariane Gaia', f:'Uma vez ao ano', pt:'Pais', cx:'baixo', im:'baixo', ou:'nao', gu:false, ce:false, bp:2000, br:0, bc:2000, d:'Homenagear os pais da igreja. Trabalhar a honra com as crianças.' },
  { n:'Festival Kids', a:'Cbkids', l:'Mariane Gaia', f:'Uma vez ao ano', pt:'Crianças, visitantes e a nova comunidade', cx:'alto', im:'alto', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Boas vindas à comunidade, mostrar um pouco da CBRio.' },
  { n:'Dia das Crianças', a:'Cbkids', l:'Mariane Gaia', f:'Uma vez ao ano', pt:'Crianças e visitantes', cx:'baixo', im:'baixo', ou:'sim', gu:true, ce:true, bp:3500, br:0, bc:3500, d:'Comemoração do Dia das Crianças.' },
  { n:'Presente visitante', a:'Cbkids', l:'Mariane Gaia', f:'Recorrente', pt:'Visitantes e voluntários', cx:'baixo', im:'baixo', ou:'nao', gu:false, ce:false, bp:196, br:0, bc:196, d:'Acolhimento via bottom para identificação.' },
  { n:'Presente aniversariante', a:'Cbkids', l:'Mariane Gaia', f:'Recorrente', pt:'Crianças e família', cx:'baixo', im:'baixo', ou:'nao', gu:false, ce:false, bp:1150, br:0, bc:1150, d:'Bottom com cor diferente da do visitante mais uma besteirinha.' },
  { n:'Material Passagem para adolescentes', a:'Cbkids', l:'Mariane Gaia', f:'Recorrente', pt:'Crianças e família', cx:'baixo', im:'baixo', ou:'nao', gu:true, ce:false, bp:1940, br:0, bc:1940, d:'Marcar o fim de um ciclo e o início do novo.' },
  { n:'Material de aceitação e crescimento', a:'Cbkids', l:'Mariane Gaia', f:'Recorrente', pt:'Crianças e visitantes', cx:'medio', im:'baixo', ou:'sim', gu:false, ce:false, bp:6000, br:0, bc:6000, d:'Livretos: Conhecendo Jesus, Crescendo com Jesus, Seguindo Jesus.' },
  { n:'2 Novas lentes', a:'Produção', l:'Pedro Fernandes', f:'Aquisição única', pt:'Público presencial/online', cx:'baixo', im:'medio', ou:'na', gu:false, ce:false, bp:10000, br:0, bc:0, d:'Padronizar a fotografia e ter ferramentas para novas posições de câmeras.' },
  { n:'2 Novas câmeras', a:'Produção', l:'Pedro Fernandes', f:'Aquisição única', pt:'Público presencial/online', cx:'baixo', im:'medio', ou:'na', gu:false, ce:false, bp:40000, br:0, bc:0, d:'Novas posições devido a expansão do templo.' },
  { n:'Unificação dos computadores do broadcast', a:'Produção', l:'Pedro Fernandes', f:'Aquisição única', pt:'Voluntários da produção', cx:'baixo', im:'medio', ou:'na', gu:false, ce:false, bp:20000, br:0, bc:0, d:'Facilidade de comunicação entre dispositivos e economia no longo prazo.' },
  { n:'PONTO DE ENCONTRO (Cada Casa, uma Igreja)', a:'Online', l:'Renata', f:'Semanal', pt:'Membros, novos frequentadores, vizinhos e convidados', cx:'medio', im:'alto', ou:'sim', gu:true, ce:true, bp:500, br:0, bc:0, d:'Transforma lares em extensões da igreja, promovendo comunhão, discipulado e evangelismo.' },
  { n:'Alcance e Impacto Digital (YouTube)', a:'Online', l:'Renata', f:'Produção semanal e acompanhamento mensal', pt:'Membros, visitantes online e novos públicos', cx:'medio', im:'alto', ou:'sim', gu:true, ce:true, bp:1500, br:500, bc:1500, d:'Fortalecer a presença digital da CBRio no YouTube.' },
  { n:'Pintura e acabamentos da igreja', a:'Infraestrutura', l:'Marcos Paulo', f:'Semestral', pt:'Frequentadores e Membros', cx:'medio', im:'baixo', ou:'nao', gu:false, ce:false, bp:10000, br:0, bc:10000, d:'Manter o visual da igreja limpo e organizado.' },
  { n:'Compra de equipamentos de manutenção', a:'Infraestrutura', l:'Marcos Paulo', f:'-', pt:'Funcionários da Infra', cx:'baixo', im:'baixo', ou:'nao', gu:false, ce:false, bp:10000, br:0, bc:10000, d:'Renovação de materiais e ferramentas da equipe.' },
  { n:'Acabamentos do Hall e templo novo', a:'Infraestrutura', l:'Marcos Paulo', f:'-', pt:'Frequentadores e Membros', cx:'medio', im:'baixo', ou:'nao', gu:false, ce:false, bp:50000, br:0, bc:50000, d:'Melhorias contínuas em todos os espaços pós obra.' },
  { n:'Reposição de materiais de manutenção', a:'Infraestrutura', l:'Marcos Paulo', f:'Bimestral', pt:'Funcionários da Infra', cx:'baixo', im:'baixo', ou:'nao', gu:false, ce:false, bp:60000, br:0, bc:60000, d:'Comprar materiais para realização dos serviços de infraestrutura.' },
  { n:'Gastos com manutenção de refrigeração', a:'Infraestrutura', l:'Marcos Paulo', f:'Mensal', pt:'Frequentadores e Membros', cx:'baixo', im:'baixo', ou:'nao', gu:false, ce:false, bp:3500, br:0, bc:3500, d:'Gás, nitrogênio e peças para reposição.' },
  { n:'Capacitação de Equipe', a:'Infraestrutura', l:'Marcos Paulo', f:'-', pt:'Funcionários da Infra', cx:'baixo', im:'baixo', ou:'nao', gu:false, ce:false, bp:10000, br:0, bc:10000, d:'Cursos de capacitação para equipe.' },
  { n:'Natal 2026', a:'Marketing - Gestão de Marca', l:'Eliza Santos', f:'5 cultos festivos', pt:'Membresia e Entorno', cx:null, im:null, ou:'sim', gu:true, ce:true, bp:22000, br:0, bc:0, d:'Grande movimento de celebração e proclamação do Evangelho.' },
  { n:'Modernização de processos administrativos', a:'Administração', l:'Eduardo Gnisci', f:'Única', pt:'Staff CBRio', cx:null, im:null, ou:'na', gu:false, ce:false, bp:5000, br:0, bc:0, d:'Upgrade tecnológico com sistema Totvs.' },
  { n:'Inovação UNICBRio', a:'Grupos', l:'Pr. Nélio Paiva', f:'Única', pt:'Membresia da igreja', cx:null, im:null, ou:'na', gu:false, ce:false, bp:0, br:0, bc:0, d:'Reformular o conceito da universidade CBRio para plataforma com conteúdos gratuitos e pagos.' },
  { n:'Reforço de cultura organizacional', a:'RH', l:'Juliana Leão', f:'Mensal', pt:'Staff', cx:'medio', im:'alto', ou:'sim', gu:true, ce:true, bp:1000, br:0, bc:12000, d:'Consolidar os valores e o DNA da CBRio na rotina e decisões do staff.' },
  { n:'Desenvolvimento comportamental', a:'RH', l:'Juliana Leão', f:'Bimestral', pt:'Staff', cx:'medio', im:'alto', ou:'sim', gu:true, ce:true, bp:1000, br:0, bc:6000, d:'Fortalecer competências interpessoais e emocionais via workshops temáticos.' },
  { n:'Desenvolvimento especializado', a:'RH', l:'Juliana Leão', f:'Sob demanda', pt:'Staff', cx:'alto', im:'alto', ou:'sim', gu:false, ce:true, bp:100000, br:0, bc:100000, d:'Capacitar cada ministério e área técnica com trilhas de aprendizado.' },
  { n:'Endomarketing', a:'RH', l:'Juliana Leão', f:'Mensal', pt:'Staff', cx:'baixo', im:'medio', ou:'sim', gu:true, ce:false, bp:700, br:0, bc:8400, d:'Fortalecer pertencimento e comunicação interna com brindes e lanches temáticos.' },
  { n:'Gallup - Avaliação Q12', a:'RH', l:'Juliana Leão', f:'Anual', pt:'Staff', cx:'baixo', im:'alto', ou:'sim', gu:true, ce:false, bp:8000, br:0, bc:8000, d:'Medir engajamento e promover crescimento espiritual-profissional.' },
  { n:'Ações de Bem Estar', a:'RH', l:'Juliana Leão', f:'Mensal', pt:'Staff', cx:'medio', im:'alto', ou:'sim', gu:true, ce:false, bp:1000, br:0, bc:12000, d:'Garantir saúde integral do staff com CBRio em Movimento.' },
  { n:'Dia da Saúde CBRio', a:'RH', l:'Juliana Leão', f:'Semestral', pt:'Staff', cx:'medio', im:'alto', ou:'sim', gu:true, ce:false, bp:5000, br:0, bc:10000, d:'Dia semestral dedicado ao cuidado integral do staff.' },
  { n:'Reestruturação dos Organogramas', a:'Institucional', l:'Juninho', f:'-', pt:'Voluntários', cx:'baixo', im:'alto', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Garantir o Ratio 1:6 e reestruturar pipeline de cada ministério.' },
  { n:'Culto sem momento de Dízimo', a:'Institucional', l:'Juninho', f:'Todos os cultos', pt:'Igreja', cx:'baixo', im:'alto', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Desenvolver cultura de pessoas e generosidade com posicionamento ousado.' },
  { n:'Capacitação Cbkids e Quarta com Deus', a:'Louvor CBRio', l:'Davi Sicon', f:'Mensal', pt:'Voluntários Vocal e Banda', cx:'baixo', im:'alto', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Encontro mensal para desenvolvimento espiritual, técnico e relacional.' },
  { n:'Ensaio e Treinamento Vocal Quarta com Deus', a:'Louvor CBRio', l:'Davi Sicon', f:'Semanal', pt:'Voluntários Vocal e Banda', cx:'baixo', im:'alto', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Ensaio semanal às terças-feiras.' },
  { n:'Encontro de Comunhão e Adoração', a:'Louvor CBRio', l:'Davi Sicon', f:'Mensal', pt:'Voluntários Louvor e Coral', cx:'baixo', im:'alto', ou:'sim', gu:true, ce:true, bp:0, br:0, bc:0, d:'Encontros nas segundas sextas-feiras de cada mês.' },
];

async function importAll() {
  console.log('Buscando categorias...');
  const { data: cats } = await supabase.from('project_categories').select('id, name');
  const catMap = {};
  (cats || []).forEach(c => catMap[c.name] = c.id);
  console.log(`${Object.keys(catMap).length} categorias encontradas\n`);

  let ok = 0, fail = 0;

  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    try {
      const catName = CATEGORY_MAP[p.a] || 'Social';
      const categoryId = catMap[catName] || catMap['Social'];

      const { data: proj, error } = await supabase.from('projects').insert({
        name: p.n, area: p.a || '', leader: p.l || '', responsible: p.l || '',
        frequency: p.f || '', public_target: p.pt || '',
        complexity: p.cx, impact: p.im,
        ourico_test: p.ou || 'na', generates_unity: p.gu || false, collaborates_expansion: p.ce || false,
        budget_planned: p.bp || 0, budget_revenue: p.br || 0, budget_church_cost: p.bc || 0,
        description: p.d || '', category_id: categoryId, year: 2026, status: 'no-prazo', priority: 'media',
        swot_strengths: `Equipe de líderes engajada na área de ${p.a || 'CBRio'}; Alinhamento com a missão e visão da CBRio; Apoio da liderança para execução`,
        swot_weaknesses: p.cx === 'alto' ? 'Alta complexidade de execução; Dependência de voluntários; Recursos financeiros limitados' : 'Necessidade de coordenação entre equipes; Dependência de voluntários; Recursos financeiros limitados',
        swot_opportunities: p.ou === 'sim' ? 'Colabora diretamente com o plano de expansão; Fortalece a unidade da igreja; Alinhamento com o tema anual 2026' : 'Potencial de crescimento e alcance; Oportunidade de engajar novos membros; Alinhamento com o tema anual 2026',
        swot_threats: 'Limitações orçamentárias; Concorrência de agenda com outros projetos; Fatores externos imprevisíveis',
      }).select().single();
      if (error) throw error;

      // 4 fases
      await supabase.from('project_phases').insert([
        { project_id: proj.id, name: 'Planejamento', phase_order: 1, status: 'pendente', responsible: p.l },
        { project_id: proj.id, name: 'Preparação', phase_order: 2, status: 'pendente', responsible: p.l },
        { project_id: proj.id, name: 'Execução', phase_order: 3, status: 'pendente', responsible: p.l },
        { project_id: proj.id, name: 'Avaliação', phase_order: 4, status: 'pendente', responsible: p.l },
      ]);

      // 5 riscos
      await supabase.from('project_risks').insert([
        { project_id: proj.id, title: 'Atraso no cronograma', probability: 3, impact: 3, mitigation: 'Acompanhamento semanal e plano de contingência', status: 'aberto' },
        { project_id: proj.id, title: 'Falta de voluntários', probability: 3, impact: 3, mitigation: 'Recrutamento antecipado e banco de reservas', status: 'aberto' },
        { project_id: proj.id, title: 'Estouro de orçamento', probability: 2, impact: 3, mitigation: 'Controle financeiro rigoroso e aprovação prévia de gastos', status: 'aberto' },
        { project_id: proj.id, title: 'Baixa adesão do público', probability: 3, impact: 3, mitigation: 'Divulgação antecipada e engajamento via grupos', status: 'aberto' },
        { project_id: proj.id, title: 'Problemas logísticos', probability: 2, impact: 2, mitigation: 'Checklist de infraestrutura e ensaio prévio', status: 'aberto' },
      ]);

      // KPIs
      const kpis = [
        { project_id: proj.id, name: 'Alcance de Público', unit: '%', target_value: 100, instrument: 'Relatório pós-evento' },
        { project_id: proj.id, name: 'Execução no Prazo', unit: '%', target_value: 100, instrument: 'Cronograma' },
        { project_id: proj.id, name: 'Satisfação', unit: '%', target_value: 80, instrument: 'Pesquisa de satisfação' },
        { project_id: proj.id, name: 'Engajamento', unit: '%', target_value: 100, instrument: 'Lista de presença' },
      ];
      if (p.bp > 0) kpis.push({ project_id: proj.id, name: 'Controle Orçamentário', unit: 'R$', target_value: p.bp, instrument: 'Relatório financeiro' });
      await supabase.from('project_kpis').insert(kpis);

      ok++;
      console.log(`✓ ${ok}. ${p.n}`);
    } catch (err) {
      fail++;
      console.error(`✗ ${p.n}: ${err.message}`);
    }
  }

  console.log(`\n=== Importação concluída: ${ok} projetos importados, ${fail} erros ===`);
  process.exit(0);
}

importAll();
