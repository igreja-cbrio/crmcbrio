-- Migration 039: corrige bug do backfill da 036 + previne reincidência
--
-- O que aconteceu:
--   A 036 criou recalc_event_status() e rodou backfill em todos os eventos.
--   Para eventos com status='concluido' manual (botão Finalizar), o backfill
--   recalculou baseado em date/ocorrências e SOBRESCREVEU para
--   'atrasado'/'em-risco'/'no-prazo'. Resultado: eventos que tinham sido
--   finalizados reapareceram como abertos.
--
-- Esta migration:
--   1. Recria recalc_event_status() com guard que preserva 'concluido' manual.
--   2. Adiciona parâmetro p_force pra o caso explícito de Reabrir (RPC chamada
--      pela rota PATCH /:id/status com status='reabrir').
--   3. Recovery: restaura eventos cujo último status_change no audit_log foi
--      para 'concluido' mas que estão com status diferente hoje.

-- ── 1) Função recalc com guard de concluido manual ──────────
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

  -- Preserva 'concluido' manual: trigger NÃO desfaz o que o usuário
  -- explicitamente marcou. Só a rota PATCH /:id/status com 'reabrir'
  -- passa p_force=TRUE pra forçar recálculo.
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

-- ── 2) Recovery: restaurar eventos manualmente finalizados ──
-- Lê audit_log e restaura events.status='concluido' onde o último
-- status_change registrado foi pra 'concluido', mas o estado atual diverge
-- (provavelmente sobrescrito pelo backfill da 036).
WITH ultimo AS (
  SELECT DISTINCT ON (record_id) record_id, new_value, created_at
    FROM audit_log
   WHERE table_name = 'events'
     AND action = 'status_change'
   ORDER BY record_id, created_at DESC
)
UPDATE events e
   SET status = 'concluido'
  FROM ultimo u
 WHERE u.record_id = e.id
   AND u.new_value = 'concluido'
   AND e.status IS DISTINCT FROM 'concluido';
-- Esta UPDATE não dispara o trigger events_recalc_status_self (UPDATE OF
-- date, recurrence apenas). Status fica como definido aqui.
