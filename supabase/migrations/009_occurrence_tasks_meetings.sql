-- ============================================================
-- 009_occurrence_tasks_meetings.sql
-- Tarefas e reuniões vinculadas a ocorrências individuais
-- Cada ocorrência funciona como um mini-evento independente
-- ============================================================

-- Tarefas de ocorrência
CREATE TABLE IF NOT EXISTS occurrence_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id   UUID NOT NULL REFERENCES event_occurrences(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  responsible     TEXT,
  area            TEXT,
  deadline        DATE,
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em-andamento', 'concluida')),
  priority        TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
  description     TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reuniões de ocorrência
CREATE TABLE IF NOT EXISTS occurrence_meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id   UUID NOT NULL REFERENCES event_occurrences(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title           TEXT DEFAULT 'Reunião',
  date            DATE NOT NULL,
  participants    TEXT[],
  decisions       TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pendências de reuniões de ocorrência
CREATE TABLE IF NOT EXISTS occurrence_meeting_pendencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id      UUID NOT NULL REFERENCES occurrence_meetings(id) ON DELETE CASCADE,
  occurrence_id   UUID NOT NULL REFERENCES event_occurrences(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  responsible     TEXT,
  deadline        DATE,
  done            BOOLEAN DEFAULT FALSE,
  done_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Triggers
CREATE TRIGGER occurrence_tasks_updated_at    BEFORE UPDATE ON occurrence_tasks    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER occurrence_meetings_updated_at BEFORE UPDATE ON occurrence_meetings FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- RLS
ALTER TABLE occurrence_tasks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE occurrence_meetings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE occurrence_meeting_pendencies  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "occ_tasks_read"      ON occurrence_tasks              FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "occ_tasks_write"     ON occurrence_tasks              FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "occ_meetings_read"   ON occurrence_meetings           FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "occ_meetings_write"  ON occurrence_meetings           FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "occ_pend_read"       ON occurrence_meeting_pendencies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "occ_pend_write"      ON occurrence_meeting_pendencies FOR ALL USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX idx_occ_tasks_occurrence    ON occurrence_tasks(occurrence_id);
CREATE INDEX idx_occ_tasks_event         ON occurrence_tasks(event_id);
CREATE INDEX idx_occ_tasks_status        ON occurrence_tasks(status);
CREATE INDEX idx_occ_meetings_occurrence ON occurrence_meetings(occurrence_id);
CREATE INDEX idx_occ_meetings_event      ON occurrence_meetings(event_id);
CREATE INDEX idx_occ_pend_meeting        ON occurrence_meeting_pendencies(meeting_id);
