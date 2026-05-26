-- ============================================================
-- 041_agent_queue_executor.sql
-- Expande agent_queue para suportar agentes executores:
--  - action_type: identificador da ação (ex: 'fin.categorize_transaction')
--  - action_label: descrição humana mostrada na fila de aprovação
--  - apply_error / applied_at: tracking de aplicação efetiva
--  - status enum incluindo 'applied' e 'failed'
--  - reasoning: justificativa do agente
--
-- Idempotente. Aplicar manualmente no Supabase SQL Editor.
-- ============================================================

ALTER TABLE agent_queue
  ADD COLUMN IF NOT EXISTS action_type  TEXT,
  ADD COLUMN IF NOT EXISTS action_label TEXT,
  ADD COLUMN IF NOT EXISTS reasoning    TEXT,
  ADD COLUMN IF NOT EXISTS apply_error  TEXT,
  ADD COLUMN IF NOT EXISTS applied_at   TIMESTAMPTZ;

-- Atualiza constraint de status (drop + recreate)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agent_queue_status_check'
  ) THEN
    ALTER TABLE agent_queue DROP CONSTRAINT agent_queue_status_check;
  END IF;
END $$;

ALTER TABLE agent_queue
  ADD CONSTRAINT agent_queue_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'failed'));

-- Índices úteis pra fila
CREATE INDEX IF NOT EXISTS idx_agent_queue_status      ON agent_queue(status);
CREATE INDEX IF NOT EXISTS idx_agent_queue_action_type ON agent_queue(action_type);
CREATE INDEX IF NOT EXISTS idx_agent_queue_created     ON agent_queue(created_at DESC);
