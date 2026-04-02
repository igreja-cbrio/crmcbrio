-- Adiciona coluna foto_url na tabela rh_funcionarios
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Cria bucket para fotos de colaboradores (public para exibição)
INSERT INTO storage.buckets (id, name, public)
VALUES ('rh-fotos', 'rh-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Política: qualquer usuário autenticado pode fazer upload
CREATE POLICY "Authenticated users can upload rh photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'rh-fotos');

-- Política: qualquer usuário autenticado pode atualizar suas fotos
CREATE POLICY "Authenticated users can update rh photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'rh-fotos');

-- Política: leitura pública (bucket já é public, mas policy garante)
CREATE POLICY "Public read access for rh photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'rh-fotos');

-- Política: autenticados podem deletar fotos
CREATE POLICY "Authenticated users can delete rh photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'rh-fotos');
