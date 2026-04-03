-- ============================================================
-- 016_arquivei_integration.sql
-- Integração Arquivei: credenciais API para buscar NFs por CNPJ
-- ============================================================

CREATE TABLE IF NOT EXISTS arquivei_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id          TEXT NOT NULL,
  api_key         TEXT NOT NULL,
  cnpj            TEXT NOT NULL,        -- CNPJ monitorado
  connected       BOOLEAN DEFAULT FALSE,
  last_cursor     TEXT,                  -- cursor de paginação para sync incremental
  last_sync       TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adicionar origem na tabela de notas fiscais
ALTER TABLE log_notas_fiscais ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'manual';
-- origem: 'manual', 'mercadolivre', 'arquivei'
ALTER TABLE log_notas_fiscais ADD COLUMN IF NOT EXISTS ml_order_id TEXT;
ALTER TABLE log_notas_fiscais ADD COLUMN IF NOT EXISTS xml_content TEXT;
ALTER TABLE log_notas_fiscais ADD COLUMN IF NOT EXISTS emitente_nome TEXT;
ALTER TABLE log_notas_fiscais ADD COLUMN IF NOT EXISTS emitente_cnpj TEXT;

ALTER TABLE arquivei_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arquivei_config_admin" ON arquivei_config
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor')));
