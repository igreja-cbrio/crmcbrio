-- ============================================================
-- 015_mercadolivre_integration.sql
-- Integração Mercado Livre: tokens OAuth2 + cache de pedidos
-- ============================================================

CREATE TABLE IF NOT EXISTS ml_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       TEXT NOT NULL,
  client_secret   TEXT NOT NULL,
  access_token    TEXT,
  refresh_token   TEXT,
  user_id         TEXT,           -- ML user ID
  token_expires   TIMESTAMPTZ,
  connected       BOOLEAN DEFAULT FALSE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ml_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ml_config_admin" ON ml_config
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor')));
