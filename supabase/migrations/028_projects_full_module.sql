-- =============================================================
-- Migration 028: Projects Full Module
-- Expands the projects module with new columns on the projects
-- table and creates supporting tables for phases, risks, KPIs,
-- budget items, and retrospectives.
-- Depends on: 024_projects_strategic_schema.sql (projects,
--   project_categories, update_updated_at function)
-- =============================================================

-- -----------------------------------------------
-- 1. ALTER TABLE projects — add new columns
-- -----------------------------------------------
ALTER TABLE projects ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS public_target TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS complexity TEXT CHECK (complexity IN ('alto','medio','baixo'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS impact TEXT CHECK (impact IN ('alto','medio','baixo'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ourico_test TEXT CHECK (ourico_test IN ('sim','nao','na')) DEFAULT 'na';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS generates_unity BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS collaborates_expansion BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS leader TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_revenue NUMERIC(12,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_church_cost NUMERIC(12,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS swot_strengths TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS swot_weaknesses TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS swot_opportunities TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS swot_threats TEXT;

-- -----------------------------------------------
-- 2. CREATE TABLE project_phases
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phase_order INTEGER NOT NULL CHECK (phase_order BETWEEN 1 AND 4),
  date_start DATE,
  date_end DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em-andamento','concluida','bloqueada')),
  responsible TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proj_phase_project ON project_phases(project_id);

-- -----------------------------------------------
-- 3. CREATE TABLE project_risks
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS project_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  probability INTEGER NOT NULL DEFAULT 3 CHECK (probability BETWEEN 1 AND 5),
  impact INTEGER NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  score INTEGER GENERATED ALWAYS AS (probability * impact) STORED,
  mitigation TEXT,
  owner_name TEXT,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','mitigando','mitigado','fechado','aceito')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proj_risk_project ON project_risks(project_id);

-- -----------------------------------------------
-- 4. CREATE TABLE project_kpis
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS project_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_value NUMERIC DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  unit TEXT DEFAULT '%',
  instrument TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proj_kpi_project ON project_kpis(project_id);

-- -----------------------------------------------
-- 5. CREATE TABLE project_budget_items
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS project_budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('investimento','receita','custo')) DEFAULT 'custo',
  planned_amount NUMERIC(12,2) DEFAULT 0,
  actual_amount NUMERIC(12,2) DEFAULT 0,
  date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proj_budget_project ON project_budget_items(project_id);

-- -----------------------------------------------
-- 6. CREATE TABLE project_retrospectives
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS project_retrospectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  what_went_well TEXT,
  what_to_improve TEXT,
  action_items TEXT,
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------
-- 7. Insert new project categories
-- -----------------------------------------------
INSERT INTO project_categories (name, color, sort_order) VALUES
  ('CBA', '#6366f1', 6),
  ('Generosidade', '#14b8a6', 7),
  ('Integração', '#f97316', 8),
  ('Cuidados', '#ec4899', 9),
  ('Online', '#8b5cf6', 10),
  ('Grupos', '#06b6d4', 11),
  ('Louvor', '#a855f7', 12),
  ('Kids', '#f43f5e', 13),
  ('Expansão', '#22c55e', 14),
  ('RH', '#64748b', 15),
  ('Marketing', '#eab308', 16)
ON CONFLICT (name) DO NOTHING;

-- -----------------------------------------------
-- 8. Enable RLS with permissive policies
-- -----------------------------------------------
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_retrospectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proj_phases_all" ON project_phases FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "proj_risks_all" ON project_risks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "proj_kpis_all" ON project_kpis FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "proj_budget_all" ON project_budget_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "proj_retro_all" ON project_retrospectives FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- -----------------------------------------------
-- 9. updated_at triggers (uses existing function)
-- -----------------------------------------------
CREATE TRIGGER set_updated_at_project_phases BEFORE UPDATE ON project_phases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_project_risks BEFORE UPDATE ON project_risks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_project_kpis BEFORE UPDATE ON project_kpis FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_project_retrospectives BEFORE UPDATE ON project_retrospectives FOR EACH ROW EXECUTE FUNCTION update_updated_at();
