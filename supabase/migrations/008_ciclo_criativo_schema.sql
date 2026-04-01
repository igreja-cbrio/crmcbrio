-- ============================================================
-- 008_ciclo_criativo_schema.sql
-- Módulo Ciclo Criativo: fases, tarefas, trilha ADM,
--                        orçamento, gastos, alertas
-- ============================================================

-- ── Helper functions para RLS ───────────────────────────────
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role')
  )
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION get_user_area()
RETURNS TEXT AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'area')
$$ LANGUAGE SQL STABLE;

-- ── TABELA 1: Templates de fases (11 fases fixas) ──────────
CREATE TABLE IF NOT EXISTS cycle_phase_templates (
  id                  SERIAL PRIMARY KEY,
  numero              INTEGER NOT NULL,
  nome                TEXT NOT NULL,
  descricao           TEXT,
  semanas_inicio      INTEGER NOT NULL,
  semanas_fim         INTEGER NOT NULL,
  area                TEXT NOT NULL CHECK (area IN ('marketing', 'ambos')),
  momento_chave       BOOLEAN DEFAULT FALSE,
  responsavel_padrao  TEXT,
  entregas_padrao     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABELA 2: Ciclo ativado por evento ──────────────────────
CREATE TABLE IF NOT EXISTS event_cycles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ativado_por     UUID REFERENCES auth.users(id),
  ativado_em      TIMESTAMPTZ DEFAULT NOW(),
  data_dia_d      DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'encerrado')),
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id)
);

-- ── TABELA 3: Instâncias das fases por evento ──────────────
CREATE TABLE IF NOT EXISTS event_cycle_phases (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  template_id           INTEGER NOT NULL REFERENCES cycle_phase_templates(id),
  numero_fase           INTEGER NOT NULL,
  nome_fase             TEXT NOT NULL,
  area                  TEXT NOT NULL,
  momento_chave         BOOLEAN DEFAULT FALSE,
  data_inicio_prevista  DATE,
  data_fim_prevista     DATE,
  data_conclusao        DATE,
  status                TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'atrasada', 'em_risco')),
  observacoes           TEXT,
  updated_by            UUID REFERENCES auth.users(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABELA 4: Tarefas dentro de cada fase ──────────────────
CREATE TABLE IF NOT EXISTS cycle_phase_tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_phase_id    UUID NOT NULL REFERENCES event_cycle_phases(id) ON DELETE CASCADE,
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  titulo            TEXT NOT NULL,
  descricao         TEXT,
  area              TEXT NOT NULL CHECK (area IN ('marketing', 'adm')),
  responsavel_id    UUID REFERENCES auth.users(id),
  responsavel_nome  TEXT,
  prazo             DATE,
  status            TEXT NOT NULL DEFAULT 'a_fazer' CHECK (status IN ('a_fazer', 'em_andamento', 'bloqueada', 'concluida')),
  prioridade        TEXT NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta')),
  entrega           TEXT,
  observacoes       TEXT,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABELA 5: Trilha administrativa por evento ─────────────
CREATE TABLE IF NOT EXISTS event_adm_track (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  semana            INTEGER NOT NULL,
  area              TEXT NOT NULL CHECK (area IN ('compras', 'financeiro', 'limpeza', 'manutencao')),
  titulo            TEXT NOT NULL,
  descricao         TEXT,
  entrega_esperada  TEXT,
  responsavel_id    UUID REFERENCES auth.users(id),
  responsavel_nome  TEXT,
  data_prevista     DATE,
  status            TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'nao_aplicavel')),
  checked_by        UUID REFERENCES auth.users(id),
  checked_at        TIMESTAMPTZ,
  observacoes       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABELA 6: Orçamento por evento ─────────────────────────
CREATE TABLE IF NOT EXISTS event_budgets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  orcamento_aprovado  NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes         TEXT,
  aprovado_por        TEXT,
  aprovado_em         DATE,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id)
);

-- ── TABELA 7: Gastos por evento ────────────────────────────
CREATE TABLE IF NOT EXISTS event_expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  descricao       TEXT NOT NULL,
  valor           NUMERIC(12,2) NOT NULL,
  categoria       TEXT NOT NULL CHECK (categoria IN ('compras', 'manutencao', 'limpeza', 'financeiro', 'outro')),
  fornecedor      TEXT,
  data_gasto      DATE DEFAULT CURRENT_DATE,
  status          TEXT NOT NULL DEFAULT 'registrado' CHECK (status IN ('registrado', 'aprovado', 'pendente_aprovacao', 'rejeitado')),
  alerta_enviado  BOOLEAN DEFAULT FALSE,
  registrado_por  UUID REFERENCES auth.users(id),
  aprovado_por    UUID REFERENCES auth.users(id),
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABELA 8: Alertas de orçamento ─────────────────────────
CREATE TABLE IF NOT EXISTS budget_alerts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  expense_id          UUID REFERENCES event_expenses(id),
  orcamento_aprovado  NUMERIC(12,2),
  total_gasto_atual   NUMERIC(12,2),
  valor_excedido      NUMERIC(12,2),
  status              TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'resolvido', 'aprovado_pela_lideranca')),
  notificado_em       TIMESTAMPTZ DEFAULT NOW(),
  resolvido_em        TIMESTAMPTZ,
  resolvido_por       UUID REFERENCES auth.users(id),
  observacoes         TEXT
);

