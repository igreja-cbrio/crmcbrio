-- Migration 029: Upgrade project phases from 4 to 7
-- Drop old constraint, add new one, delete old phases

-- 1. Drop the old CHECK constraint on phase_order
ALTER TABLE project_phases DROP CONSTRAINT IF EXISTS project_phases_phase_order_check;

-- 2. Add new constraint allowing 1-7
ALTER TABLE project_phases ADD CONSTRAINT project_phases_phase_order_check CHECK (phase_order BETWEEN 1 AND 7);

-- 3. Delete old 4 phases from all projects (will be recreated by script)
DELETE FROM project_phases;
