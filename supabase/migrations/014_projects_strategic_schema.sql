-- ============================================================
-- 014_projects_strategic_schema.sql
-- Módulo Projetos + Planejamento Estratégico
-- Estrutura espelhada de events (custos, prazos, categorias,
-- responsável, marcos, tarefas, subtarefas)
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- PROJETOS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS project_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  color       TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order  INTEGER DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO project_categories (name, color, sort_order) VALUES
  ('Infraestrutura', '#3b82f6', 1),
  ('Ministerial',    '#10b981', 2),
  ('Administrativo', '#f59e0b', 3),
  ('Tecnologia',     '#8b5cf6', 4),
  ('Social',         '#ec4899', 5)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  year                INTEGER,
  date_start          DATE,
  date_end            DATE,
  category_id         UUID REFERENCES project_categories(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'no-prazo' CHECK (status IN ('no-prazo', 'em-risco', 'atrasado', 'concluido')),
  description         TEXT,
  location            TEXT,
  responsible         TEXT,
  area                TEXT,
  budget_planned      NUMERIC(12,2) DEFAULT 0,
  budget_spent        NUMERIC(12,2) DEFAULT 0,
  notes               TEXT,
  lessons_learned     TEXT,
  priority            TEXT DEFAULT 'media' CHECK (priority IN ('urgente', 'alta', 'media', 'baixa')),
  created_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_milestones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  date_start      DATE,
  date_end        DATE,
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em-andamento', 'concluida', 'bloqueada')),
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id    UUID REFERENCES project_milestones(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  responsible     TEXT,
  area            TEXT,
  start_date      DATE,
  deadline        DATE,
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em-andamento', 'concluida', 'bloqueada')),
  priority        TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('urgente', 'alta', 'media', 'baixa')),
  is_milestone    BOOLEAN DEFAULT FALSE,
  description     TEXT,
  sort_order      INTEGER DEFAULT 0,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_task_subtasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  done        BOOLEAN DEFAULT FALSE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_task_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'PMO',
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_task_dependencies (
  task_id       UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, depends_on_id),
  CHECK (task_id != depends_on_id)
);

-- ═══════════════════════════════════════════════════════════
-- PLANEJAMENTO ESTRATÉGICO
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS strategic_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  color       TEXT NOT NULL DEFAULT '#f59e0b',
  sort_order  INTEGER DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO strategic_categories (name, color, sort_order) VALUES
  ('Crescimento',    '#10b981', 1),
  ('Expansão Física','#3b82f6', 2),
  ('Capacitação',    '#8b5cf6', 3),
  ('Financeiro',     '#f59e0b', 4),
  ('Missões',        '#ec4899', 5)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS strategic_plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  date_start          DATE,
  date_end            DATE,
  category_id         UUID REFERENCES strategic_categories(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'no-prazo' CHECK (status IN ('no-prazo', 'em-risco', 'atrasado', 'concluido')),
  description         TEXT,
  responsible         TEXT,
  area                TEXT,
  budget_planned      NUMERIC(12,2) DEFAULT 0,
  budget_spent        NUMERIC(12,2) DEFAULT 0,
  notes               TEXT,
  lessons_learned     TEXT,
  priority            TEXT DEFAULT 'media' CHECK (priority IN ('urgente', 'alta', 'media', 'baixa')),
  created_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS strategic_milestones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         UUID NOT NULL REFERENCES strategic_plans(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  date_start      DATE,
  date_end        DATE,
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em-andamento', 'concluida', 'bloqueada')),
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS strategic_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         UUID NOT NULL REFERENCES strategic_plans(id) ON DELETE CASCADE,
  milestone_id    UUID REFERENCES strategic_milestones(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  responsible     TEXT,
  area            TEXT,
  start_date      DATE,
  deadline        DATE,
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em-andamento', 'concluida', 'bloqueada')),
  priority        TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('urgente', 'alta', 'media', 'baixa')),
  is_milestone    BOOLEAN DEFAULT FALSE,
  description     TEXT,
  sort_order      INTEGER DEFAULT 0,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS strategic_task_subtasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES strategic_tasks(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  done        BOOLEAN DEFAULT FALSE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS strategic_task_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES strategic_tasks(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'PMO',
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS strategic_task_dependencies (
  task_id       UUID NOT NULL REFERENCES strategic_tasks(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES strategic_tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, depends_on_id),
  CHECK (task_id != depends_on_id)
);

-- ═══════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════
CREATE TRIGGER projects_updated_at              BEFORE UPDATE ON projects              FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER project_milestones_updated_at    BEFORE UPDATE ON project_milestones    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER project_tasks_updated_at         BEFORE UPDATE ON project_tasks         FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER strategic_plans_updated_at       BEFORE UPDATE ON strategic_plans       FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER strategic_milestones_updated_at  BEFORE UPDATE ON strategic_milestones  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER strategic_tasks_updated_at       BEFORE UPDATE ON strategic_tasks       FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ═══════════════════════════════════════════════════════════
-- RLS (tudo aberto para autenticados por enquanto)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE project_categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_task_subtasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_task_comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_task_dependencies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_plans            ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_milestones       ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_task_subtasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_task_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proj_cat_all"  ON project_categories        FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "proj_all"      ON projects                  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "proj_ms_all"   ON project_milestones        FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "proj_task_all" ON project_tasks             FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "proj_sub_all"  ON project_task_subtasks     FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "proj_com_all"  ON project_task_comments     FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "proj_dep_all"  ON project_task_dependencies FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "str_cat_all"   ON strategic_categories      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "str_all"       ON strategic_plans           FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "str_ms_all"    ON strategic_milestones      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "str_task_all"  ON strategic_tasks           FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "str_sub_all"   ON strategic_task_subtasks   FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "str_com_all"   ON strategic_task_comments   FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "str_dep_all"   ON strategic_task_dependencies FOR ALL USING (auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════
CREATE INDEX idx_proj_status           ON projects(status);
CREATE INDEX idx_proj_category         ON projects(category_id);
CREATE INDEX idx_proj_ms_project       ON project_milestones(project_id);
CREATE INDEX idx_proj_task_project     ON project_tasks(project_id);
CREATE INDEX idx_proj_task_milestone   ON project_tasks(milestone_id);
CREATE INDEX idx_proj_task_status      ON project_tasks(status);
CREATE INDEX idx_proj_task_deadline    ON project_tasks(deadline);
CREATE INDEX idx_proj_sub_task         ON project_task_subtasks(task_id);
CREATE INDEX idx_proj_com_task         ON project_task_comments(task_id);

CREATE INDEX idx_str_status            ON strategic_plans(status);
CREATE INDEX idx_str_category          ON strategic_plans(category_id);
CREATE INDEX idx_str_ms_plan           ON strategic_milestones(plan_id);
CREATE INDEX idx_str_task_plan         ON strategic_tasks(plan_id);
CREATE INDEX idx_str_task_milestone    ON strategic_tasks(milestone_id);
CREATE INDEX idx_str_task_status       ON strategic_tasks(status);
CREATE INDEX idx_str_task_deadline     ON strategic_tasks(deadline);
CREATE INDEX idx_str_sub_task          ON strategic_task_subtasks(task_id);
CREATE INDEX idx_str_com_task          ON strategic_task_comments(task_id);
