-- ============================================================
-- 006_eventos_schema.sql
-- Módulo Eventos: categorias, eventos, ocorrências, tarefas,
--                 subtarefas, comentários, links, dependências,
--                 reuniões, pendências
-- ============================================================

-- Categorias de evento
CREATE TABLE IF NOT EXISTS event_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  color       TEXT NOT NULL DEFAULT '#00839D',
  sort_order  INTEGER DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: categorias padrão da CBRio
INSERT INTO event_categories (name, color, sort_order) VALUES
  ('Evento Especial',    '#2E7D32', 1),
  ('Rotina de Liturgia', '#1565C0', 2),
  ('Rotina Staff',       '#4FC3F7', 3),
  ('Feriado',            '#F9A825', 4),
  ('Geracional',         '#E91E63', 5),
  ('Grupos',             '#00839D', 6)
ON CONFLICT (name) DO NOTHING;

-- Eventos da igreja
CREATE TABLE IF NOT EXISTS events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  date                DATE NOT NULL,
  category_id         UUID REFERENCES event_categories(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'no-prazo' CHECK (status IN ('no-prazo', 'em-risco', 'atrasado', 'concluido')),
  description         TEXT,
  location            TEXT,
  responsible         TEXT,
  budget_planned      NUMERIC(12,2) DEFAULT 0,
  budget_spent        NUMERIC(12,2) DEFAULT 0,
  expected_attendance INTEGER,
  actual_attendance   INTEGER,
  recurrence          TEXT NOT NULL DEFAULT 'unico' CHECK (recurrence IN ('unico', 'semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual')),
  notes               TEXT,
  lessons_learned     TEXT,
  project_id          UUID, -- FK futura para tabela projects
  created_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ocorrências individuais de eventos recorrentes
CREATE TABLE IF NOT EXISTS event_occurrences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluido')),
  notes           TEXT,
  lessons_learned TEXT,
  attendance      INTEGER,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, date)
);

-- Tarefas vinculadas a eventos
CREATE TABLE IF NOT EXISTS event_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  responsible TEXT,
  area        TEXT,
  start_date  DATE,
  deadline    DATE,
  status      TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em-andamento', 'concluida', 'bloqueada')),
  priority    TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('urgente', 'alta', 'media', 'baixa')),
  is_milestone BOOLEAN DEFAULT FALSE,
  description TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dependências entre tarefas de evento
CREATE TABLE IF NOT EXISTS event_task_dependencies (
  task_id       UUID NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, depends_on_id),
  CHECK (task_id != depends_on_id)
);

-- Subtarefas (checklist) de tarefas de evento
CREATE TABLE IF NOT EXISTS event_task_subtasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  done        BOOLEAN DEFAULT FALSE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentários em tarefas de evento
CREATE TABLE IF NOT EXISTS event_task_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'PMO',
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Links/anexos de tarefas de evento
CREATE TABLE IF NOT EXISTS event_task_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
  label       TEXT,
  url         TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reuniões vinculadas a eventos
CREATE TABLE IF NOT EXISTS meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  occurrence_id   UUID REFERENCES event_occurrences(id) ON DELETE SET NULL,
  project_id      UUID, -- FK futura para tabela projects
  title           TEXT DEFAULT 'Reunião',
  date            DATE NOT NULL,
  occurrence_date DATE,
  participants    TEXT[],
  decisions       TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pendências geradas em reuniões
CREATE TABLE IF NOT EXISTS pendencies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  project_id  UUID, -- FK futura para tabela projects
  description TEXT NOT NULL,
  responsible TEXT,
  area        TEXT,
  deadline    DATE,
  done        BOOLEAN DEFAULT FALSE,
  done_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Triggers (reusa set_updated_at da migration 001) ────────
CREATE TRIGGER events_updated_at            BEFORE UPDATE ON events            FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER event_occurrences_updated_at BEFORE UPDATE ON event_occurrences FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER event_tasks_updated_at       BEFORE UPDATE ON event_tasks       FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER meetings_updated_at          BEFORE UPDATE ON meetings          FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE event_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_occurrences      ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_task_subtasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_task_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_task_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE pendencies             ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer autenticado pode ver eventos e dados relacionados
CREATE POLICY "evt_categories_read"    ON event_categories       FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "evt_events_read"        ON events                 FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "evt_occurrences_read"   ON event_occurrences      FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "evt_tasks_read"         ON event_tasks            FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "evt_dependencies_read"  ON event_task_dependencies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "evt_subtasks_read"      ON event_task_subtasks    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "evt_comments_read"      ON event_task_comments    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "evt_links_read"         ON event_task_links       FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "evt_meetings_read"      ON meetings               FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "evt_pendencies_read"    ON pendencies             FOR SELECT USING (auth.role() = 'authenticated');