-- ── Triggers ────────────────────────────────────────────────
CREATE TRIGGER event_cycle_phases_updated_at  BEFORE UPDATE ON event_cycle_phases FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER cycle_phase_tasks_updated_at   BEFORE UPDATE ON cycle_phase_tasks   FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER event_adm_track_updated_at     BEFORE UPDATE ON event_adm_track     FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER event_budgets_updated_at       BEFORE UPDATE ON event_budgets       FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_cc_event_cycles_event       ON event_cycles(event_id);
CREATE INDEX idx_cc_phases_event             ON event_cycle_phases(event_id);
CREATE INDEX idx_cc_phases_status            ON event_cycle_phases(status);
CREATE INDEX idx_cc_tasks_phase              ON cycle_phase_tasks(event_phase_id);
CREATE INDEX idx_cc_tasks_event              ON cycle_phase_tasks(event_id);
CREATE INDEX idx_cc_tasks_responsavel        ON cycle_phase_tasks(responsavel_id);
CREATE INDEX idx_cc_tasks_status             ON cycle_phase_tasks(status);
CREATE INDEX idx_cc_adm_event                ON event_adm_track(event_id);
CREATE INDEX idx_cc_adm_area                 ON event_adm_track(area);
CREATE INDEX idx_cc_expenses_event           ON event_expenses(event_id);
CREATE INDEX idx_cc_alerts_event             ON budget_alerts(event_id);
CREATE INDEX idx_cc_alerts_status            ON budget_alerts(status);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE event_cycles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_cycle_phases   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_phase_tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_adm_track      ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_budgets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_expenses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts        ENABLE ROW LEVEL SECURITY;

-- event_cycles
CREATE POLICY "cc_cycles_pmo"       ON event_cycles FOR ALL USING (get_user_role() IN ('pmo', 'diretor'));
CREATE POLICY "cc_cycles_read"      ON event_cycles FOR SELECT USING (get_user_role() IN ('lider_marketing', 'lider_adm'));

-- event_cycle_phases
CREATE POLICY "cc_phases_pmo"       ON event_cycle_phases FOR ALL USING (get_user_role() IN ('pmo', 'diretor'));
CREATE POLICY "cc_phases_mkt_edit"  ON event_cycle_phases FOR ALL USING (get_user_role() = 'lider_marketing' AND area = 'marketing');
CREATE POLICY "cc_phases_adm_read"  ON event_cycle_phases FOR SELECT USING (get_user_role() = 'lider_adm');
CREATE POLICY "cc_phases_member_read" ON event_cycle_phases FOR SELECT USING (get_user_role() IN ('membro_marketing', 'lider_area_adm'));

-- cycle_phase_tasks
CREATE POLICY "cc_tasks_pmo"        ON cycle_phase_tasks FOR ALL USING (get_user_role() IN ('pmo', 'diretor'));
CREATE POLICY "cc_tasks_mkt_edit"   ON cycle_phase_tasks FOR ALL USING (get_user_role() = 'lider_marketing' AND area = 'marketing');
CREATE POLICY "cc_tasks_member_own" ON cycle_phase_tasks FOR SELECT USING (get_user_role() = 'membro_marketing' AND responsavel_id = auth.uid());
CREATE POLICY "cc_tasks_member_upd" ON cycle_phase_tasks FOR UPDATE USING (get_user_role() = 'membro_marketing' AND responsavel_id = auth.uid()) WITH CHECK (responsavel_id = auth.uid());

-- event_adm_track
CREATE POLICY "cc_adm_pmo"         ON event_adm_track FOR ALL USING (get_user_role() IN ('pmo', 'diretor'));
CREATE POLICY "cc_adm_lider"       ON event_adm_track FOR ALL USING (get_user_role() = 'lider_adm');
CREATE POLICY "cc_adm_area_read"   ON event_adm_track FOR SELECT USING (get_user_role() = 'lider_area_adm' AND area = get_user_area());
CREATE POLICY "cc_adm_area_upd"    ON event_adm_track FOR UPDATE USING (get_user_role() = 'lider_area_adm' AND area = get_user_area());

-- event_budgets
CREATE POLICY "cc_budget_pmo"      ON event_budgets FOR ALL USING (get_user_role() IN ('pmo', 'diretor'));
CREATE POLICY "cc_budget_read"     ON event_budgets FOR SELECT USING (get_user_role() = 'lider_adm');

-- event_expenses
CREATE POLICY "cc_expenses_pmo"    ON event_expenses FOR ALL USING (get_user_role() IN ('pmo', 'diretor'));
CREATE POLICY "cc_expenses_insert" ON event_expenses FOR INSERT WITH CHECK (get_user_role() IN ('lider_area_adm', 'lider_adm'));

