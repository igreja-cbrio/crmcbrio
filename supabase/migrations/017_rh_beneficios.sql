-- ============================================================
-- 017_rh_beneficios.sql
-- Campos de benefícios e remuneração complementar
-- ============================================================

ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS complemento_salario NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS alimentacao NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS transporte NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS saude NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS seguro_vida NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS educacao NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS saldo_livre NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS plano_saude NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS gratificacao NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS adicional_nivel NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS participacao_comite NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS veiculo NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS adicional_pastores NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS adicional_lideranca NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS adicional_pulpito NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS bonus_anual_50 NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS bonus_anual_integral NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS ferias_integral NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS remuneracao_bruta NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS remuneracao_liquida NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS fgts NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS ir NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS inss NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rh_funcionarios ADD COLUMN IF NOT EXISTS custo_total_mensal NUMERIC(12,2) DEFAULT 0;
