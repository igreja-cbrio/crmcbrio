-- ============================================================
-- 019_rh_admissoes.sql
-- Sistema de admissão: processo de onboarding com contratos
-- ============================================================

CREATE TABLE IF NOT EXISTS rh_admissoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id  UUID REFERENCES rh_funcionarios(id) ON DELETE SET NULL,

  -- Status do processo
  status          TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'formulario_enviado', 'formulario_preenchido', 'contrato_gerado', 'contrato_enviado', 'assinado', 'concluido', 'cancelado')),
  tipo_contrato   TEXT NOT NULL DEFAULT 'clt' CHECK (tipo_contrato IN ('clt', 'pj', 'voluntario', 'estagiario')),

  -- Dados básicos (preenchido pelo RH ou pelo candidato)
  nome            TEXT NOT NULL,
  cpf             TEXT,
  rg              TEXT,
  email           TEXT,
  telefone        TEXT,
  data_nascimento DATE,
  endereco        TEXT,
  cargo           TEXT,
  area            TEXT,
  salario         NUMERIC(12,2),
  data_inicio     DATE,

  -- Dados PJ (preenchidos quando tipo_contrato = 'pj')
  pj_razao_social    TEXT,
  pj_nome_fantasia   TEXT,
  pj_cnpj            TEXT,
  pj_inscricao_municipal TEXT,
  pj_endereco_empresa TEXT,
  pj_banco           TEXT,
  pj_agencia         TEXT,
  pj_conta           TEXT,
  pj_pix             TEXT,

  -- Contrato
  contrato_template  TEXT,  -- template HTML do contrato
  contrato_editado   TEXT,  -- contrato final editado (HTML)
  contrato_pdf_url   TEXT,  -- URL do PDF gerado (Supabase Storage)

  -- Observações
  observacoes     TEXT,

  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger de updated_at
CREATE TRIGGER rh_admissoes_updated_at
  BEFORE UPDATE ON rh_admissoes
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- RLS
ALTER TABLE rh_admissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rh_admissoes_admin_all" ON rh_admissoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor'))
  );

-- Indexes
CREATE INDEX idx_rh_admissoes_status ON rh_admissoes(status);
CREATE INDEX idx_rh_admissoes_tipo ON rh_admissoes(tipo_contrato);
CREATE INDEX idx_rh_admissoes_func ON rh_admissoes(funcionario_id);
