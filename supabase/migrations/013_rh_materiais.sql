-- ============================================================
-- 013_rh_materiais.sql
-- Materiais de treinamento: upload de arquivos + tracking de
-- visualização/conclusão por colaborador
-- ============================================================

-- Materiais vinculados a um treinamento (ou avulsos)
CREATE TABLE IF NOT EXISTS rh_materiais (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id  UUID REFERENCES rh_treinamentos(id) ON DELETE CASCADE,
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  tipo            TEXT NOT NULL DEFAULT 'material'
                  CHECK (tipo IN ('material', 'questionario', 'video', 'apresentacao', 'documento')),
  arquivo_url     TEXT,          -- URL no Supabase Storage
  arquivo_nome    TEXT,          -- nome original do arquivo
  arquivo_tipo    TEXT,          -- mime type (application/pdf, etc.)
  obrigatorio     BOOLEAN DEFAULT FALSE,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracking: quem recebeu, quem viu, quem concluiu
CREATE TABLE IF NOT EXISTS rh_materiais_funcionarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id     UUID NOT NULL REFERENCES rh_materiais(id) ON DELETE CASCADE,
  funcionario_id  UUID NOT NULL REFERENCES rh_funcionarios(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente', 'visualizado', 'concluido')),
  data_envio      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_visualizacao TIMESTAMPTZ,
  data_conclusao  TIMESTAMPTZ,
  UNIQUE(material_id, funcionario_id)
);

-- RLS
ALTER TABLE rh_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_materiais_funcionarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rh_materiais_admin_all" ON rh_materiais
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor'))
  );

CREATE POLICY "rh_materiais_func_admin_all" ON rh_materiais_funcionarios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor'))
  );

-- Indexes
CREATE INDEX idx_rh_materiais_treinamento ON rh_materiais(treinamento_id);
CREATE INDEX idx_rh_materiais_func_material ON rh_materiais_funcionarios(material_id);
CREATE INDEX idx_rh_materiais_func_funcionario ON rh_materiais_funcionarios(funcionario_id);
CREATE INDEX idx_rh_materiais_func_status ON rh_materiais_funcionarios(status);

-- Storage bucket para materiais de treinamento
INSERT INTO storage.buckets (id, name, public)
VALUES ('rh-materiais', 'rh-materiais', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth upload rh materiais"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'rh-materiais');

CREATE POLICY "Auth update rh materiais"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'rh-materiais');

CREATE POLICY "Public read rh materiais"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'rh-materiais');

CREATE POLICY "Auth delete rh materiais"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'rh-materiais');
