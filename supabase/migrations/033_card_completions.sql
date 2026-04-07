-- ============================================================
-- Migration 033: Card Completions — registro formal de conclusão
-- Registra o ato de concluir um card com observação e arquivo
-- ============================================================

CREATE TABLE IF NOT EXISTS card_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Vínculos
  task_id UUID NOT NULL REFERENCES cycle_phase_tasks(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_phase_id UUID REFERENCES event_cycle_phases(id),
  -- Contexto (snapshot no momento da conclusão)
  phase_number INTEGER NOT NULL,
  area VARCHAR(30) NOT NULL,
  card_titulo VARCHAR(300),
  card_subtarefas JSONB,
  -- Observação livre
  observacao TEXT,
  -- Arquivo entregue
  file_name VARCHAR(300),
  file_url TEXT,
  file_sharepoint_path TEXT,
  file_supabase_path TEXT,
  file_sharepoint_item_id TEXT,
  file_mime_type VARCHAR(100),
  -- Meta
  completed_by UUID REFERENCES profiles(id),
  completed_by_name TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  -- Reaberto (caso PMO reabra o card)
  reopened_by UUID REFERENCES profiles(id),
  reopened_at TIMESTAMPTZ,
  reopen_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_completions_task ON card_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_completions_event ON card_completions(event_id);
CREATE INDEX IF NOT EXISTS idx_completions_phase ON card_completions(phase_number);
CREATE INDEX IF NOT EXISTS idx_completions_area ON card_completions(area);

-- RLS (padrão do sistema: backend controla acesso via middleware)
ALTER TABLE card_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "completions_all" ON card_completions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- VIEW: progresso por fase e área (para dashboard e agente)
-- ============================================================
CREATE OR REPLACE VIEW vw_phase_progress AS
SELECT
  cpt.event_id,
  e.name AS event_name,
  e.date AS event_date,
  ecp.numero_fase AS phase_number,
  ecp.nome_fase,
  ecp.status AS phase_status,
  cpt.area,
  COUNT(cpt.id) AS total_cards,
  COUNT(cc.id) FILTER (WHERE cc.reopened_at IS NULL) AS cards_concluidos,
  COUNT(cpt.id) FILTER (WHERE cpt.status = 'bloqueada') AS cards_bloqueados,
  ROUND(
    COUNT(cc.id) FILTER (WHERE cc.reopened_at IS NULL)::numeric
    / NULLIF(COUNT(cpt.id), 0) * 100
  , 0) AS pct_concluido,
  COUNT(cc.id) FILTER (WHERE cc.file_url IS NOT NULL AND cc.reopened_at IS NULL) AS cards_com_arquivo,
  MAX(cc.completed_at) AS ultima_conclusao
FROM cycle_phase_tasks cpt
JOIN events e ON e.id = cpt.event_id
JOIN event_cycle_phases ecp ON ecp.id = cpt.event_phase_id
LEFT JOIN card_completions cc ON cc.task_id = cpt.id
GROUP BY
  cpt.event_id, e.name, e.date,
  ecp.numero_fase, ecp.nome_fase, ecp.status,
  cpt.area
ORDER BY ecp.numero_fase, cpt.area;
