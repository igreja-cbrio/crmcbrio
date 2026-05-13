-- Migration 040: corrige ambiguidade de função recalc_event_status + blinda triggers
--
-- Bug (root cause do 500 ao finalizar ocorrência):
--   A migration 039 criou recalc_event_status(UUID, BOOLEAN DEFAULT FALSE) mas
--   NÃO removeu a versão antiga recalc_event_status(UUID) que veio da 036.
--   Como ambas aceitam um argumento (a nova via DEFAULT), o trigger chamando
--   PERFORM recalc_event_status(NEW.event_id) dispara erro:
--     "function recalc_event_status(uuid) is not unique"
--   Esse erro derruba o UPDATE em event_occurrences (trigger AFTER UPDATE roda
--   na mesma transação) → 500 no PATCH /events/:id/occurrences/:occId.
--
--   Para evento "especial" o trigger em events só dispara em UPDATE OF date,
--   recurrence — UPDATE do status não dispara, por isso evento ESPECIAL
--   "finaliza mas dá erro" (UPDATE passa, alguma operação lateral falha).
--   Ocorrência (event_occurrences) sempre dispara → "não finaliza".
--
-- Fix:
--   1) Recria os trigger functions chamando recalc_event_status com DOIS args
--      explicitamente (UUID, FALSE) — força resolução pra versão da 039 mesmo
--      enquanto a versão antiga ainda existe.
--   2) Envolve as chamadas em BEGIN/EXCEPTION WHEN OTHERS → erro interno do
--      recalc NÃO derruba mais o UPDATE pai. Pior caso events.status fica
--      stale por uma rodada, mas o usuário sempre consegue finalizar.
--   3) Dropa a versão antiga (UUID, 1-arg) que ficou perdida. Agora só existe
--      recalc_event_status(UUID, BOOLEAN DEFAULT FALSE).
--   4) Recria a versão definitiva via CREATE OR REPLACE (idempotente).

-- ── 1) Trigger function em event_occurrences (blindada + 2 args) ──
CREATE OR REPLACE FUNCTION trg_occ_recalc_event_status() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    IF TG_OP = 'DELETE' THEN
      PERFORM recalc_event_status(OLD.event_id, FALSE);
    ELSE
      PERFORM recalc_event_status(NEW.event_id, FALSE);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_occ_recalc_event_status: recalc falhou (event=%) — %',
      COALESCE(NEW.event_id, OLD.event_id), SQLERRM;
  END;
  RETURN NULL;
END;
$$;

-- ── 2) Trigger function em events (mesma blindagem) ──
CREATE OR REPLACE FUNCTION trg_events_recalc_self() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    PERFORM recalc_event_status(NEW.id, FALSE);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_events_recalc_self: recalc falhou (event=%) — %',
      NEW.id, SQLERRM;
  END;
  RETURN NULL;
END;
$$;

-- ── 3) Solta a versão antiga (UUID single-arg) que causou ambiguidade ──
-- DROP é idempotente; se já estiver dropada (Marcos manualmente, por exemplo),
-- segue sem erro.
DROP FUNCTION IF EXISTS recalc_event_status(UUID);

-- ── 4) Garante a versão definitiva (UUID, BOOLEAN DEFAULT FALSE) ──
-- Mesma lógica da 039, repetida aqui pra migration ser self-contained
-- (idempotente se aplicada em DB que ainda não tem a 039).
CREATE OR REPLACE FUNCTION recalc_event_status(p_event_id UUID, p_force BOOLEAN DEFAULT FALSE) RETURNS VOID
LANGUAGE plpgsql AS $func$
DECLARE
  v_recurrence TEXT;
  v_date DATE;
  v_current_status TEXT;
  v_next_pending DATE;
  v_diff INT;
  v_total_occ INT;
  v_status TEXT;
BEGIN
  SELECT recurrence, date, status
    INTO v_recurrence, v_date, v_current_status
    FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Preserva 'concluido' manual: trigger NÃO desfaz o que o usuário marcou.
  -- Só rota PATCH /:id/status com 'reabrir' passa p_force=TRUE pra recomputar.
  IF v_current_status = 'concluido' AND NOT p_force THEN RETURN; END IF;

  SELECT date INTO v_next_pending
    FROM event_occurrences
   WHERE event_id = p_event_id AND status = 'pendente'
   ORDER BY date LIMIT 1;

  IF v_next_pending IS NOT NULL THEN
    v_diff := v_next_pending - CURRENT_DATE;
  ELSE
    SELECT COUNT(*) INTO v_total_occ FROM event_occurrences WHERE event_id = p_event_id;
    IF v_total_occ > 0 THEN
      v_status := 'concluido';
    ELSE
      v_diff := v_date - CURRENT_DATE;
    END IF;
  END IF;

  IF v_status IS NULL THEN
    IF v_diff < 0 THEN v_status := 'atrasado';
    ELSIF v_diff <= 7 THEN v_status := 'em-risco';
    ELSE v_status := 'no-prazo';
    END IF;
  END IF;

  UPDATE events SET status = v_status
   WHERE id = p_event_id AND status IS DISTINCT FROM v_status;
END;
$func$;

-- ── 5) Validação ──
-- Confirma que só existe UMA assinatura de recalc_event_status agora.
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.proname = 'recalc_event_status' AND n.nspname = 'public';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Migration 040 falhou: esperava 1 versão de recalc_event_status, achei %', v_count;
  END IF;
END $$;
