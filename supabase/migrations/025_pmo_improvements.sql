-- ============================================================
-- 015_pmo_improvements.sql
-- Registro de riscos, audit trail, retrospectivas, aprovação de fase
-- ============================================================

-- ── Registro de Riscos ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_risks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  category          TEXT NOT NULL DEFAULT 'timeline' CHECK (category IN ('timeline', 'budget', 'resources', 'quality', 'stakeholder', 'other')),
  probability       INTEGER NOT NULL DEFAULT 3 CHECK (probability BETWEEN 1 AND 5),
  impact            INTEGER NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  score             INTEGER GENERATED ALWAYS AS (probability * impact) STORED,
  mitigation        TEXT,
  owner_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  owner_name        TEXT,
  target_date       DATE,
  status            TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'mitigando', 'mitigado', 'fechado', 'aceito')),
  closure_notes     TEXT,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER event_risks_updated_at BEFORE UPDATE ON event_risks FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
ALTER TABLE event_risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risks_all" ON event_risks FOR ALL USING (auth.role() = 'authenticated');
CREATE INDEX idx_risks_event ON event_risks(event_id);
CREATE INDEX idx_risks_status ON event_risks(status);
CREATE INDEX idx_risks_score ON event_risks(score DESC);

-- ── Audit Trail ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name      TEXT NOT NULL,
  record_id       UUID NOT NULL,
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  action          TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'status_change')),
  field_name      TEXT,
  old_value       TEXT,
  new_value       TEXT,
  description     TEXT,
  changed_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_by_name TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_read" ON audit_log FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "audit_write" ON audit_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE INDEX idx_audit_event ON audit_log(event_id);
CREATE INDEX idx_audit_record ON audit_log(record_id);
CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ── Retrospectiva pós-evento ────────────────────────────────
CREATE TABLE IF NOT EXISTS event_retrospectives (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  what_went_well    TEXT,
  what_to_improve   TEXT,
  action_items      TEXT,
  attendee_feedback TEXT,
  overall_rating    INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id)
);

CREATE TRIGGER retro_updated_at BEFORE UPDATE ON event_retrospectives FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
ALTER TABLE event_retrospectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "retro_all" ON event_retrospectives FOR ALL USING (auth.role() = 'authenticated');
CREATE INDEX idx_retro_event ON event_retrospectives(event_id);

-- ── Aprovação de fase (adicionar campos) ────────────────────
ALTER TABLE event_cycle_phases ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE event_cycle_phases ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE event_cycle_phases ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT FALSE;

-- ── View: carga de trabalho por responsável ─────────────────
CREATE OR REPLACE VIEW vw_workload AS
SELECT
  COALESCE(responsible, 'Sem responsável') AS responsible,
  COUNT(*) AS total_tasks,
  COUNT(*) FILTER (WHERE status = 'pendente') AS pendentes,
  COUNT(*) FILTER (WHERE status = 'em-andamento') AS em_andamento,
  COUNT(*) FILTER (WHERE status = 'bloqueada') AS bloqueadas,
  COUNT(*) FILTER (WHERE status = 'concluida') AS concluidas,
  COUNT(*) FILTER (WHERE deadline IS NOT NULL AND deadline < CURRENT_DATE AND status NOT IN ('concluida')) AS atrasadas
FROM (
  SELECT responsible, status, deadline FROM event_tasks
  UNION ALL
  SELECT responsavel_nome AS responsible,
    CASE WHEN status = 'a_fazer' THEN 'pendente' WHEN status = 'em_andamento' THEN 'em-andamento' ELSE status END,
    prazo AS deadline FROM cycle_phase_tasks
  UNION ALL
  SELECT responsible, status, deadline FROM project_tasks
  UNION ALL
  SELECT responsible, status, deadline FROM strategic_tasks
) all_tasks
GROUP BY COALESCE(responsible, 'Sem responsável')
ORDER BY atrasadas DESC, total_tasks DESC;

-- ── View: KPIs PMO ──────────────────────────────────────────
CREATE OR REPLACE VIEW vw_pmo_kpis AS
SELECT
  (SELECT COUNT(*) FROM events) AS total_events,
  (SELECT COUNT(*) FROM events WHERE status = 'no-prazo') AS events_on_track,
  (SELECT COUNT(*) FROM events WHERE status = 'em-risco') AS events_at_risk,
  (SELECT COUNT(*) FROM events WHERE status = 'atrasado') AS events_overdue,
  (SELECT COUNT(*) FROM events WHERE status = 'concluido') AS events_done,
  (SELECT COUNT(*) FROM events WHERE responsible IS NULL OR responsible = '') AS events_no_owner,
  (SELECT COUNT(*) FROM events WHERE date >= CURRENT_DATE AND date <= CURRENT_DATE + INTERVAL '7 days' AND status != 'concluido') AS events_next_7d,
  (SELECT COUNT(*) FROM event_tasks WHERE status != 'concluida') AS tasks_open,
  (SELECT COUNT(*) FROM event_tasks WHERE status = 'concluida') AS tasks_done,
  (SELECT COUNT(*) FROM event_tasks WHERE deadline < CURRENT_DATE AND status NOT IN ('concluida')) AS tasks_overdue,
  (SELECT COALESCE(SUM(orcamento_aprovado), 0) FROM event_budgets) AS budget_total,
  (SELECT COALESCE(SUM(valor), 0) FROM event_expenses WHERE status IN ('registrado', 'aprovado')) AS budget_spent,
  (SELECT COUNT(*) FROM event_risks WHERE status IN ('aberto', 'mitigando')) AS risks_open,
  (SELECT COUNT(*) FROM event_risks WHERE score >= 15) AS risks_critical;
