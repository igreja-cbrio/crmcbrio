-- ============================================================
-- 027_pmo_views.sql
-- Dashboard views: vw_pmo_kpis (aggregated KPIs) and
-- vw_workload (tasks per responsible)
-- ============================================================

-- Dropar views antigas (podem ter colunas diferentes)
DROP VIEW IF EXISTS vw_pmo_kpis CASCADE;
DROP VIEW IF EXISTS vw_workload CASCADE;

-- ── View: KPIs PMO (single-row aggregate) ───────────────────
CREATE OR REPLACE VIEW vw_pmo_kpis AS
SELECT
  -- Event counts
  (SELECT COUNT(*) FROM events)
    AS total_events,

  (SELECT COUNT(*) FROM events WHERE status = 'no-prazo')
    AS events_on_track,

  (SELECT COUNT(*) FROM events WHERE status IN ('atencao', 'em-risco'))
    AS events_at_risk,

  (SELECT COUNT(*) FROM events WHERE status = 'atrasado')
    AS events_overdue,

  (SELECT COUNT(*) FROM events
   WHERE date >= CURRENT_DATE
     AND date <= CURRENT_DATE + INTERVAL '7 days')
    AS events_next_7d,

  -- Open tasks (event_tasks + cycle_phase_tasks not done)
  (
    (SELECT COUNT(*) FROM event_tasks
     WHERE status NOT IN ('concluida', 'concluido'))
    +
    (SELECT COUNT(*) FROM cycle_phase_tasks
     WHERE status NOT IN ('concluida', 'concluido'))
  ) AS tasks_open,

  -- Overdue tasks (past deadline and not done)
  (
    (SELECT COUNT(*) FROM event_tasks
     WHERE deadline < CURRENT_DATE
       AND status NOT IN ('concluida', 'concluido'))
    +
    (SELECT COUNT(*) FROM cycle_phase_tasks
     WHERE prazo < CURRENT_DATE
       AND status NOT IN ('concluida', 'concluido'))
  ) AS tasks_overdue,

  -- Open risks (not mitigated and not closed)
  (SELECT COUNT(*) FROM event_risks
   WHERE status NOT IN ('mitigado', 'fechado'))
    AS risks_open,

  -- Events with no owner
  (SELECT COUNT(*) FROM events
   WHERE responsible IS NULL OR responsible = '')
    AS events_no_owner,

  -- Budget totals
  (SELECT COALESCE(SUM(budget_planned), 0) FROM events)
    AS budget_total,

  (SELECT COALESCE(SUM(budget_spent), 0) FROM events)
    AS budget_spent;


-- ── View: Workload per responsible (open tasks only) ────────
CREATE OR REPLACE VIEW vw_workload AS
SELECT
  COALESCE(responsible, 'Sem responsável') AS responsible,
  COUNT(*)                                 AS total_tasks,
  COUNT(*) FILTER (
    WHERE deadline IS NOT NULL
      AND deadline < CURRENT_DATE
  ) AS atrasadas
FROM (
  -- event_tasks (open only)
  SELECT responsible, deadline
  FROM event_tasks
  WHERE status NOT IN ('concluida', 'concluido')

  UNION ALL

  -- cycle_phase_tasks (open only)
  SELECT responsavel_nome AS responsible,
         prazo            AS deadline
  FROM cycle_phase_tasks
  WHERE status NOT IN ('concluida', 'concluido')
) open_tasks
GROUP BY COALESCE(responsible, 'Sem responsável')
ORDER BY atrasadas DESC, total_tasks DESC;
