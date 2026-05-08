-- Migration 035: FKs project_id em events, meetings e pendencies
-- A coluna project_id existe desde 006 com comentário "FK futura" mas nunca foi criada.
-- ON DELETE SET NULL: project_id é nullable e a remoção de um project não deve cascatear
-- a exclusão do evento/reunião/pendência (eles têm valor por si só).

-- 1) Limpar órfãos antes de criar a constraint (evita erro de FK violation).
UPDATE events
   SET project_id = NULL
 WHERE project_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = events.project_id);

UPDATE meetings
   SET project_id = NULL
 WHERE project_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = meetings.project_id);

UPDATE pendencies
   SET project_id = NULL
 WHERE project_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = pendencies.project_id);

-- 2) FKs (idempotentes — DO/EXCEPTION em vez de IF NOT EXISTS, que não existe para constraints).
DO $$ BEGIN
  ALTER TABLE events
    ADD CONSTRAINT events_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE meetings
    ADD CONSTRAINT meetings_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE pendencies
    ADD CONSTRAINT pendencies_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Índices em meetings e pendencies (events já tem `idx_evt_events_project` desde 006).
CREATE INDEX IF NOT EXISTS idx_evt_meetings_project   ON meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_evt_pendencies_project ON pendencies(project_id);
