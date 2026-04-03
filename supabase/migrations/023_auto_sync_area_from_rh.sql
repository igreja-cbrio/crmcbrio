-- ============================================================
-- 017_auto_sync_area_from_rh.sql
-- Ao criar profile (novo login), busca area e cargo do RH
-- automaticamente pelo email
-- ============================================================

-- Recriar trigger handle_new_user para buscar area do RH
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rh_area TEXT;
  rh_cargo TEXT;
BEGIN
  -- Buscar area e cargo do funcionário pelo email no RH
  SELECT area, cargo INTO rh_area, rh_cargo
  FROM rh_funcionarios
  WHERE email = NEW.email AND status = 'ativo'
  LIMIT 1;

  INSERT INTO public.profiles (id, name, email, role, area)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'assistente',
    rh_area  -- será NULL se não encontrar no RH
  )
  ON CONFLICT (id) DO UPDATE SET
    area = COALESCE(EXCLUDED.area, profiles.area);

  RETURN NEW;
END;
$$;

-- Função para sincronizar area de todos os profiles existentes com RH
CREATE OR REPLACE FUNCTION public.sync_profiles_area_from_rh()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  UPDATE profiles p
  SET area = f.area
  FROM rh_funcionarios f
  WHERE f.email = p.email
    AND f.email IS NOT NULL
    AND f.email != ''
    AND f.status = 'ativo'
    AND (p.area IS NULL OR p.area != f.area);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
