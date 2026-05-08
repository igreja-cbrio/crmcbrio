-- Migration 037: alinhar enum de status em cycle_phase_tasks com event_tasks
--
-- Antes: event_tasks usava 'pendente'/'em-andamento'/'concluida'/'bloqueada' (canônico do PMO,
-- também usado por project_tasks, strategic_tasks). cycle_phase_tasks era a exceção, usando
-- 'a_fazer'/'em_andamento' — forçando mapeamento ternary em cycles.js (kanbanAll), tasks.js
-- e em vw_workload (CASE WHEN). Esta migration alinha tudo em uma vocabulário só.
--
-- Phase-level status (event_cycle_phases) NÃO muda — phases têm valores próprios
-- ('pendente', 'em_andamento', 'concluida', 'atrasada', 'em_risco') que não têm correspondência
-- direta com task status.

-- 1) Drop old check constraint
ALTER TABLE cycle_phase_tasks DROP CONSTRAINT IF EXISTS cycle_phase_tasks_status_check;

-- 2) Migrar valores existentes
UPDATE cycle_phase_tasks SET status = 'pendente'      WHERE status = 'a_fazer';
UPDATE cycle_phase_tasks SET status = 'em-andamento'  WHERE status = 'em_andamento';

-- 3) Nova check constraint (igual a event_tasks)
ALTER TABLE cycle_phase_tasks ADD CONSTRAINT cycle_phase_tasks_status_check
  CHECK (status IN ('pendente', 'em-andamento', 'bloqueada', 'concluida'));

-- 4) Default
ALTER TABLE cycle_phase_tasks ALTER COLUMN status SET DEFAULT 'pendente';

-- 5) Recriar vw_workload — o CASE WHEN para converter cycle vocab não é mais necessário
DROP VIEW IF EXISTS vw_workload;
CREATE OR REPLACE VIEW vw_workload AS
SELECT
  COALESCE(responsible, 'Sem responsável') AS responsible,
  COUNT(*) AS total_tasks,
  COUNT(*) FILTER (WHERE status = 'pendente')      AS pendentes,
  COUNT(*) FILTER (WHERE status = 'em-andamento')  AS em_andamento,
  COUNT(*) FILTER (WHERE status = 'bloqueada')     AS bloqueadas,
  COUNT(*) FILTER (WHERE status = 'concluida')     AS concluidas,
  COUNT(*) FILTER (WHERE deadline IS NOT NULL AND deadline < CURRENT_DATE AND status NOT IN ('concluida')) AS atrasadas
FROM (
  SELECT responsible, status, deadline FROM event_tasks
  UNION ALL
  SELECT responsavel_nome AS responsible, status, prazo AS deadline FROM cycle_phase_tasks
  UNION ALL
  SELECT responsible, status, deadline FROM project_tasks
  UNION ALL
  SELECT responsible, status, deadline FROM strategic_tasks
) all_tasks
GROUP BY COALESCE(responsible, 'Sem responsável')
ORDER BY atrasadas DESC, total_tasks DESC;
