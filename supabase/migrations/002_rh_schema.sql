-- ============================================================
-- 002_rh_schema.sql
-- Módulo RH: funcionários, admissões, documentos, treinamentos,
--            férias e licenças
-- ============================================================

CREATE TABLE IF NOT EXISTS rh_funcionarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  cpf             TEXT UNIQUE,
  email           TEXT,
  telefone        TEXT,
  cargo           TEXT NOT NULL,
  area            TEXT,
  tipo_contrato   TEXT NOT NULL DEFAULT 'clt' CHECK (tipo_contrato IN ('clt', 'pj', 'voluntario', 'estagiario')),
  data_admissao   DATE NOT NULL,
  data_demissao   DATE,
  salario         NUMERIC(12,2),
  status          TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'ferias', 'licenca')),
  observacoes     TEXT,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rh_documentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id  UUID NOT NULL REFERENCES rh_funcionarios(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL, -- 'contrato', 'ctps', 'rg', 'cpf', 'outro'
  nome            TEXT NOT NULL,
  storage_path    TEXT, -- Supabase Storage path
  data_expiracao  DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rh_treinamentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  data_inicio     DATE NOT NULL,
  data_fim        DATE,
  instrutor       TEXT,
  obrigatorio     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rh_treinamentos_funcionarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id  UUID NOT NULL REFERENCES rh_treinamentos(id) ON DELETE CASCADE,
  funcionario_id  UUID NOT NULL REFERENCES rh_funcionarios(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'inscrito' CHECK (status IN ('inscrito', 'concluido', 'cancelado')),
  data_conclusao  DATE,
  certificado_url TEXT,
  UNIQUE(treinamento_id, funcionario_id)
);

CREATE TABLE IF NOT EXISTS rh_ferias_licencas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id  UUID NOT NULL REFERENCES rh_funcionarios(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('ferias', 'licenca_medica', 'licenca_maternidade', 'licenca_paternidade', 'outro')),
  data_inicio     DATE NOT NULL,
  data_fim        DATE NOT NULL,
  aprovado_por    UUID REFERENCES profiles(id),
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Triggers de updated_at
CREATE TRIGGER rh_funcionarios_updated_at
  BEFORE UPDATE ON rh_funcionarios
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- RLS
ALTER TABLE rh_funcionarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_documentos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_treinamentos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_treinamentos_funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_ferias_licencas       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rh_admin_all" ON rh_funcionarios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor'))
  );

CREATE POLICY "rh_docs_admin_all" ON rh_documentos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor'))
  );

CREATE POLICY "rh_trein_admin_all" ON rh_treinamentos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor'))
  );

CREATE POLICY "rh_trein_func_admin_all" ON rh_treinamentos_funcionarios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor'))
  );

CREATE POLICY "rh_ferias_admin_all" ON rh_ferias_licencas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor'))
  );

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_rh_funcionarios_status ON rh_funcionarios(status);
CREATE INDEX idx_rh_funcionarios_area ON rh_funcionarios(area);
CREATE INDEX idx_rh_funcionarios_tipo_contrato ON rh_funcionarios(tipo_contrato);
CREATE INDEX idx_rh_documentos_funcionario ON rh_documentos(funcionario_id);
CREATE INDEX idx_rh_documentos_expiracao ON rh_documentos(data_expiracao);
CREATE INDEX idx_rh_trein_func_treinamento ON rh_treinamentos_funcionarios(treinamento_id);
CREATE INDEX idx_rh_trein_func_funcionario ON rh_treinamentos_funcionarios(funcionario_id);
CREATE INDEX idx_rh_ferias_funcionario ON rh_ferias_licencas(funcionario_id);
CREATE INDEX idx_rh_ferias_status ON rh_ferias_licencas(status);
CREATE INDEX idx_rh_ferias_datas ON rh_ferias_licencas(data_inicio, data_fim);
