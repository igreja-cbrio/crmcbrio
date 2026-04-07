-- ============================================================
-- Migration 032: Event Task Attachments + Reports
-- Enables file attachments on event/cycle tasks and AI-generated reports
-- ============================================================

-- ── Table: event_task_attachments ──
CREATE TABLE IF NOT EXISTS event_task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Pode vincular a event_task OU cycle_phase_task
  event_task_id UUID REFERENCES event_tasks(id) ON DELETE CASCADE,
  cycle_task_id UUID REFERENCES cycle_phase_tasks(id) ON DELETE CASCADE,
  -- Metadata
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  -- Storage
  sharepoint_url TEXT,
  sharepoint_item_id TEXT,
  supabase_path TEXT,
  -- Contexto
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  phase_name TEXT,
  area TEXT,
  description TEXT,
  -- Audit
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Constraint: deve ter pelo menos um task vinculado
  CHECK (event_task_id IS NOT NULL OR cycle_task_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_attach_event_task ON event_task_attachments(event_task_id);
CREATE INDEX IF NOT EXISTS idx_attach_cycle_task ON event_task_attachments(cycle_task_id);
CREATE INDEX IF NOT EXISTS idx_attach_event ON event_task_attachments(event_id);

ALTER TABLE event_task_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attach_all" ON event_task_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Table: event_reports ──
CREATE TABLE IF NOT EXISTS event_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  phase_name TEXT,
  report_type TEXT NOT NULL DEFAULT 'phase' CHECK (report_type IN ('phase', 'full')),
  content TEXT NOT NULL,
  sharepoint_url TEXT,
  generated_by UUID REFERENCES profiles(id),
  attachments_count INTEGER DEFAULT 0,
  token_cost NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_event ON event_reports(event_id);
ALTER TABLE event_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_all" ON event_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
