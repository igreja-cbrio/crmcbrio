-- Migration 038: HOTFIX vw_workload
-- A migration 037 redefiniu vw_workload usando a versão antiga da 025
-- (que NÃO filtrava por status) e sobrescreveu a versão correta da 027
-- (que filtrava status NOT IN concluida). Resultado: contagem incluía tarefas
-- concluídas, fazendo "Sem responsável" mostrar 2480 tarefas com concluídas misturadas.
-- Esta migration restaura a definição da 027 (open tasks only).

DROP VIEW IF EXISTS vw_workload;
CREATE OR REPLACE VIEW vw_workload AS
SELECT
  COALESCE(responsible, 'Sem responsável') AS responsible,
  COUNT(*)                                 AS total_tasks,
  COUNT(*) FILTER (
    WHERE deadline IS NOT NULL
      AND deadline < CURRENT_DATE
  ) AS atrasadas
FROM (
  SELECT responsible, deadline
    FROM event_tasks
   WHERE status NOT IN ('concluida', 'concluido')

  UNION ALL

  SELECT responsavel_nome AS responsible,
         prazo            AS deadline
    FROM cycle_phase_tasks
   WHERE status NOT IN ('concluida', 'concluido')
) open_tasks
GROUP BY COALESCE(responsible, 'Sem responsável')
ORDER BY atrasadas DESC, total_tasks DESC;
