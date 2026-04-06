# CBRio PMO — Módulo Ciclo Criativo
## Instruções para Claude Code

> **Importante:** Este documento é para ser executado no Claude Code via terminal.
> Leia cada seção na ordem. Não execute etapas fora de ordem.
> Onde há `[AJUSTAR]`, substitua pelo valor real do seu ambiente.

---

## Contexto do sistema atual

O projeto CBRio PMO é uma aplicação React + Node.js + Express com as seguintes características:

- **Frontend:** React 18 + Vite, arquivo principal `src/App.jsx` (ou equivalente)
- **Backend:** Node.js + Express, pasta `cbrio-backend/`
- **Banco:** Migrado de PostgreSQL nativo para **Supabase** (auth já gerenciado pelo Supabase)
- **Auth:** Supabase Auth — o controle de usuários já existe, apenas precisamos configurar os metadados de perfil
- **Roles existentes:** `diretor`, `admin`, `assistente`

---

## O que este documento adiciona

1. Novos perfis de usuário no Supabase (via `user_metadata`)
2. Novas tabelas no banco Supabase para o módulo de Ciclo Criativo
3. RLS (Row Level Security) por perfil
4. Dados seed das 11 fases e das tarefas administrativas padrão
5. Novas rotas no backend Express
6. Novos componentes no frontend React

---

## PASSO 1 — Configurar perfis de usuário no Supabase

### 1.1 — Novos perfis definidos

O sistema passa a usar os seguintes perfis (substituindo diretor/admin/assistente):

| Perfil | Acesso |
|---|---|
| `pmo` | Visão e edição global de tudo |
| `lider_adm` | Vê todos os processos ADM de todos os eventos, gerencia manutenção |
| `lider_marketing` | Vê e edita trilha de marketing de todos os eventos |
| `lider_area_adm` | Vê e marca checklist da sua área (limpeza, compras ou financeiro) |
| `membro_marketing` | Vê suas tarefas e marca como concluído |

### 1.2 — Instrução para Claude Code

Abra o terminal do Claude Code e instrua:

```
No Supabase Dashboard (ou via Supabase CLI), execute o seguinte SQL no editor SQL:

-- Adicionar campo 'area' ao metadata dos usuários ADM de área
-- (isso será feito manualmente pelo PMO no dashboard Supabase para cada usuário)
-- O campo user_metadata.role deve ser um dos: pmo, lider_adm, lider_marketing, lider_area_adm, membro_marketing
-- O campo user_metadata.area deve ser: limpeza | compras | financeiro | marketing | manutencao (quando aplicável)

-- Criar função helper para leitura de role via JWT
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role')
  )
$$ LANGUAGE SQL STABLE;

-- Criar função helper para leitura de area via JWT
CREATE OR REPLACE FUNCTION get_user_area()
RETURNS TEXT AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'area')
$$ LANGUAGE SQL STABLE;
```

### 1.3 — Mapeamento de compatibilidade com roles antigas

No arquivo de autenticação do backend (onde se valida o JWT), adicione o seguinte mapeamento para não quebrar usuários já cadastrados:

```javascript
// Em cbrio-backend/middleware/auth.js (ou onde estiver a lógica de auth)
// Adicionar mapeamento de roles antigas para novas:
const ROLE_MAP = {
  'diretor': 'pmo',
  'admin': 'lider_adm',
  'assistente': 'membro_marketing',
  // novos perfis passam direto:
  'pmo': 'pmo',
  'lider_adm': 'lider_adm',
  'lider_marketing': 'lider_marketing',
  'lider_area_adm': 'lider_area_adm',
  'membro_marketing': 'membro_marketing',
};

// Permissões por perfil:
const PERMISSIONS = {
  pmo: {
    canEditAll: true,
    canEditMarketing: true,
    canEditAdm: true,
    canViewAll: true,
    canViewMarketing: true,
    canViewAdm: true,
    canManageBudget: true,
    canApproveExpenses: true,
    label: 'PMO',
  },
  lider_adm: {
    canEditAll: false,
    canEditMarketing: false,
    canEditAdm: true,
    canViewAll: true,
    canViewMarketing: true,
    canViewAdm: true,
    canManageBudget: false,
    canApproveExpenses: false,
    label: 'Líder Administrativo',
  },
  lider_marketing: {
    canEditAll: false,
    canEditMarketing: true,
    canEditAdm: false,
    canViewAll: false,
    canViewMarketing: true,
    canViewAdm: false,
    canManageBudget: false,
    canApproveExpenses: false,
    label: 'Líder de Marketing',
  },
  lider_area_adm: {
    canEditAll: false,
    canEditMarketing: false,
    canEditAdm: false,  // não edita, só marca checklist
    canViewAll: false,
    canViewMarketing: false,
    canViewAdm: true,  // só sua área
    canManageBudget: false,
    canApproveExpenses: false,
    canMarkChecklist: true,
    label: 'Líder de Área ADM',
  },
  membro_marketing: {
    canEditAll: false,
    canEditMarketing: false,
    canEditAdm: false,
    canViewAll: false,
    canViewMarketing: true,
    canViewAdm: false,
    canManageBudget: false,
    canApproveExpenses: false,
    canMarkChecklist: true,
    label: 'Membro de Marketing',
  },
};
```

---

## PASSO 2 — Criar tabelas do Ciclo Criativo no Supabase

Execute o SQL abaixo **integralmente** no editor SQL do Supabase (ou via migration).

> **Atenção:** As tabelas `events`, `tasks`, `meetings`, `users`, `activity_log`, `notifications` já existem. Não as recriar.

