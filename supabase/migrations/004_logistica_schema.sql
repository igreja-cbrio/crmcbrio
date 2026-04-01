-- ============================================================
-- 004_logistica_schema.sql
-- Módulo Logística: fornecedores, compras, pedidos, recebimento,
--                  notas fiscais
-- ============================================================

CREATE TABLE IF NOT EXISTS log_fornecedores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj        TEXT UNIQUE,
  email       TEXT,
  telefone    TEXT,
  contato     TEXT,
  categoria   TEXT, -- 'material', 'servico', 'transporte', etc.
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  observacoes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS log_solicitacoes_compra (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  justificativa   TEXT,
  valor_estimado  NUMERIC(12,2),
  urgencia        TEXT NOT NULL DEFAULT 'normal' CHECK (urgencia IN ('baixa', 'normal', 'alta', 'urgente')),
  area            TEXT,
  solicitante_id  UUID NOT NULL REFERENCES profiles(id),
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'em_cotacao', 'pedido_gerado')),
  aprovado_por    UUID REFERENCES profiles(id),
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS log_pedidos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id      UUID REFERENCES log_solicitacoes_compra(id),
  fornecedor_id       UUID NOT NULL REFERENCES log_fornecedores(id),
  descricao           TEXT NOT NULL,
  valor_total         NUMERIC(12,2) NOT NULL,
  data_pedido         DATE NOT NULL DEFAULT CURRENT_DATE,
  data_prevista       DATE,
  status              TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'em_transito', 'recebido', 'cancelado')),
  codigo_rastreio     TEXT,
  transportadora      TEXT,
  created_by          UUID REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS log_itens_pedido (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id   UUID NOT NULL REFERENCES log_pedidos(id) ON DELETE CASCADE,
  descricao   TEXT NOT NULL,
  quantidade  NUMERIC(10,3) NOT NULL,
  unidade     TEXT NOT NULL DEFAULT 'un',
  valor_unit  NUMERIC(12,2),
  valor_total NUMERIC(12,2)
);

CREATE TABLE IF NOT EXISTS log_recebimentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id       UUID NOT NULL REFERENCES log_pedidos(id),
  data_recebimento DATE NOT NULL DEFAULT CURRENT_DATE,
  recebido_por    UUID REFERENCES profiles(id),
  foto_url        TEXT, -- Supabase Storage
  observacoes     TEXT,
  status          TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'com_avaria', 'incompleto')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS log_notas_fiscais (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id       UUID REFERENCES log_pedidos(id),
  fornecedor_id   UUID REFERENCES log_fornecedores(id),
  numero          TEXT NOT NULL,
  serie           TEXT,
  chave_acesso    TEXT UNIQUE,
  valor           NUMERIC(12,2) NOT NULL,
  data_emissao    DATE NOT NULL,
  storage_path    TEXT, -- PDF da NF no Supabase Storage
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Triggers
CREATE TRIGGER log_fornecedores_updated_at    BEFORE UPDATE ON log_fornecedores           FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER log_solicitacoes_updated_at    BEFORE UPDATE ON log_solicitacoes_compra    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER log_pedidos_updated_at         BEFORE UPDATE ON log_pedidos                FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- RLS
ALTER TABLE log_fornecedores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_solicitacoes_compra  ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_pedidos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_itens_pedido         ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_recebimentos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_notas_fiscais        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "log_fornecedores_admin"        ON log_fornecedores        FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "log_pedidos_admin"             ON log_pedidos             FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "log_itens_admin"               ON log_itens_pedido        FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "log_recebimentos_admin"        ON log_recebimentos        FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "log_notas_admin"               ON log_notas_fiscais       FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));

-- Solicitações: qualquer autenticado pode criar e ver as próprias
CREATE POLICY "log_solicitacoes_create"  ON log_solicitacoes_compra FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "log_solicitacoes_own"     ON log_solicitacoes_compra FOR SELECT USING (solicitante_id = auth.uid());
CREATE POLICY "log_solicitacoes_admin"   ON log_solicitacoes_compra FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
