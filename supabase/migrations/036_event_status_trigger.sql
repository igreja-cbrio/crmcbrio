-- Migration 036: events.status auto-mantido por trigger no DB
-- Substitui a função recalcEventStatus() do backend (events.js) por SQL.
-- Coluna events.status continua existindo (compat com frontend), mas é
-- recalculada automaticamente quando event_occurrences muda OU quando
-- events.date / events.recurrence muda.
--
-- Manual override (botão Finalizar) continua funcionando: trigger só dispara
-- em mudanças nas dependências, não em UPDATE direto da coluna status.

-- ── Função de cálculo (sai do JS) ────────────────────────────
CREATE OR REPLACE FUNCTION recalc_event_status(p_event_id UUID) RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
  v_recurrence TEXT;
  v_date DATE;
  v_next_pending DATE;
  v_diff INT;
  v_total_occ INT;
  v_status TEXT;
BEGIN
  SELECT recurrence, date INTO v_recurrence, v_date FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Próxima ocorrência pendente (se houver)
  SELECT date INTO v_next_pending
    FROM event_occurrences
   WHERE event_id = p_event_id AND status = 'pendente'
   ORDER BY date LIMIT 1;

  IF v_next_pending IS NOT NULL THEN
    -- Há pendência: status reflete o quão próximo dela estamos
    v_diff := v_next_pending - CURRENT_DATE;
  ELSE
    -- Sem pendentes
    SELECT COUNT(*) INTO v_total_occ FROM event_occurrences WHERE event_id = p_event_id;
    IF v_total_occ > 0 THEN
      -- Tinha ocorrências e todas estão concluídas → evento concluído
      v_status := 'concluido';
    ELSE
      -- Sem ocorrências (legacy/unico sem occ): usa events.date
      v_diff := v_date - CURRENT_DATE;
    END IF;
  END IF;

  IF v_status IS NULL THEN
    IF v_diff < 0 THEN v_status := 'atrasado';
    ELSIF v_diff <= 7 THEN v_status := 'em-risco';
    ELSE v_status := 'no-prazo';
    END IF;
  END IF;

  -- IS DISTINCT FROM evita UPDATE redundante (e potencial recursão futura)
  UPDATE events SET status = v_status
   WHERE id = p_event_id AND status IS DISTINCT FROM v_status;
END;
$$;

-- ── Trigger: occurrence change → recalc parent event ────────
CREATE OR REPLACE FUNCTION trg_occ_recalc_event_status() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_event_status(OLD.event_id);
  ELSE
    PERFORM recalc_event_status(NEW.event_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS event_occ_recalc_status ON event_occurrences;
CREATE TRIGGER event_occ_recalc_status
  AFTER INSERT OR UPDATE OR DELETE ON event_occurrences
  FOR EACH ROW EXECUTE PROCEDURE trg_occ_recalc_event_status();

-- ── Trigger: events INSERT ou date/recurrence mudou → recalc ──
-- (não dispara em UPDATE OF status, então manual override sobrevive)
CREATE OR REPLACE FUNCTION trg_events_recalc_self() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM recalc_event_status(NEW.id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS events_recalc_status_self ON events;
CREATE TRIGGER events_recalc_status_self
  AFTER INSERT OR UPDATE OF date, recurrence ON events
  FOR EACH ROW EXECUTE PROCEDURE trg_events_recalc_self();

-- ── Backfill: rodar para todos os eventos existentes ────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM events LOOP
    PERFORM recalc_event_status(r.id);
  END LOOP;
END $$;