```sql
-- ================================================================
-- MÓDULO: CICLO CRIATIVO — CBRio PMO
-- Versão: 1.0
-- Pré-requisito: tabelas events e auth.users já existem
-- ================================================================

-- ----------------------------------------------------------------
-- TABELA 1: Fases do template (11 fases do ciclo criativo CBLab)
-- Dados fixos — seed inserido abaixo
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cycle_phase_templates (
    id                  SERIAL PRIMARY KEY,
    numero              INTEGER NOT NULL,           -- 1 a 11
    nome                VARCHAR(100) NOT NULL,
    descricao           TEXT,
    semanas_inicio      INTEGER NOT NULL,           -- semanas antes do Dia D (negativo = antes, 0 = Dia D, +1 = após)
    semanas_fim         INTEGER NOT NULL,
    area                VARCHAR(20) NOT NULL        -- 'marketing' | 'ambos'
                        CHECK (area IN ('marketing', 'ambos')),
    momento_chave       BOOLEAN DEFAULT false,
    responsavel_padrao  VARCHAR(200),               -- ex: 'CBLab', 'Produção + Adoração'
    entregas_padrao     TEXT,                       -- descrição das entregas esperadas
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- TABELA 2: Ciclo criativo ativado por evento
-- Criado quando PMO ou líder de marketing ativa o ciclo em um evento
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_cycles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    ativado_por         UUID REFERENCES auth.users(id),
    ativado_em          TIMESTAMPTZ DEFAULT NOW(),
    data_dia_d          DATE NOT NULL,              -- data do Dia D (cópia de events.date)
    status              VARCHAR(20) DEFAULT 'ativo'
                        CHECK (status IN ('ativo', 'pausado', 'encerrado')),
    observacoes         TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id)                                -- um ciclo por evento
);

-- ----------------------------------------------------------------
-- TABELA 3: Instâncias das fases por evento
-- Geradas automaticamente ao ativar o ciclo
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_cycle_phases (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    template_id         INTEGER NOT NULL REFERENCES cycle_phase_templates(id),
    numero_fase         INTEGER NOT NULL,
    nome_fase           VARCHAR(100) NOT NULL,
    area                VARCHAR(20) NOT NULL,
    momento_chave       BOOLEAN DEFAULT false,
    data_inicio_prevista DATE,                      -- calculada automaticamente no backend
    data_fim_prevista    DATE,
    data_conclusao      DATE,
    status              VARCHAR(20) DEFAULT 'pendente'
                        CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'atrasada', 'em_risco')),
    observacoes         TEXT,
    updated_by          UUID REFERENCES auth.users(id),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- TABELA 4: Tarefas dentro de cada fase (instâncias por evento)
-- Criadas pelo líder de marketing ou PMO
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cycle_phase_tasks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_phase_id      UUID NOT NULL REFERENCES event_cycle_phases(id) ON DELETE CASCADE,
    event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    titulo              VARCHAR(300) NOT NULL,
    descricao           TEXT,
    area                VARCHAR(20) NOT NULL        -- 'marketing' | 'adm'
                        CHECK (area IN ('marketing', 'adm')),
    responsavel_id      UUID REFERENCES auth.users(id),
    responsavel_nome    VARCHAR(200),               -- nome livre (caso não seja usuário do sistema)
    prazo               DATE,
    status              VARCHAR(20) DEFAULT 'a_fazer'
                        CHECK (status IN ('a_fazer', 'em_andamento', 'bloqueada', 'concluida')),
    prioridade          VARCHAR(10) DEFAULT 'normal'
                        CHECK (prioridade IN ('baixa', 'normal', 'alta')),
    entrega             TEXT,                       -- o que deve ser entregue nesta tarefa
    observacoes         TEXT,
    created_by          UUID REFERENCES auth.users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- TABELA 5: Trilha administrativa padrão por evento
-- Gerada automaticamente ao ativar o ciclo (–5 semanas)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_adm_track (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    semana              INTEGER NOT NULL,           -- –5, –4, –3, –2, –1, 0 (Dia D)
    area                VARCHAR(20) NOT NULL        -- 'compras' | 'financeiro' | 'limpeza' | 'manutencao'
                        CHECK (area IN ('compras', 'financeiro', 'limpeza', 'manutencao')),
    titulo              VARCHAR(300) NOT NULL,
    descricao           TEXT,
    entrega_esperada    TEXT,
    responsavel_id      UUID REFERENCES auth.users(id),
    responsavel_nome    VARCHAR(200),
    data_prevista       DATE,
    status              VARCHAR(20) DEFAULT 'pendente'
                        CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'nao_aplicavel')),
    checked_by          UUID REFERENCES auth.users(id),
    checked_at          TIMESTAMPTZ,
    observacoes         TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- TABELA 6: Orçamento e gastos por evento
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_budgets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    orcamento_aprovado  DECIMAL(12,2) NOT NULL DEFAULT 0,
    observacoes         TEXT,
    aprovado_por        VARCHAR(200),               -- quem aprovou (liderança da igreja)
    aprovado_em         DATE,
    created_by          UUID REFERENCES auth.users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id)
);

CREATE TABLE IF NOT EXISTS event_expenses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    descricao           VARCHAR(300) NOT NULL,
    valor               DECIMAL(12,2) NOT NULL,
    categoria           VARCHAR(20) NOT NULL
                        CHECK (categoria IN ('compras', 'manutencao', 'limpeza', 'financeiro', 'outro')),
    fornecedor          VARCHAR(200),
    data_gasto          DATE DEFAULT CURRENT_DATE,
    status              VARCHAR(20) DEFAULT 'registrado'
                        CHECK (status IN ('registrado', 'aprovado', 'pendente_aprovacao', 'rejeitado')),
    alerta_enviado      BOOLEAN DEFAULT false,      -- se gerou alerta de estouro de orçamento
    registrado_por      UUID REFERENCES auth.users(id),
    aprovado_por        UUID REFERENCES auth.users(id),
    observacoes         TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- TABELA 7: Alertas de orçamento
-- Disparados automaticamente quando total_gasto > orcamento_aprovado
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budget_alerts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    expense_id          UUID REFERENCES event_expenses(id),
    orcamento_aprovado  DECIMAL(12,2),
    total_gasto_atual   DECIMAL(12,2),
    valor_excedido      DECIMAL(12,2),
    status              VARCHAR(20) DEFAULT 'pendente'
                        CHECK (status IN ('pendente', 'resolvido', 'aprovado_pela_lideranca')),
    notificado_em       TIMESTAMPTZ DEFAULT NOW(),
    resolvido_em        TIMESTAMPTZ,
    resolvido_por       UUID REFERENCES auth.users(id),
    observacoes         TEXT
);

-- ----------------------------------------------------------------
-- ÍNDICES para performance
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_event_cycles_event ON event_cycles(event_id);
CREATE INDEX IF NOT EXISTS idx_event_cycle_phases_event ON event_cycle_phases(event_id);
CREATE INDEX IF NOT EXISTS idx_event_cycle_phases_status ON event_cycle_phases(status);
CREATE INDEX IF NOT EXISTS idx_cycle_phase_tasks_phase ON cycle_phase_tasks(event_phase_id);
CREATE INDEX IF NOT EXISTS idx_cycle_phase_tasks_event ON cycle_phase_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_cycle_phase_tasks_responsavel ON cycle_phase_tasks(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_cycle_phase_tasks_status ON cycle_phase_tasks(status);
CREATE INDEX IF NOT EXISTS idx_event_adm_track_event ON event_adm_track(event_id);
CREATE INDEX IF NOT EXISTS idx_event_adm_track_area ON event_adm_track(area);
CREATE INDEX IF NOT EXISTS idx_event_expenses_event ON event_expenses(event_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_event ON budget_alerts(event_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_status ON budget_alerts(status);

-- ----------------------------------------------------------------
-- TRIGGERS: updated_at automático
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_cycle_phases_upd
  BEFORE UPDATE ON event_cycle_phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_cycle_phase_tasks_upd
  BEFORE UPDATE ON cycle_phase_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_event_adm_track_upd
  BEFORE UPDATE ON event_adm_track
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_event_budgets_upd
  BEFORE UPDATE ON event_budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------
-- VIEW: resumo do ciclo por evento (usado no painel PMO)
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW vw_cycle_summary AS
SELECT
    ec.event_id,
    e.name AS event_name,
    e.date AS event_date,
    ec.status AS cycle_status,
    COUNT(ecp.id) AS total_phases,
    COUNT(ecp.id) FILTER (WHERE ecp.status = 'concluida') AS phases_done,
    COUNT(ecp.id) FILTER (WHERE ecp.status IN ('atrasada','em_risco')) AS phases_at_risk,
    COUNT(cpt.id) AS total_tasks,
    COUNT(cpt.id) FILTER (WHERE cpt.status = 'concluida') AS tasks_done,
    COUNT(cpt.id) FILTER (WHERE cpt.status = 'bloqueada') AS tasks_blocked,
    ROUND(
      COUNT(ecp.id) FILTER (WHERE ecp.status = 'concluida')::numeric /
      NULLIF(COUNT(ecp.id), 0) * 100
    , 0) AS pct_phases_done,
    EXISTS (
      SELECT 1 FROM budget_alerts ba
      WHERE ba.event_id = ec.event_id AND ba.status = 'pendente'
    ) AS has_budget_alert
FROM event_cycles ec
JOIN events e ON e.id = ec.event_id
LEFT JOIN event_cycle_phases ecp ON ecp.event_id = ec.event_id
LEFT JOIN cycle_phase_tasks cpt ON cpt.event_id = ec.event_id
GROUP BY ec.event_id, e.name, e.date, ec.status;

-- ----------------------------------------------------------------
-- VIEW: tarefas por responsável (usado na tela do funcionário)
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW vw_tasks_by_user AS
SELECT
    cpt.id AS task_id,
    cpt.event_id,
    e.name AS event_name,
    e.date AS event_date,
    ecp.nome_fase AS phase_name,
    ecp.numero_fase AS phase_number,
    cpt.titulo,
    cpt.area,
    cpt.status,
    cpt.prazo,
    cpt.responsavel_id,
    cpt.prioridade
FROM cycle_phase_tasks cpt
JOIN events e ON e.id = cpt.event_id
JOIN event_cycle_phases ecp ON ecp.id = cpt.event_phase_id
ORDER BY cpt.prazo ASC NULLS LAST;
```

