-- ============================================================
-- 005_patrimonio_schema.sql
-- Módulo Patrimônio: bens, categorias, localizações,
--                   movimentações, inventário
-- ============================================================

CREATE TABLE IF NOT EXISTS pat_categorias (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome    TEXT NOT NULL,
  pai_id  UUID REFERENCES pat_categorias(id),
  icone   TEXT
);

CREATE TABLE IF NOT EXISTS pat_localizacoes (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome    TEXT NOT NULL, -- ex: 'Auditório', 'Sala 3', 'Depósito'
  pai_id  UUID REFERENCES pat_localizacoes(id)
);

CREATE TABLE IF NOT EXISTS pat_bens (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_barras     TEXT UNIQUE NOT NULL, -- gerado ou lido via scanner
  nome              TEXT NOT NULL,
  descricao         TEXT,
  categoria_id      UUID REFERENCES pat_categorias(id),
  localizacao_id    UUID REFERENCES pat_localizacoes(id),
  numero_serie      TEXT,
  marca             TEXT,
  modelo            TEXT,
  valor_aquisicao   NUMERIC(12,2),
  data_aquisicao    DATE,
  nota_fiscal_id    UUID, -- referência futura a log_notas_fiscais
  status            TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'manutencao', 'baixado', 'extraviado')),
  foto_url          TEXT, -- Supabase Storage
  observacoes       TEXT,
  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pat_movimentacoes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bem_id            UUID NOT NULL REFERENCES pat_bens(id) ON DELETE CASCADE,
  tipo              TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'transferencia', 'manutencao', 'baixa')),
  localizacao_origem_id  UUID REFERENCES pat_localizacoes(id),
  localizacao_destino_id UUID REFERENCES pat_localizacoes(id),
  responsavel_id    UUID REFERENCES profiles(id),
  data_movimentacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  motivo            TEXT,
  foto_url          TEXT, -- comprovante da movimentação
  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pat_inventarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT NOT NULL,
  data_inicio   DATE NOT NULL,
  data_fim      DATE,
  responsavel_id UUID REFERENCES profiles(id),
  status        TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluido', 'cancelado')),
  observacoes   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pat_inventario_itens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventario_id   UUID NOT NULL REFERENCES pat_inventarios(id) ON DELETE CASCADE,
  bem_id          UUID NOT NULL REFERENCES pat_bens(id),
  localizado      BOOLEAN,
  localizacao_encontrada UUID REFERENCES pat_localizacoes(id),
  divergencia     TEXT,
  conferido_por   UUID REFERENCES profiles(id),
  conferido_em    TIMESTAMPTZ,
  UNIQUE(inventario_id, bem_id)
);

-- Trigger updated_at
CREATE TRIGGER pat_bens_updated_at BEFORE UPDATE ON pat_bens FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- RLS
ALTER TABLE pat_categorias       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pat_localizacoes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pat_bens             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pat_movimentacoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pat_inventarios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pat_inventario_itens ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode visualizar patrimônio
CREATE POLICY "pat_read_all" ON pat_bens          FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "pat_cat_read" ON pat_categorias    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "pat_loc_read" ON pat_localizacoes  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "pat_mov_read" ON pat_movimentacoes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "pat_inv_read" ON pat_inventarios   FOR SELECT USING (auth.role() = 'authenticated');

-- Somente admin/diretor pode alterar
CREATE POLICY "pat_write_admin"     ON pat_bens             FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "pat_cat_write_admin" ON pat_categorias       FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "pat_loc_write_admin" ON pat_localizacoes     FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "pat_mov_write_admin" ON pat_movimentacoes    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "pat_inv_write_admin" ON pat_inventarios      FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
CREATE POLICY "pat_inv_it_admin"    ON pat_inventario_itens FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','diretor')));
