-- ============================================================
-- Migration 031: Add responsible_id (UUID) to expansion tables
-- Links milestones and tasks to actual user accounts (profiles)
-- Keeps TEXT `responsible` for backward compat / denormalized display
-- ============================================================

-- ── Milestones ──
ALTER TABLE expansion_milestones ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_exp_ms_responsible_id ON expansion_milestones(responsible_id);

-- ── Tasks ──
ALTER TABLE expansion_tasks ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_exp_task_responsible_id ON expansion_tasks(responsible_id);
