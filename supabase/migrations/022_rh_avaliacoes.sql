-- ============================================================
-- 022_rh_avaliacoes.sql
-- Avaliações de desempenho
-- ============================================================

CREATE TABLE IF NOT EXISTS rh_avaliacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id  UUID NOT NULL REFERENCES rh_funcionarios(id) ON DELETE CASCADE,
  avaliador_id    UUID REFERENCES profiles(id),
  periodo         TEXT NOT NULL,             -- ex: "2026-Q1", "2026-S1"
  data_avaliacao  DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Notas de 1 a 5
  nota_produtividade    INT CHECK (nota_produtividade BETWEEN 1 AND 5),
  nota_qualidade        INT CHECK (nota_qualidade BETWEEN 1 AND 5),
  nota_pontualidade     INT CHECK (nota_pontualidade BETWEEN 1 AND 5),
  nota_trabalho_equipe  INT CHECK (nota_trabalho_equipe BETWEEN 1 AND 5),
  nota_iniciativa       INT CHECK (nota_iniciativa BETWEEN 1 AND 5),
  nota_comunicacao      INT CHECK (nota_comunicacao BETWEEN 1 AND 5),

  nota_geral            NUMERIC(3,1),        -- média calculada

  pontos_fortes   TEXT,
  pontos_melhoria TEXT,
  metas           TEXT,
  observacoes     TEXT,

  status          TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizado')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER rh_avaliacoes_updated_at
  BEFORE UPDATE ON rh_avaliacoes
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

ALTER TABLE rh_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rh_avaliacoes_admin" ON rh_avaliacoes
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor')));

CREATE INDEX idx_rh_avaliacoes_func ON rh_avaliacoes(funcionario_id);
CREATE INDEX idx_rh_avaliacoes_periodo ON rh_avaliacoes(periodo);