---

## PASSO 3 — Inserir dados seed (fases template + trilha ADM padrão)

Execute o SQL abaixo após criar as tabelas:

```sql
-- ================================================================
-- SEED: 11 fases do Ciclo Criativo CBLab
-- Fonte: CICLO_CRIATIVO_CBRio_CBLab.pdf
-- ================================================================
INSERT INTO cycle_phase_templates
  (numero, nome, descricao, semanas_inicio, semanas_fim, area, momento_chave, responsavel_padrao, entregas_padrao)
VALUES
  (1, 'Pré Briefing',
   'A CBLab se prepara antes de qualquer criação começar. Organizar e entender o tema do projeto, olhando para o calendário da igreja.',
   -13, -13, 'marketing', false,
   'CBLab',
   'Envio de e-mail convite para marcar a reunião de briefing'),

  (2, 'Briefing',
   'Encontro para receber a direção do pastor, ministério ou líder sobre o projeto. Alinhar visão, tema, objetivos e o que precisa ser entregue.',
   -12, -12, 'marketing', false,
   'Líder Criativo + Pastores + Líderes Ministeriais + CBLab',
   'Etapa 1: Definição de temática, objetivos, KPIs, texto-base e necessidades técnicas. Etapa 2: Envio do briefing final por e-mail.'),

  (3, 'Brainstorming e Conceito',
   'Momento de reunir ideias. O time da CBLab pensa no conceito visual e na linguagem que vão guiar toda a campanha ou evento.',
   -11, -10, 'marketing', false,
   'CBLab | Apoio: Adoração + Produção',
   'Referências, rascunhos de roteiros e propostas de abordagem'),

  (4, 'Identidade e Estratégia',
   'Com o conceito definido, chega a hora de criar a identidade da campanha. Surgem os elementos visuais, a logo, as cores e o plano estratégico de comunicação.',
   -9, -8, 'marketing', false,
   'CBLab | Apoio: Produção',
   'Logomarca, key visual, paleta de cores, peça conceito, defesa e planilha estratégica'),

  (5, 'Aprovação',
   'Após a criação, o projeto é apresentado para o cliente. Serve para alinhar a visão e validar a direção criativa e estratégica.',
   -7, -7, 'marketing', true,
   'Cliente demandante | Apoio: CBLab',
   'Reunião de aprovação com apresentação do material; envio por e-mail do material aprovado e resumo do que foi decidido'),

  (6, 'Execução Estratégica',
   'Com o projeto aprovado, começa a produção de tudo que será usado: vídeos, posts, impressos e demais peças. A campanha em si começa a ser executada.',
   -6, -5, 'marketing', true,
   'CBLab | Apoio: Diretor Criativo',
   'Peças on e off, calendário de redes e materiais audiovisuais'),

  (7, 'Pré-Testes',
   'Antes do grande dia, é hora de testar tudo. Verificar se os vídeos, luzes, som e transmissões estão funcionando e se os espaços estão prontos.',
   -4, -4, 'ambos', true,
   'Produção | Apoio: CBLab + Online',
   'Testes de áudio, vídeo, luz e stream; mapa de ocupação dos espaços e ensaios musicais com timecodes'),

  (8, 'Finalizações',
   'Aqui tudo é revisado e finalizado, garantindo que o projeto esteja 100% pronto.',
   -3, -3, 'marketing', false,
   'CBLab + Produção',
   'Vídeos, peças finais, pacotes ProPresenter, timecodes sincronizados e cenografia contratada'),

  (9, 'Alinhamentos Operacionais Finais',
   'Na reta final, as equipes de produção, adoração e CBLab fazem os últimos ajustes e checam cada detalhe.',
   -2, -1, 'ambos', false,
   'Produção + Adoração | Apoio: CBLab + Igreja Online',
   'Revisão de roteiro, checagem técnica, comunicação final e montagem de cenografia no templo e lounge'),

  (10, 'Dia D',
   'Chegou o grande momento! Simulação completa e depois o evento ou culto ao vivo. Tudo é executado de forma sincronizada entre as equipes.',
   0, 0, 'ambos', true,
   'Toda área criativa',
   'Simulação com passagem de som, ensaio com vídeos, luz e timecodes; execução do evento/culto com pré e pós conduzidos pela Igreja Online'),

  (11, 'Debrief',
   'Depois de tudo, é hora de olhar para o que foi feito, celebrar os resultados e aprender com o processo.',
   1, 1, 'marketing', true,
   'Líder Criativo + Líderes de Áreas Criativas',
   'Relatório de debrief, registro de KPIs e arquivamento de materiais');

-- ================================================================
-- SEED: Trilha administrativa padrão (5 semanas)
-- Estas são tarefas MODELO — serão copiadas para cada evento ao ativar o ciclo
-- Armazenadas como JSON no backend ou como tabela de templates
-- ================================================================
-- Nota: A trilha ADM é gerada dinamicamente pelo backend ao ativar o ciclo.
-- O backend usa a estrutura abaixo como template e insere em event_adm_track.
-- Não é necessário criar uma tabela de templates ADM separada —
-- o backend tem esse array hardcoded (ver PASSO 4).
```

