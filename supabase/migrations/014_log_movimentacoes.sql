-- ============================================================
-- 014_log_movimentacoes.sql
-- Movimentações de itens por código de barras + storage NFs
-- ============================================================

-- Movimentações registradas via leitura de código de barras
CREATE TABLE IF NOT EXISTS log_movimentacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id       UUID REFERENCES log_pedidos(id),
  tipo            TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'transferencia', 'devolucao', 'inventario')),
  codigo_barras   TEXT NOT NULL,
  descricao       TEXT,
  quantidade      NUMERIC(10,3) NOT NULL DEFAULT 1,
  unidade         TEXT NOT NULL DEFAULT 'un',
  localizacao     TEXT,           -- local de origem/destino
  responsavel_id  UUID REFERENCES profiles(id),
  observacoes     TEXT,
  foto_url        TEXT,           -- foto do item/recebimento
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE log_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "log_movimentacoes_admin" ON log_movimentacoes
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor')));

CREATE INDEX idx_log_mov_codigo ON log_movimentacoes(codigo_barras);
CREATE INDEX idx_log_mov_tipo ON log_movimentacoes(tipo);
CREATE INDEX idx_log_mov_pedido ON log_movimentacoes(pedido_id);
CREATE INDEX idx_log_mov_data ON log_movimentacoes(created_at);

-- Storage bucket para notas fiscais e fotos de logística
INSERT INTO storage.buckets (id, name, public)
VALUES ('log-arquivos', 'log-arquivos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth upload log arquivos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'log-arquivos');

CREATE POLICY "Auth update log arquivos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'log-arquivos');

CREATE POLICY "Public read log arquivos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'log-arquivos');

CREATE POLICY "Auth delete log arquivos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'log-arquivos');