-- budget_alerts
CREATE POLICY "cc_alerts_read"     ON budget_alerts FOR SELECT USING (get_user_role() IN ('pmo', 'diretor', 'lider_adm'));
CREATE POLICY "cc_alerts_pmo"      ON budget_alerts FOR UPDATE USING (get_user_role() IN ('pmo', 'diretor'));

-- ── Views ───────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_cycle_summary AS
SELECT
  ec.event_id,
  e.name AS event_name,
  e.date AS event_date,
  ec.status AS cycle_status,
  COUNT(DISTINCT ecp.id) AS total_phases,
  COUNT(DISTINCT ecp.id) FILTER (WHERE ecp.status = 'concluida') AS phases_done,
  COUNT(DISTINCT ecp.id) FILTER (WHERE ecp.status IN ('atrasada','em_risco')) AS phases_at_risk,
  COUNT(DISTINCT cpt.id) AS total_tasks,
  COUNT(DISTINCT cpt.id) FILTER (WHERE cpt.status = 'concluida') AS tasks_done,
  COUNT(DISTINCT cpt.id) FILTER (WHERE cpt.status = 'bloqueada') AS tasks_blocked,
  ROUND(
    COUNT(DISTINCT ecp.id) FILTER (WHERE ecp.status = 'concluida')::numeric /
    NULLIF(COUNT(DISTINCT ecp.id), 0) * 100
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

-- ── Seed: 11 fases do Ciclo Criativo CBLab ──────────────────
INSERT INTO cycle_phase_templates
  (numero, nome, descricao, semanas_inicio, semanas_fim, area, momento_chave, responsavel_padrao, entregas_padrao)
VALUES
  (1, 'Pré Briefing',
   'A CBLab se prepara antes de qualquer criação começar. Organizar e entender o tema do projeto, olhando para o calendário da igreja.',
   -13, -13, 'marketing', false, 'CBLab',
   'Envio de e-mail convite para marcar a reunião de briefing'),
  (2, 'Briefing',
   'Encontro para receber a direção do pastor, ministério ou líder sobre o projeto.',
   -12, -12, 'marketing', false, 'Líder Criativo + Pastores + Líderes Ministeriais + CBLab',
   'Definição de temática, objetivos, KPIs, texto-base e necessidades técnicas. Envio do briefing final por e-mail.'),
  (3, 'Brainstorming e Conceito',
   'Momento de reunir ideias. O time da CBLab pensa no conceito visual e na linguagem.',
   -11, -10, 'marketing', false, 'CBLab | Apoio: Adoração + Produção',
   'Referências, rascunhos de roteiros e propostas de abordagem'),
  (4, 'Identidade e Estratégia',
   'Com o conceito definido, criar a identidade da campanha.',
   -9, -8, 'marketing', false, 'CBLab | Apoio: Produção',
   'Logomarca, key visual, paleta de cores, peça conceito, defesa e planilha estratégica'),
  (5, 'Aprovação',
   'O projeto é apresentado para o cliente. Validar a direção criativa e estratégica.',
   -7, -7, 'marketing', true, 'Cliente demandante | Apoio: CBLab',
   'Reunião de aprovação com apresentação do material; envio por e-mail do material aprovado'),
  (6, 'Execução Estratégica',
   'Com o projeto aprovado, começa a produção de tudo que será usado.',
   -6, -5, 'marketing', true, 'CBLab | Apoio: Diretor Criativo',
   'Peças on e off, calendário de redes e materiais audiovisuais'),
  (7, 'Pré-Testes',
   'Antes do grande dia, testar tudo. Verificar vídeos, luzes, som e transmissões.',
   -4, -4, 'ambos', true, 'Produção | Apoio: CBLab + Online',
   'Testes de áudio, vídeo, luz e stream; mapa de ocupação dos espaços e ensaios musicais'),
  (8, 'Finalizações',
   'Aqui tudo é revisado e finalizado, garantindo que o projeto esteja 100% pronto.',
   -3, -3, 'marketing', false, 'CBLab + Produção',
   'Vídeos, peças finais, pacotes ProPresenter, timecodes sincronizados e cenografia contratada'),
  (9, 'Alinhamentos Operacionais Finais',
   'Na reta final, as equipes fazem os últimos ajustes e checam cada detalhe.',
   -2, -1, 'ambos', false, 'Produção + Adoração | Apoio: CBLab + Igreja Online',
   'Revisão de roteiro, checagem técnica, comunicação final e montagem de cenografia'),
  (10, 'Dia D',
   'Chegou o grande momento! Simulação completa e depois o evento ao vivo.',
   0, 0, 'ambos', true, 'Toda área criativa',
   'Simulação com passagem de som, ensaio com vídeos, luz e timecodes; execução do evento/culto'),
  (11, 'Debrief',
   'Depois de tudo, olhar para o que foi feito, celebrar os resultados e aprender.',
   1, 1, 'marketing', true, 'Líder Criativo + Líderes de Áreas Criativas',
   'Relatório de debrief, registro de KPIs e arquivamento de materiais')
ON CONFLICT DO NOTHING;
