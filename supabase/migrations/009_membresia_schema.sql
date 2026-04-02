-- ============================================================
-- 009_membresia_schema.sql
-- Schema de membresia: membros, famílias, trilha dos valores
-- ============================================================

-- Famílias
CREATE TABLE IF NOT EXISTS mem_familias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  observacoes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Membros
CREATE TABLE IF NOT EXISTS mem_membros (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  email           TEXT,
  telefone        TEXT,
  data_nascimento DATE,
  genero          TEXT CHECK (genero IN ('masculino', 'feminino', 'outro')),
  estado_civil    TEXT CHECK (estado_civil IN ('solteiro', 'casado', 'divorciado', 'viuvo')),
  endereco        TEXT,
  bairro          TEXT,
  cidade          TEXT DEFAULT 'Rio de Janeiro',
  foto_url        TEXT,
  familia_id      UUID REFERENCES mem_familias(id) ON DELETE SET NULL,
  -- Status na igreja
  status          TEXT NOT NULL DEFAULT 'visitante' CHECK (status IN ('visitante', 'frequentador', 'membro', 'membro_ativo', 'inativo', 'transferido')),
  data_conversao  DATE,
  data_batismo    DATE,
  data_membresia  DATE,
  -- Envolvimento
  ministerio      TEXT,
  grupo           TEXT,
  voluntario      BOOLEAN DEFAULT FALSE,
  lider           BOOLEAN DEFAULT FALSE,
  -- Observações
  como_conheceu   TEXT,
  observacoes     TEXT,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trilha dos valores (etapas que o membro percorre na igreja)
CREATE TABLE IF NOT EXISTS mem_trilha_valores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membro_id   UUID NOT NULL REFERENCES mem_membros(id) ON DELETE CASCADE,
  etapa       TEXT NOT NULL CHECK (etapa IN (
    'primeiro_contato',
    'cafe_boas_vindas',
    'classe_batismo',
    'batismo',
    'classe_membresia',
    'membresia',
    'classe_valores',
    'grupo_vida',
    'escola_lideres',
    'lider_grupo',
    'ministerio'
  )),
  data_conclusao  DATE,
  observacoes     TEXT,
  concluida       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Histórico do membro (ações registradas)
CREATE TABLE IF NOT EXISTS mem_historico (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membro_id   UUID NOT NULL REFERENCES mem_membros(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('visita', 'decisao', 'batismo', 'membresia', 'transferencia', 'cuidado', 'outro')),
  descricao   TEXT NOT NULL,
  data        DATE NOT NULL DEFAULT CURRENT_DATE,
  registrado_por UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Triggers ──
CREATE TRIGGER mem_familias_updated_at BEFORE UPDATE ON mem_familias
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER mem_membros_updated_at BEFORE UPDATE ON mem_membros
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ── RLS ──
ALTER TABLE mem_familias ENABLE ROW LEVEL SECURITY;
ALTER TABLE mem_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE mem_trilha_valores ENABLE ROW LEVEL SECURITY;
ALTER TABLE mem_historico ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "mem_familias_select" ON mem_familias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "mem_membros_select" ON mem_membros FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "mem_trilha_select" ON mem_trilha_valores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "mem_historico_select" ON mem_historico FOR SELECT USING (auth.role() = 'authenticated');

-- Admin/diretor can write
CREATE POLICY "mem_familias_write" ON mem_familias FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor'))
);
CREATE POLICY "mem_membros_write" ON mem_membros FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor'))
);
CREATE POLICY "mem_trilha_write" ON mem_trilha_valores FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor'))
);
CREATE POLICY "mem_historico_write" ON mem_historico FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor'))
);

-- ── Indexes ──
CREATE INDEX idx_mem_membros_status ON mem_membros(status);
CREATE INDEX idx_mem_membros_familia ON mem_membros(familia_id);
CREATE INDEX idx_mem_membros_nome ON mem_membros(nome);
CREATE INDEX idx_mem_trilha_membro ON mem_trilha_valores(membro_id);
CREATE INDEX idx_mem_historico_membro ON mem_historico(membro_id);