-- Escrita: somente admin/diretor
CREATE POLICY "evt_categories_admin"   ON event_categories       FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "evt_events_admin"       ON events                 FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "evt_occurrences_admin"  ON event_occurrences      FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "evt_tasks_admin"        ON event_tasks            FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "evt_dependencies_admin" ON event_task_dependencies FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "evt_subtasks_admin"     ON event_task_subtasks    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "evt_links_admin"        ON event_task_links       FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "evt_meetings_admin"     ON meetings               FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "evt_pendencies_admin"   ON pendencies             FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));

-- Comentários: qualquer autenticado pode criar
CREATE POLICY "evt_comments_create"    ON event_task_comments    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "evt_comments_admin"     ON event_task_comments    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_evt_categories_active     ON event_categories(active);
CREATE INDEX idx_evt_categories_sort       ON event_categories(sort_order);

CREATE INDEX idx_evt_events_date           ON events(date);
CREATE INDEX idx_evt_events_status         ON events(status);
CREATE INDEX idx_evt_events_category       ON events(category_id);
CREATE INDEX idx_evt_events_recurrence     ON events(recurrence);
CREATE INDEX idx_evt_events_project        ON events(project_id);

CREATE INDEX idx_evt_occurrences_event     ON event_occurrences(event_id);
CREATE INDEX idx_evt_occurrences_date      ON event_occurrences(date);
CREATE INDEX idx_evt_occurrences_status    ON event_occurrences(status);

CREATE INDEX idx_evt_tasks_event           ON event_tasks(event_id);
CREATE INDEX idx_evt_tasks_status          ON event_tasks(status);
CREATE INDEX idx_evt_tasks_deadline        ON event_tasks(deadline);
CREATE INDEX idx_evt_tasks_priority        ON event_tasks(priority);
CREATE INDEX idx_evt_tasks_responsible     ON event_tasks(responsible);

CREATE INDEX idx_evt_subtasks_task         ON event_task_subtasks(task_id);
CREATE INDEX idx_evt_comments_task         ON event_task_comments(task_id);
CREATE INDEX idx_evt_links_task            ON event_task_links(task_id);

CREATE INDEX idx_evt_meetings_event        ON meetings(event_id);
CREATE INDEX idx_evt_meetings_date         ON meetings(date);
CREATE INDEX idx_evt_meetings_occurrence   ON meetings(occurrence_id);

CREATE INDEX idx_evt_pendencies_meeting    ON pendencies(meeting_id);
CREATE INDEX idx_evt_pendencies_event      ON pendencies(event_id);
CREATE INDEX idx_evt_pendencies_done       ON pendencies(done);
CREATE INDEX idx_evt_pendencies_deadline   ON pendencies(deadline);

-- ── View: dashboard de eventos ──────────────────────────────
CREATE OR REPLACE VIEW v_events_dashboard AS
SELECT
  e.id,
  e.name,
  e.date,
  e.status,
  e.recurrence,
  e.responsible,
  e.budget_planned,
  e.budget_spent,
  ec.name AS category_name,
  ec.color AS category_color,
  COUNT(DISTINCT et.id) AS total_tasks,
  COUNT(DISTINCT et.id) FILTER (WHERE et.status = 'concluida') AS completed_tasks,
  COUNT(DISTINCT m.id) AS total_meetings,
  COUNT(DISTINCT pd.id) FILTER (WHERE pd.done = FALSE) AS open_pendencies,
  COUNT(DISTINCT eo.id) AS total_occurrences,
  COUNT(DISTINCT eo.id) FILTER (WHERE eo.status = 'concluido') AS completed_occurrences
FROM events e
LEFT JOIN event_categories ec ON e.category_id = ec.id
LEFT JOIN event_tasks et ON et.event_id = e.id
LEFT JOIN meetings m ON m.event_id = e.id
LEFT JOIN pendencies pd ON pd.event_id = e.id
LEFT JOIN event_occurrences eo ON eo.event_id = e.id
GROUP BY e.id, ec.name, ec.color;
