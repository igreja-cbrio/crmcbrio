-- ============================================================
-- 016_cycle_task_subtasks.sql
-- Subtarefas para tarefas do ciclo criativo
-- ============================================================

CREATE TABLE IF NOT EXISTS cycle_task_subtasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES cycle_phase_tasks(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  done        BOOLEAN DEFAULT FALSE,
  offset_start INTEGER,
  offset_end   INTEGER,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cycle_task_subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cycle_sub_all" ON cycle_task_subtasks FOR ALL USING (auth.role() = 'authenticated');
CREATE INDEX idx_cycle_sub_task ON cycle_task_subtasks(task_id);

-- Adicionar campo cozinha à trilha ADM (nova área)
ALTER TABLE event_adm_track DROP CONSTRAINT IF EXISTS event_adm_track_area_check;
ALTER TABLE event_adm_track ADD CONSTRAINT event_adm_track_area_check
  CHECK (area IN ('compras', 'financeiro', 'limpeza', 'manutencao', 'cozinha'));
