-- ============================================================
-- 020_agent_framework.sql
-- Framework de agentes IA: runs, steps, queue expandido
-- ============================================================

-- Tabela principal: uma execução de agente
CREATE TABLE IF NOT EXISTS agent_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running','completed','failed','cancelled')),
  triggered_by    UUID REFERENCES profiles(id),
  config          JSONB DEFAULT '{}',
  context_summary TEXT,
  -- Token tracking
  tokens_input    INT DEFAULT 0,
  tokens_output   INT DEFAULT 0,
  cost_usd        NUMERIC(10,6) DEFAULT 0,
  -- Results
  findings        JSONB DEFAULT '[]',
  actions_taken   JSONB DEFAULT '[]',
  summary         TEXT,
  error           TEXT,
  -- Timestamps
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_runs_type ON agent_runs(agent_type);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_created ON agent_runs(created_at DESC);

-- Cada step (chamada LLM) dentro de um run
CREATE TABLE IF NOT EXISTS agent_steps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  step_number   INT NOT NULL,
  model         TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'step',
  tokens_input  INT DEFAULT 0,
  tokens_output INT DEFAULT 0,
  cost_usd      NUMERIC(10,6) DEFAULT 0,
  response_text TEXT,
  tool_calls    JSONB DEFAULT '[]',
  duration_ms   INT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_steps_run ON agent_steps(run_id);

-- Expandir agent_queue com campos de payload
ALTER TABLE agent_queue ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES agent_runs(id);
ALTER TABLE agent_queue ADD COLUMN IF NOT EXISTS endpoint TEXT;
ALTER TABLE agent_queue ADD COLUMN IF NOT EXISTS method TEXT;
ALTER TABLE agent_queue ADD COLUMN IF NOT EXISTS payload JSONB;

-- RLS
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_runs_admin" ON agent_runs
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor')));

CREATE POLICY "agent_steps_admin" ON agent_steps
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor')));
