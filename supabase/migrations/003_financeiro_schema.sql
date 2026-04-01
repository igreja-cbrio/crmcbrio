-- ============================================================
-- 003_financeiro_schema.sql
-- Módulo Financeiro: contas, transações, conciliação,
--                   contas a pagar, reembolsos, fluxo de caixa
-- ============================================================

CREATE TABLE IF NOT EXISTS fin_contas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  banco       TEXT,
  agencia     TEXT,
  conta       TEXT,
  tipo        TEXT NOT NULL DEFAULT 'corrente' CHECK (tipo IN ('corrente', 'poupanca', 'caixa', 'investimento')),
  saldo       NUMERIC(15,2) NOT NULL DEFAULT 0,
  ativa       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fin_categorias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  icone       TEXT,
  pai_id      UUID REFERENCES fin_categorias(id)
);

CREATE TABLE IF NOT EXISTS fin_transacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id        UUID NOT NULL REFERENCES fin_contas(id),
  categoria_id    UUID REFERENCES fin_categorias(id),
  tipo            TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa', 'transferencia')),
  descricao       TEXT NOT NULL,
  valor           NUMERIC(15,2) NOT NULL,
  data_competencia DATE NOT NULL,
  data_pagamento  DATE,
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'conciliado', 'cancelado')),
  referencia      TEXT, -- número do documento, nota fiscal, etc.
  observacoes     TEXT,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fin_contas_pagar (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao       TEXT NOT NULL,
  fornecedor      TEXT,
  categoria_id    UUID REFERENCES fin_categorias(id),
  valor           NUMERIC(15,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento  DATE,
  conta_id        UUID REFERENCES fin_contas(id),
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado', 'vencido')),
  comprovante_url TEXT,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fin_reembolsos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_id  UUID NOT NULL REFERENCES profiles(id),
  descricao       TEXT NOT NULL,
  valor           NUMERIC(15,2) NOT NULL,
  data_despesa    DATE NOT NULL,
  categoria_id    UUID REFERENCES fin_categorias(id),
  comprovante_url TEXT,
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'pago')),
  aprovado_por    UUID REFERENCES profiles(id),
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fin_arrecadacao (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao   TEXT NOT NULL DEFAULT 'Dízimos e Ofertas',
  valor       NUMERIC(15,2) NOT NULL,
  data        DATE NOT NULL,
  culto_id    UUID, -- referência futura ao módulo de cultos
  conta_id    UUID REFERENCES fin_contas(id),
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- View: fluxo de caixa por mês
CREATE OR REPLACE VIEW v_fluxo_caixa AS
SELECT
  DATE_TRUNC('month', data_competencia) AS mes,
  SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) AS total_receitas,
  SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) AS total_despesas,
  SUM(CASE WHEN tipo = 'receita' THEN valor ELSE -valor END) AS saldo_mes
FROM fin_transacoes
WHERE status != 'cancelado'
GROUP BY 1
ORDER BY 1 DESC;

-- Triggers de updated_at
CREATE TRIGGER fin_contas_updated_at       BEFORE UPDATE ON fin_contas       FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER fin_transacoes_updated_at   BEFORE UPDATE ON fin_transacoes   FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER fin_contas_pagar_updated_at BEFORE UPDATE ON fin_contas_pagar FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER fin_reembolsos_updated_at   BEFORE UPDATE ON fin_reembolsos   FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- RLS
ALTER TABLE fin_contas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_categorias    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_transacoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_contas_pagar  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_reembolsos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_arrecadacao   ENABLE ROW LEVEL SECURITY;

-- Admin/diretor: acesso total
CREATE POLICY "fin_contas_admin"       ON fin_contas       FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "fin_categorias_admin"   ON fin_categorias   FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "fin_transacoes_admin"   ON fin_transacoes   FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "fin_contas_pagar_admin" ON fin_contas_pagar FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "fin_arrecadacao_admin"  ON fin_arrecadacao  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));

-- Reembolsos: qualquer autenticado pode criar; só admin/diretor aprova
CREATE POLICY "fin_reembolsos_create"  ON fin_reembolsos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "fin_reembolsos_own"     ON fin_reembolsos FOR SELECT USING (solicitante_id = auth.uid());
CREATE POLICY "fin_reembolsos_admin"   ON fin_reembolsos FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_fin_contas_ativa ON fin_contas(ativa);
CREATE INDEX idx_fin_categorias_tipo ON fin_categorias(tipo);
CREATE INDEX idx_fin_transacoes_conta ON fin_transacoes(conta_id);
CREATE INDEX idx_fin_transacoes_categoria ON fin_transacoes(categoria_id);
CREATE INDEX idx_fin_transacoes_data ON fin_transacoes(data_competencia);
CREATE INDEX idx_fin_transacoes_status ON fin_transacoes(status);
CREATE INDEX idx_fin_transacoes_tipo ON fin_transacoes(tipo);
CREATE INDEX idx_fin_contas_pagar_status ON fin_contas_pagar(status);
CREATE INDEX idx_fin_contas_pagar_vencimento ON fin_contas_pagar(data_vencimento);
CREATE INDEX idx_fin_contas_pagar_conta ON fin_contas_pagar(conta_id);
CREATE INDEX idx_fin_reembolsos_solicitante ON fin_reembolsos(solicitante_id);
CREATE INDEX idx_fin_reembolsos_status ON fin_reembolsos(status);
CREATE INDEX idx_fin_arrecadacao_data ON fin_arrecadacao(data);
CREATE INDEX idx_fin_arrecadacao_conta ON fin_arrecadacao(conta_id);
