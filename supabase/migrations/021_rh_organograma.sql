-- ============================================================
-- 021_rh_organograma.sql
-- Organograma: gestor_id para hierarquia de colaboradores
-- ============================================================

ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS gestor_id UUID REFERENCES rh_funcionarios(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_rh_funcionarios_gestor ON rh_funcionarios(gestor_id);
