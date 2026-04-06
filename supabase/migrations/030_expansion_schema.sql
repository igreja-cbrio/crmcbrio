-- ============================================================
-- Migration 030: Expansion Module Schema
-- Strategic Expansion Plan 2026-2029 (93 milestones)
-- Tables: expansion_milestones, expansion_tasks, expansion_subtasks
-- View: v_expansion_dashboard
-- ============================================================

-- ── Table: expansion_milestones ──
CREATE TABLE IF NOT EXISTS expansion_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  year INTEGER NOT NULL,
  strategic_axis TEXT NOT NULL, -- 'Unidade / Consolidação', 'Avaliação e Planejamento', 'Expansão Qualificada', 'Maturidade e Consolidação'
  strategic_objective TEXT,
  area TEXT,
  responsible TEXT,
  date_start DATE,
  date_end DATE,
  expected_delivery TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em-andamento','concluido','bloqueado')),
  phase TEXT DEFAULT 'planejamento' CHECK (phase IN ('planejamento','preparacao','execucao','entrega','avaliacao')),
  budget_planned NUMERIC(12,2) DEFAULT 0,
  budget_spent NUMERIC(12,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  swot_strengths TEXT,
  swot_weaknesses TEXT,
  swot_opportunities TEXT,
  swot_threats TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exp_ms_year ON expansion_milestones(year);
CREATE INDEX IF NOT EXISTS idx_exp_ms_status ON expansion_milestones(status);
CREATE INDEX IF NOT EXISTS idx_exp_ms_area ON expansion_milestones(area);

-- ── Table: expansion_tasks ──
CREATE TABLE IF NOT EXISTS expansion_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES expansion_milestones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  responsible TEXT,
  area TEXT,
  start_date DATE,
  deadline DATE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em-andamento','concluida','bloqueada')),
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exp_task_milestone ON expansion_tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_exp_task_status ON expansion_tasks(status);

-- ── Table: expansion_subtasks ──
CREATE TABLE IF NOT EXISTS expansion_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES expansion_tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pct INTEGER DEFAULT 0 CHECK (pct BETWEEN 0 AND 100),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exp_sub_task ON expansion_subtasks(task_id);

-- ── View: v_expansion_dashboard ──
CREATE OR REPLACE VIEW v_expansion_dashboard AS
SELECT
  (SELECT COUNT(*) FROM expansion_milestones) AS total_milestones,
  (SELECT COUNT(*) FROM expansion_milestones WHERE status = 'pendente') AS pendentes,
  (SELECT COUNT(*) FROM expansion_milestones WHERE status = 'em-andamento') AS em_andamento,
  (SELECT COUNT(*) FROM expansion_milestones WHERE status = 'concluido') AS concluidos,
  (SELECT COUNT(*) FROM expansion_milestones WHERE status = 'bloqueado') AS bloqueados,
  -- By year
  (SELECT COUNT(*) FROM expansion_milestones WHERE year = 2026) AS total_2026,
  (SELECT COUNT(*) FROM expansion_milestones WHERE year = 2026 AND status = 'concluido') AS done_2026,
  (SELECT COUNT(*) FROM expansion_milestones WHERE year = 2027) AS total_2027,
  (SELECT COUNT(*) FROM expansion_milestones WHERE year = 2027 AND status = 'concluido') AS done_2027,
  (SELECT COUNT(*) FROM expansion_milestones WHERE year = 2028) AS total_2028,
  (SELECT COUNT(*) FROM expansion_milestones WHERE year = 2028 AND status = 'concluido') AS done_2028,
  (SELECT COUNT(*) FROM expansion_milestones WHERE year = 2029) AS total_2029,
  (SELECT COUNT(*) FROM expansion_milestones WHERE year = 2029 AND status = 'concluido') AS done_2029,
  -- Tasks
  (SELECT COUNT(*) FROM expansion_tasks WHERE status NOT IN ('concluida')) AS tasks_open,
  (SELECT COUNT(*) FROM expansion_tasks WHERE deadline < CURRENT_DATE AND status NOT IN ('concluida')) AS tasks_overdue,
  -- Budget
  (SELECT COALESCE(SUM(budget_planned), 0) FROM expansion_milestones) AS budget_total,
  (SELECT COALESCE(SUM(budget_spent), 0) FROM expansion_milestones) AS budget_spent,
  -- Overdue milestones
  (SELECT COUNT(*) FROM expansion_milestones WHERE date_end < CURRENT_DATE AND status NOT IN ('concluido')) AS milestones_overdue;

-- ── RLS ──
ALTER TABLE expansion_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE expansion_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE expansion_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exp_ms_all" ON expansion_milestones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "exp_tasks_all" ON expansion_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "exp_subs_all" ON expansion_subtasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Triggers ──
CREATE TRIGGER set_updated_at_exp_milestones BEFORE UPDATE ON expansion_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_exp_tasks BEFORE UPDATE ON expansion_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
