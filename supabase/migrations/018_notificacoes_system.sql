-- ============================================================
-- 018_notificacoes_system.sql
-- Sistema de notificações: colunas extras + tabela de regras
-- ============================================================

-- Adicionar colunas ao notificacoes existente
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS modulo TEXT;
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS severidade TEXT DEFAULT 'info';
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS chave_dedup TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notif_usuario_lida ON notificacoes(usuario_id, lida);
CREATE INDEX IF NOT EXISTS idx_notif_modulo ON notificacoes(modulo);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notificacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_dedup ON notificacoes(usuario_id, chave_dedup) WHERE chave_dedup IS NOT NULL;

-- Tabela de regras: quem recebe notificações de qual módulo
CREATE TABLE IF NOT EXISTS notificacao_regras (
  id          SERIAL PRIMARY KEY,
  modulo      TEXT NOT NULL,
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ativo       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(modulo, profile_id)
);

ALTER TABLE notificacao_regras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_regras_admin" ON notificacao_regras
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor'))
  );