---

## PASSO 4 — Configurar RLS (Row Level Security) no Supabase

```sql
-- ================================================================
-- RLS: Ciclo Criativo
-- ================================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE event_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_cycle_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_phase_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_adm_track ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- POLICY: event_cycles
-- ----------------------------------------------------------------
CREATE POLICY "pmo vê tudo em event_cycles"
  ON event_cycles FOR ALL
  USING (get_user_role() IN ('pmo', 'diretor'));

CREATE POLICY "lider_marketing lê seu ciclo"
  ON event_cycles FOR SELECT
  USING (get_user_role() IN ('lider_marketing', 'lider_adm'));

-- ----------------------------------------------------------------
-- POLICY: event_cycle_phases
-- ----------------------------------------------------------------
CREATE POLICY "pmo edita todas as fases"
  ON event_cycle_phases FOR ALL
  USING (get_user_role() IN ('pmo', 'diretor'));

CREATE POLICY "lider_marketing edita fases de marketing"
  ON event_cycle_phases FOR ALL
  USING (
    get_user_role() = 'lider_marketing'
    AND area = 'marketing'
  );

CREATE POLICY "lider_adm lê todas as fases"
  ON event_cycle_phases FOR SELECT
  USING (get_user_role() = 'lider_adm');

CREATE POLICY "membro_marketing lê fases de marketing"
  ON event_cycle_phases FOR SELECT
  USING (get_user_role() IN ('membro_marketing', 'lider_area_adm'));

-- ----------------------------------------------------------------
-- POLICY: cycle_phase_tasks
-- ----------------------------------------------------------------
CREATE POLICY "pmo gerencia todas as tarefas"
  ON cycle_phase_tasks FOR ALL
  USING (get_user_role() IN ('pmo', 'diretor'));

CREATE POLICY "lider_marketing gerencia tarefas de marketing"
  ON cycle_phase_tasks FOR ALL
  USING (
    get_user_role() = 'lider_marketing'
    AND area = 'marketing'
  );

CREATE POLICY "membro_marketing vê e marca suas tarefas"
  ON cycle_phase_tasks FOR SELECT
  USING (
    get_user_role() = 'membro_marketing'
    AND responsavel_id = auth.uid()
  );

CREATE POLICY "membro_marketing atualiza status das suas tarefas"
  ON cycle_phase_tasks FOR UPDATE
  USING (
    get_user_role() = 'membro_marketing'
    AND responsavel_id = auth.uid()
  )
  WITH CHECK (
    responsavel_id = auth.uid()
  );

-- ----------------------------------------------------------------
-- POLICY: event_adm_track
-- ----------------------------------------------------------------
CREATE POLICY "pmo gerencia trilha adm"
  ON event_adm_track FOR ALL
  USING (get_user_role() IN ('pmo', 'diretor'));

CREATE POLICY "lider_adm gerencia trilha adm"
  ON event_adm_track FOR ALL
  USING (get_user_role() = 'lider_adm');

CREATE POLICY "lider_area_adm vê e marca sua área"
  ON event_adm_track FOR SELECT
  USING (
    get_user_role() = 'lider_area_adm'
    AND area = get_user_area()
  );

CREATE POLICY "lider_area_adm atualiza status da sua área"
  ON event_adm_track FOR UPDATE
  USING (
    get_user_role() = 'lider_area_adm'
    AND area = get_user_area()
  );

-- ----------------------------------------------------------------
-- POLICY: event_budgets e event_expenses
-- ----------------------------------------------------------------
CREATE POLICY "pmo gerencia orçamentos"
  ON event_budgets FOR ALL
  USING (get_user_role() IN ('pmo', 'diretor'));

CREATE POLICY "lider_adm lê orçamentos"
  ON event_budgets FOR SELECT
  USING (get_user_role() = 'lider_adm');

CREATE POLICY "pmo gerencia gastos"
  ON event_expenses FOR ALL
  USING (get_user_role() IN ('pmo', 'diretor'));

CREATE POLICY "lider_area_adm registra gastos"
  ON event_expenses FOR INSERT
  USING (get_user_role() IN ('lider_area_adm', 'lider_adm'));

CREATE POLICY "todos leem alertas de orçamento"
  ON budget_alerts FOR SELECT
  USING (get_user_role() IN ('pmo', 'diretor', 'lider_adm'));

CREATE POLICY "pmo resolve alertas"
  ON budget_alerts FOR UPDATE
  USING (get_user_role() IN ('pmo', 'diretor'));
```

---

## PASSO 5 — Criar rotas no backend (Node.js + Express)

Criar o arquivo `cbrio-backend/routes/cycles.js` com o seguinte conteúdo:

```javascript
// cbrio-backend/routes/cycles.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Importar middleware de auth existente do projeto
const { authMiddleware } = require('../middleware/auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service key para o backend
);

// ----------------------------------------------------------------
// HELPER: calcular datas das fases a partir do Dia D
// ----------------------------------------------------------------
function calcularDatas(diaDDate, semanasInicio, semanasFim) {
  const diaD = new Date(diaDDate);
  const inicio = new Date(diaD);
  inicio.setDate(diaD.getDate() + (semanasInicio * 7));
  const fim = new Date(diaD);
  fim.setDate(diaD.getDate() + (semanasFim * 7));
  return {
    data_inicio_prevista: inicio.toISOString().split('T')[0],
    data_fim_prevista: fim.toISOString().split('T')[0],
  };
}

// ----------------------------------------------------------------
// TEMPLATE: Trilha administrativa padrão (5 semanas)
// ----------------------------------------------------------------
const ADM_TRACK_TEMPLATE = [
  // Semana -5
  { semana: -5, area: 'compras', titulo: 'Receber lista de compras do marketing', descricao: 'Receber lista consolidada de todas as peças, materiais e serviços definidos na Execução Estratégica', entrega_esperada: 'Lista de compras consolidada com fornecedor, valor estimado e prazo de entrega para cada item' },
  { semana: -5, area: 'compras', titulo: 'Levantar fornecedores e cotar itens', descricao: 'Levantar fornecedores e cotar cada item da lista. Verificar estoque disponível antes de solicitar novas compras', entrega_esperada: 'Cotações enviadas ao financeiro' },
  { semana: -5, area: 'financeiro', titulo: 'Verificar disponibilidade orçamentária', descricao: 'Receber estimativa de custos e verificar disponibilidade orçamentária para o evento', entrega_esperada: 'Parecer financeiro: itens aprovados, pendentes e fora do orçamento' },
  { semana: -5, area: 'manutencao', titulo: 'Vistoria inicial dos espaços', descricao: 'Receber briefing do evento e fazer vistoria inicial dos espaços que serão utilizados. Identificar necessidades de intervenção', entrega_esperada: 'Relatório de vistoria com lista de intervenções necessárias e estimativa de tempo' },
  { semana: -5, area: 'limpeza', titulo: 'Ciência e planejamento do evento', descricao: 'Tomar ciência do evento: espaços, data e público estimado. Planejamento interno', entrega_esperada: 'Nenhuma entrega formal — apenas ciência e planejamento interno' },
  // Semana -4
  { semana: -4, area: 'compras', titulo: 'Emitir ordens de compra', descricao: 'Emitir ordens de compra para os itens aprovados pelo financeiro. Confirmar prazos de entrega com fornecedores', entrega_esperada: 'Ordens de compra emitidas e confirmadas com data prevista de entrega' },
  { semana: -4, area: 'financeiro', titulo: 'Aprovar itens e processar pagamentos de entrada', descricao: 'Aprovar ou rejeitar itens pendentes. Processar pagamentos de entrada (sinal) exigidos por fornecedores', entrega_esperada: 'Aprovações concluídas e pagamentos de sinal processados' },
  { semana: -4, area: 'manutencao', titulo: 'Iniciar intervenções estruturais', descricao: 'Iniciar intervenções com maior prazo de execução (pintura, instalações elétricas, montagens estruturais)', entrega_esperada: 'Cronograma de execução das intervenções aprovado pelo PMO' },
  { semana: -4, area: 'limpeza', titulo: 'Planejar cronograma de limpeza', descricao: 'Planejar cronograma de limpeza pré-evento considerando as intervenções da manutenção. Definir equipe e turnos', entrega_esperada: 'Plano de limpeza com datas e responsáveis definidos' },
  // Semana -3
  { semana: -3, area: 'compras', titulo: 'Receber e conferir materiais', descricao: 'Receber e conferir materiais entregues pelos fornecedores. Registrar divergências. Entregar às áreas responsáveis', entrega_esperada: 'Confirmação de recebimento de todos os itens. Divergências registradas e em tratativa' },
  { semana: -3, area: 'financeiro', titulo: 'Processar pagamentos finais e consolidar custo', descricao: 'Processar pagamentos finais dos fornecedores. Consolidar custo total do evento com base nas notas fiscais', entrega_esperada: 'Relatório de custo consolidado do evento até esta semana' },
  { semana: -3, area: 'manutencao', titulo: 'Concluir montagem e participar dos pré-testes', descricao: 'Concluir intervenções estruturais. Executar montagem de cenografia. Participar dos pré-testes para validar infraestrutura', entrega_esperada: 'Espaços prontos para pré-testes. Checklist de infraestrutura concluído' },
  { semana: -3, area: 'limpeza', titulo: 'Limpeza profunda pós-intervenções', descricao: 'Realizar limpeza profunda nos espaços após as intervenções da manutenção. Deixar prontos para os pré-testes', entrega_esperada: 'Espaços limpos e prontos para ensaios e pré-testes' },
  // Semana -2
  { semana: -2, area: 'compras', titulo: 'Resolver pendências de entrega', descricao: 'Resolver pendências de entrega ainda em aberto. Realizar compras emergenciais pontuais se autorizadas', entrega_esperada: 'Todas as compras concluídas ou com previsão confirmada' },
  { semana: -2, area: 'financeiro', titulo: 'Relatório financeiro preliminar', descricao: 'Processar pagamentos restantes. Fazer previsão de custos do Dia D. Emitir relatório financeiro preliminar para o PMO', entrega_esperada: 'Relatório financeiro preliminar com custo real x previsto' },
  { semana: -2, area: 'manutencao', titulo: 'Ajustes finais e cronograma do Dia D', descricao: 'Fazer ajustes finais na infraestrutura com base no feedback dos pré-testes. Confirmar cronograma de atuação no Dia D', entrega_esperada: 'Cronograma do Dia D da manutenção com horários e responsável definido' },
  { semana: -2, area: 'limpeza', titulo: 'Confirmar cronograma de limpeza do Dia D', descricao: 'Confirmar cronograma de limpeza do Dia D: pré-evento, intervalos e pós-evento. Definir responsável on-site', entrega_esperada: 'Cronograma de limpeza do Dia D aprovado' },
  // Semana -1
  { semana: -1, area: 'compras', titulo: 'Checklist final de compras', descricao: 'Confirmar que todos os itens foram recebidos e entregues às áreas. Estar em standby para compras emergenciais', entrega_esperada: 'Checklist final de compras 100% conferido e entregue ao PMO' },
  { semana: -1, area: 'financeiro', titulo: 'Liberar verba do Dia D', descricao: 'Liberar verba para despesas do Dia D. Confirmar forma de pagamento para fornecedores que emitem nota no ato', entrega_esperada: 'Caixa do Dia D definido e autorizado' },
  { semana: -1, area: 'manutencao', titulo: 'Vistoria final e alinhamento operacional', descricao: 'Participar do alinhamento operacional final. Fazer vistoria final dos espaços. Confirmar ferramentas e equipamentos', entrega_esperada: 'Vistoria final concluída. Equipe escalada e ciente dos horários' },
  { semana: -1, area: 'limpeza', titulo: 'Limpeza final e alinhamento', descricao: 'Realizar limpeza final completa. Participar do alinhamento operacional final para saber pontos de atenção', entrega_esperada: 'Espaços 100% limpos e prontos. Equipe escalada para o Dia D' },
  // Semana 0 (Dia D)
  { semana: 0, area: 'compras', titulo: 'Standby para emergências', descricao: 'Manter contato disponível para eventuais emergências. Acesso a fornecedores de emergência se necessário', entrega_esperada: 'Standby — sem entrega formal' },
  { semana: 0, area: 'financeiro', titulo: 'Caixa e registro de despesas do Dia D', descricao: 'Ter caixa liberado para despesas do dia. Registrar todas as despesas realizadas no dia para fechamento posterior', entrega_esperada: 'Registro de despesas do Dia D para fechamento financeiro' },
  { semana: 0, area: 'manutencao', titulo: 'On-site: montagem, operação e desmontagem', descricao: 'Estar on-site desde a montagem final. Resolver imprevistos de infraestrutura. Liderar desmontagem após o evento', entrega_esperada: 'Espaços desmontados e devolvidos após o evento' },
  { semana: 0, area: 'limpeza', titulo: 'On-site: limpeza pré, durante e pós-evento', descricao: 'Limpeza de preparação antes da abertura. Manutenção durante o evento. Limpeza pós-evento de todos os espaços', entrega_esperada: 'Espaços limpos e liberados após o evento' },
];

// ----------------------------------------------------------------
// POST /api/cycles/activate/:eventId
// Ativa o ciclo criativo para um evento
// ----------------------------------------------------------------
router.post('/activate/:eventId', authMiddleware(['pmo', 'diretor', 'lider_marketing']), async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.id;

  try {
    // Buscar o evento
    const { data: event, error: evErr } = await supabase
      .from('events')
      .select('id, date, name')
      .eq('id', eventId)
      .single();

    if (evErr || !event) return res.status(404).json({ error: 'Evento não encontrado' });

    const diaDDate = event.date;

    // Verificar se já existe ciclo
    const { data: existing } = await supabase
      .from('event_cycles')
      .select('id')
      .eq('event_id', eventId)
      .single();

    if (existing) return res.status(409).json({ error: 'Ciclo já ativado para este evento' });

    // Criar o ciclo
    const { data: cycle, error: cycleErr } = await supabase
      .from('event_cycles')
      .insert({ event_id: eventId, ativado_por: userId, data_dia_d: diaDDate })
      .select()
      .single();

    if (cycleErr) throw cycleErr;

    // Buscar templates de fases
    const { data: templates } = await supabase
      .from('cycle_phase_templates')
      .select('*')
      .order('numero');

    // Criar instâncias das 11 fases com datas calculadas
    const phases = templates.map(t => {
      const datas = calcularDatas(diaDDate, t.semanas_inicio, t.semanas_fim);
      return {
        event_id: eventId,
        template_id: t.id,
        numero_fase: t.numero,
        nome_fase: t.nome,
        area: t.area,
        momento_chave: t.momento_chave,
        status: 'pendente',
        ...datas,
      };
    });

    const { error: phasesErr } = await supabase.from('event_cycle_phases').insert(phases);
    if (phasesErr) throw phasesErr;

    // Criar trilha administrativa (calcular data prevista por semana)
    const diaDObj = new Date(diaDDate);
    const admTrack = ADM_TRACK_TEMPLATE.map(t => {
      const dataPrevista = new Date(diaDObj);
      dataPrevista.setDate(diaDObj.getDate() + (t.semana * 7));
      return {
        event_id: eventId,
        semana: t.semana,
        area: t.area,
        titulo: t.titulo,
        descricao: t.descricao,
        entrega_esperada: t.entrega_esperada,
        data_prevista: dataPrevista.toISOString().split('T')[0],
        status: 'pendente',
      };
    });

    const { error: admErr } = await supabase.from('event_adm_track').insert(admTrack);
    if (admErr) throw admErr;

    // Criar orçamento inicial (zerado — PMO preencherá depois)
    await supabase.from('event_budgets').insert({
      event_id: eventId,
      orcamento_aprovado: 0,
      created_by: userId,
    });

    res.json({ success: true, cycle, message: `Ciclo criativo ativado para ${event.name}` });
  } catch (err) {
    console.error('[CYCLE ACTIVATE]', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------
// GET /api/cycles/:eventId
// Retorna o ciclo completo de um evento (fases + tarefas + trilha ADM)
// ----------------------------------------------------------------
router.get('/:eventId', authMiddleware(), async (req, res) => {
  const { eventId } = req.params;
  try {
    const [cycleRes, phasesRes, tasksRes, admRes, budgetRes] = await Promise.all([
      supabase.from('event_cycles').select('*').eq('event_id', eventId).single(),
      supabase.from('event_cycle_phases').select('*').eq('event_id', eventId).order('numero_fase'),
      supabase.from('cycle_phase_tasks').select('*').eq('event_id', eventId),
      supabase.from('event_adm_track').select('*').eq('event_id', eventId).order('semana').order('area'),
      supabase.from('event_budgets').select('*').eq('event_id', eventId).single(),
    ]);

    // Calcular total gasto
    let totalGasto = 0;
    if (budgetRes.data) {
      const { data: expenses } = await supabase
        .from('event_expenses')
        .select('valor')
        .eq('event_id', eventId)
        .in('status', ['registrado', 'aprovado']);
      totalGasto = (expenses || []).reduce((acc, e) => acc + Number(e.valor), 0);
    }

    res.json({
      cycle: cycleRes.data,
      phases: phasesRes.data || [],
      tasks: tasksRes.data || [],
      admTrack: admRes.data || [],
      budget: budgetRes.data ? { ...budgetRes.data, total_gasto: totalGasto } : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------
// PATCH /api/cycles/phases/:phaseId
// Atualiza status de uma fase
// ----------------------------------------------------------------
router.patch('/phases/:phaseId', authMiddleware(['pmo', 'diretor', 'lider_marketing', 'lider_adm']), async (req, res) => {
  const { phaseId } = req.params;
  const { status, observacoes } = req.body;
  try {
    const { data, error } = await supabase
      .from('event_cycle_phases')
      .update({ status, observacoes, updated_by: req.user.id })
      .eq('id', phaseId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------
// POST /api/cycles/tasks
// Cria uma tarefa dentro de uma fase
// ----------------------------------------------------------------
router.post('/tasks', authMiddleware(['pmo', 'diretor', 'lider_marketing', 'lider_adm']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cycle_phase_tasks')
      .insert({ ...req.body, created_by: req.user.id })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------
// PATCH /api/cycles/tasks/:taskId
// Atualiza status de uma tarefa (funcionários podem marcar como concluída)
// ----------------------------------------------------------------
router.patch('/tasks/:taskId', authMiddleware(), async (req, res) => {
  const { taskId } = req.params;
  const role = req.user.role;
  const userId = req.user.id;

  // Membros de marketing só podem atualizar o status das próprias tarefas
  if (role === 'membro_marketing') {
    const { data: task } = await supabase
      .from('cycle_phase_tasks')
      .select('responsavel_id')
      .eq('id', taskId)
      .single();
    if (!task || task.responsavel_id !== userId) {
      return res.status(403).json({ error: 'Sem permissão para alterar esta tarefa' });
    }
    // Membros só podem alterar o campo status
    const { data, error } = await supabase
      .from('cycle_phase_tasks')
      .update({ status: req.body.status })
      .eq('id', taskId)
      .select()
      .single();
    if (error) throw error;
    return res.json(data);
  }

  try {
    const { data, error } = await supabase
      .from('cycle_phase_tasks')
      .update(req.body)
      .eq('id', taskId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------
// PATCH /api/cycles/adm/:itemId
// Marca item da trilha ADM (líderes de área)
// ----------------------------------------------------------------
router.patch('/adm/:itemId', authMiddleware(['pmo', 'diretor', 'lider_adm', 'lider_area_adm']), async (req, res) => {
  const { itemId } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  // lider_area_adm só pode marcar sua área
  if (role === 'lider_area_adm') {
    const { data: item } = await supabase
      .from('event_adm_track')
      .select('area')
      .eq('id', itemId)
      .single();
    if (!item || item.area !== req.user.area) {
      return res.status(403).json({ error: 'Sem permissão para alterar esta área' });
    }
  }

  try {
    const patch = {
      status: req.body.status,
      observacoes: req.body.observacoes,
      checked_by: userId,
      checked_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('event_adm_track')
      .update(patch)
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------
// POST /api/cycles/expenses
// Registra um gasto e verifica estouro de orçamento
// ----------------------------------------------------------------
router.post('/expenses', authMiddleware(['pmo', 'diretor', 'lider_adm', 'lider_area_adm']), async (req, res) => {
  try {
    const { event_id, valor } = req.body;

    // Inserir gasto
    const { data: expense, error } = await supabase
      .from('event_expenses')
      .insert({ ...req.body, registrado_por: req.user.id })
      .select()
      .single();
    if (error) throw error;

    // Verificar orçamento
    const { data: budget } = await supabase
      .from('event_budgets')
      .select('orcamento_aprovado')
      .eq('event_id', event_id)
      .single();

    if (budget && budget.orcamento_aprovado > 0) {
      const { data: allExpenses } = await supabase
        .from('event_expenses')
        .select('valor')
        .eq('event_id', event_id)
        .in('status', ['registrado', 'aprovado']);

      const totalGasto = (allExpenses || []).reduce((acc, e) => acc + Number(e.valor), 0);

      if (totalGasto > budget.orcamento_aprovado) {
        const valorExcedido = totalGasto - budget.orcamento_aprovado;
        // Criar alerta
        await supabase.from('budget_alerts').insert({
          event_id,
          expense_id: expense.id,
          orcamento_aprovado: budget.orcamento_aprovado,
          total_gasto_atual: totalGasto,
          valor_excedido: valorExcedido,
        });
        return res.json({
          expense,
          alert: true,
          message: `ATENÇÃO: Orçamento excedido em R$ ${valorExcedido.toFixed(2)}. Escalação para liderança necessária.`,
          totalGasto,
          orcamento: budget.orcamento_aprovado,
        });
      }
    }

    res.json({ expense, alert: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------
// GET /api/cycles/summary/all
// Resumo de todos os ciclos ativos (painel PMO)
// ----------------------------------------------------------------
router.get('/summary/all', authMiddleware(['pmo', 'diretor']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vw_cycle_summary')
      .select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

### 5.1 — Registrar as rotas no servidor principal

No arquivo `cbrio-backend/server.js` (ou `index.js`), adicionar:

```javascript
// Após os requires existentes, adicionar:
const cyclesRouter = require('./routes/cycles');

// Após as rotas existentes, adicionar:
app.use('/api/cycles', cyclesRouter);
```

### 5.2 — Adicionar variáveis de ambiente

No arquivo `.env` do backend, adicionar (se ainda não existirem):

```
SUPABASE_URL=https://[SEU_PROJECT_ID].supabase.co
SUPABASE_SERVICE_KEY=[SUA_SERVICE_ROLE_KEY]  # NÃO é a anon key — é a service_role
```

---

## PASSO 6 — Criar componentes no frontend React

### 6.1 — Criar arquivo de API client para ciclos

Criar o arquivo `src/api/cycles.js`:

```javascript
// src/api/cycles.js
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const token = localStorage.getItem('cbrio-token'); // ajustar para onde o token é armazenado
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}

export const cyclesApi = {
  activate: (eventId) => request(`/api/cycles/activate/${eventId}`, { method: 'POST' }),
  getByEvent: (eventId) => request(`/api/cycles/${eventId}`),
  updatePhase: (phaseId, data) => request(`/api/cycles/phases/${phaseId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  createTask: (data) => request('/api/cycles/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (taskId, data) => request(`/api/cycles/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateAdmItem: (itemId, data) => request(`/api/cycles/adm/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  registerExpense: (data) => request('/api/cycles/expenses', { method: 'POST', body: JSON.stringify(data) }),
  getSummaryAll: () => request('/api/cycles/summary/all'),
};
```

### 6.2 — Criar o componente CycleView

Criar o arquivo `src/components/CycleView.jsx`.

Este componente deve:
- Receber as props: `event`, `userRole`, `userArea`, `permissions`
- Ao montar, verificar se o evento tem ciclo ativado (GET `/api/cycles/:eventId`)
- Se não tiver ciclo: mostrar botão "Ativar ciclo criativo" (visível apenas para `pmo` e `lider_marketing`)
- Se tiver ciclo: mostrar as abas **Kanban** e **Gantt**

**Aba Kanban:**
- Filtros: por fase (dropdown com as 11 fases) e por área (marketing / adm)
- 4 colunas: `A fazer` | `Em andamento` | `Bloqueado` | `Concluído`
- Drag and drop entre colunas (usar a biblioteca `@dnd-kit/core` já instalada no projeto, ou instalar se não estiver)
- Cards mostram: nome da tarefa, badge de evento, badge de área (MKT / ADM), responsável, prazo
- PMO e líderes veem botão de adicionar tarefa dentro de cada coluna
- Funcionários veem apenas as próprias tarefas e podem arrastar entre colunas

**Aba Gantt:**
- Eixo Y: 11 fases (marketing) + trilha ADM em paralelo
- Eixo X: semanas (–13 até +1)
- Barras verdes = concluído, azuis = em andamento, vermelhas = atrasado/risco
- Linha vertical "hoje" destacada
- Para o PMO: exibe ambas as trilhas (marketing + ADM) lado a lado por evento

### 6.3 — Criar o componente BudgetPanel

Criar o arquivo `src/components/BudgetPanel.jsx`.

Este componente deve:
- Mostrar o orçamento aprovado do evento
- Mostrar a barra de progresso: total gasto / orçamento aprovado
- Se total_gasto > orcamento_aprovado: mostrar badge vermelho "Orçamento excedido" e listar os alertas pendentes
- Para `pmo` e `lider_adm`: botão de editar o valor do orçamento aprovado
- Para `lider_area_adm`: formulário simples de registrar gasto (descrição, valor, categoria)
- Os alertas pendentes mostram botão "Escalar para liderança" (apenas PMO) que marca o alert como `resolvido` com observação

### 6.4 — Integrar CycleView no EventDetail existente

No componente de detalhe do evento (`EventDetail` ou equivalente no `App.jsx`):

1. Adicionar uma nova aba "Ciclo Criativo" nas tabs do evento (ao lado de Tarefas, Reuniões, etc.)
2. Quando a aba "Ciclo Criativo" estiver ativa, renderizar `<CycleView event={ev} userRole={role} userArea={area} permissions={permissions} />`
3. No cabeçalho do evento, adicionar badge de status do ciclo (caso exista): `Ciclo: Fase X/11`

### 6.5 — Adicionar painel de ciclos na tela do PMO

Na tela principal do PMO (dashboard de eventos), adicionar uma seção "Ciclos ativos" que:
- Usa `cyclesApi.getSummaryAll()` para buscar o resumo
- Exibe cards por evento com: nome, % de fases concluídas, badge de risco, alerta de orçamento se houver
- Clicando no card, navega para o EventDetail na aba Ciclo Criativo

---

## PASSO 7 — Instalar dependências necessárias

No terminal, dentro da pasta do frontend:

```bash
# Se ainda não estiver instalado:
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## PASSO 8 — Verificações finais

Após implementar, verificar:

- [ ] SQL executado com sucesso no Supabase (sem erros)
- [ ] Seed das 11 fases inserido corretamente (`SELECT * FROM cycle_phase_templates ORDER BY numero`)
- [ ] RLS habilitado nas 7 novas tabelas
- [ ] Rota `/api/cycles` registrada no `server.js`
- [ ] Variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` no `.env` do backend
- [ ] `cyclesApi.js` criado em `src/api/`
- [ ] `CycleView.jsx` criado em `src/components/`
- [ ] `BudgetPanel.jsx` criado em `src/components/`
- [ ] Aba "Ciclo Criativo" aparece no EventDetail
- [ ] Botão "Ativar ciclo criativo" aparece para PMO e lider_marketing em eventos sem ciclo
- [ ] Ao ativar o ciclo, 11 fases são criadas com datas corretas
- [ ] Ao ativar o ciclo, 24 itens da trilha ADM são criados
- [ ] Drag and drop no Kanban salva o novo status via PATCH
- [ ] Registrar gasto acima do orçamento cria alerta em `budget_alerts`

---

## Notas importantes

**Sobre a migração de roles:**
O sistema anterior usava `diretor`, `admin`, `assistente`. O mapeamento é: diretor → pmo, admin → lider_adm, assistente → membro_marketing. Usuários existentes continuam funcionando via o ROLE_MAP no middleware de auth. Novos usuários devem receber os perfis novos diretamente no Supabase Dashboard em `user_metadata.role`.

**Sobre o Supabase Auth:**
O Supabase gerencia login, refresh de token e sessão automaticamente. O campo de role é armazenado em `user_metadata` dentro do JWT. Para ler no frontend: `session.user.user_metadata.role`. Para ler no backend (Express): decodificar o JWT e ler `payload.user_metadata.role`.

**Sobre o orçamento:**
O campo `orcamento_aprovado` começa em 0 ao ativar o ciclo. O PMO deve preencher o valor aprovado pela liderança assim que criar o ciclo. Qualquer gasto registrado após isso é comparado ao total acumulado.

**Sobre a trilha ADM:**
A trilha começa na semana –5 (quando o marketing entra na Fase 6 — Execução Estratégica). Na implementação atual, a ativação do ciclo cria TODAS as 24 tarefas da trilha ADM de uma vez, com as datas calculadas automaticamente a partir do Dia D. O sistema não bloqueia a trilha ADM até a semana –5 — isso é informativo, não técnico.
