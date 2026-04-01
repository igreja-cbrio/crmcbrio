-- ================================================================
-- PMO CBRio — Schema PostgreSQL UNIFICADO
-- Versão: 2.0 (Definitiva)
-- Compila: PostgreSQL v1.0 + SQLite backend + novos módulos
-- Módulos: Auth, Eventos, Reuniões, Projetos Anuais, 
--          Expansão 2025-2029, Agentes IA, Sistema
-- ================================================================

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- ███ MÓDULO 1: AUTENTICAÇÃO & RBAC ███
-- ================================================================

-- Usuários do sistema com 3 perfis (diretor, admin, assistente)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    email           VARCHAR(200) UNIQUE NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'assistente'
                    CHECK (role IN ('diretor', 'admin', 'assistente')),
    password_hash   VARCHAR(200) NOT NULL,
    area            VARCHAR(100),
    active          BOOLEAN DEFAULT true,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Sessões de refresh token (para JWT refresh)
CREATE TABLE user_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token   VARCHAR(500) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- ███ MÓDULO 2: EVENTOS ███
-- ================================================================

-- Categorias de evento (dinâmicas, criadas pelo admin)
CREATE TABLE event_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    color           VARCHAR(7) NOT NULL DEFAULT '#00839D',
    sort_order      INTEGER DEFAULT 0,
    active          BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed de categorias padrão da CBRio
INSERT INTO event_categories (name, color, sort_order) VALUES
    ('Evento Especial',    '#2E7D32', 1),
    ('Rotina de Liturgia', '#1565C0', 2),
    ('Rotina Staff',       '#4FC3F7', 3),
    ('Feriado',            '#F9A825', 4),
    ('Geracional',         '#E91E63', 5),
    ('Grupos',             '#00839D', 6);

-- Eventos da igreja
CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(300) NOT NULL,
    date            DATE NOT NULL,
    category_id     UUID REFERENCES event_categories(id) ON DELETE SET NULL,
    status          VARCHAR(20) DEFAULT 'no-prazo'
                    CHECK (status IN ('no-prazo', 'em-risco', 'atrasado', 'concluido')),
    description     TEXT,
    location        VARCHAR(300),
    responsible     VARCHAR(200),
    budget_planned  DECIMAL(12,2) DEFAULT 0,
    budget_spent    DECIMAL(12,2) DEFAULT 0,
    expected_attendance INTEGER,
    actual_attendance   INTEGER,
    recurrence      VARCHAR(20) DEFAULT 'unico'
                    CHECK (recurrence IN (
                        'unico', 'semanal', 'quinzenal', 'mensal',
                        'bimestral', 'trimestral', 'semestral', 'anual'
                    )),
    notes           TEXT,
    lessons_learned TEXT,
    -- Vínculo opcional com projeto anual
    project_id      UUID,  -- FK adicionada após criação da tabela projects
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Ocorrências individuais de eventos recorrentes
-- Cada ocorrência tem vida própria: status, notas, reuniões
CREATE TABLE event_occurrences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    status          VARCHAR(20) DEFAULT 'pendente'
                    CHECK (status IN ('pendente', 'concluido')),
    notes           TEXT,
    lessons_learned TEXT,
    attendance      INTEGER,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (event_id, date)
);

-- Tarefas vinculadas a eventos
CREATE TABLE event_tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name            VARCHAR(300) NOT NULL,
    responsible     VARCHAR(200),
    area            VARCHAR(100),
    start_date      DATE,
    deadline        DATE,
    status          VARCHAR(20) DEFAULT 'pendente'
                    CHECK (status IN ('pendente', 'em-andamento', 'concluida', 'bloqueada')),
    priority        VARCHAR(20) DEFAULT 'media'
                    CHECK (priority IN ('urgente', 'alta', 'media', 'baixa')),
    is_milestone    BOOLEAN DEFAULT false,
    description     TEXT,
    sort_order      INTEGER DEFAULT 0,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Dependências entre tarefas de evento
CREATE TABLE event_task_dependencies (
    task_id         UUID NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
    depends_on_id   UUID NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, depends_on_id),
    CHECK (task_id != depends_on_id)
);

-- Subtarefas de evento (checklist)
CREATE TABLE event_task_subtasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
    name            VARCHAR(300) NOT NULL,
    done            BOOLEAN DEFAULT false,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Comentários em tarefas de evento
CREATE TABLE event_task_comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
    author_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name     VARCHAR(200) NOT NULL DEFAULT 'PMO',
    text            TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Links/anexos de tarefas de evento
CREATE TABLE event_task_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
    label           VARCHAR(200),
    url             TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- ███ MÓDULO 3: REUNIÕES ███
-- ================================================================

-- Reuniões vinculadas a eventos (e opcionalmente a uma ocorrência)
CREATE TABLE meetings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    occurrence_id   UUID REFERENCES event_occurrences(id) ON DELETE SET NULL,
    project_id      UUID,  -- FK adicionada após tabela projects
    title           VARCHAR(300) DEFAULT 'Reunião',
    date            DATE NOT NULL,
    occurrence_date DATE,
    participants    TEXT[],
    decisions       TEXT,
    notes           TEXT,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Pendências geradas em reuniões
CREATE TABLE pendencies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
    meeting_id      UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    project_id      UUID,  -- FK adicionada após tabela projects
    description     TEXT NOT NULL,
    responsible     VARCHAR(200),
    area            VARCHAR(100),
    deadline        DATE,
    done            BOOLEAN DEFAULT false,
    done_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- ███ MÓDULO 4: PROJETOS ANUAIS ███
-- (NOVO — elo entre eventos e planejamento estratégico)
-- ================================================================

-- Projetos anuais agrupam eventos, tarefas e objetivos de um ano
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(300) NOT NULL,
    year            INTEGER NOT NULL,
    description     TEXT,
    status          VARCHAR(20) DEFAULT 'planejamento'
                    CHECK (status IN (
                        'planejamento', 'em-andamento', 'concluido', 'cancelado'
                    )),
    owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    area            VARCHAR(100),
    start_date      DATE,
    end_date        DATE,
    budget_planned  DECIMAL(12,2) DEFAULT 0,
    budget_spent    DECIMAL(12,2) DEFAULT 0,
    -- Vínculo opcional com marco de expansão
    milestone_id    UUID,  -- FK adicionada após tabela expansion_milestones
    priority        VARCHAR(20) DEFAULT 'media'
                    CHECK (priority IN ('urgente', 'alta', 'media', 'baixa')),
    notes           TEXT,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Objetivos/metas de um projeto anual (OKR simplificado)
CREATE TABLE project_objectives (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(300) NOT NULL,
    description     TEXT,
    target_value    DECIMAL(12,2),
    current_value   DECIMAL(12,2) DEFAULT 0,
    unit            VARCHAR(50),          -- '%', 'R$', 'pessoas', 'eventos'
    deadline        DATE,
    status          VARCHAR(20) DEFAULT 'pendente'
                    CHECK (status IN ('pendente', 'em-andamento', 'concluido', 'cancelado')),
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Tarefas de projeto (independentes de eventos)
CREATE TABLE project_tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    objective_id    UUID REFERENCES project_objectives(id) ON DELETE SET NULL,
    name            VARCHAR(300) NOT NULL,
    responsible     VARCHAR(200),
    area            VARCHAR(100),
    start_date      DATE,
    deadline        DATE,
    status          VARCHAR(20) DEFAULT 'pendente'
                    CHECK (status IN ('pendente', 'em-andamento', 'concluida', 'bloqueada')),
    priority        VARCHAR(20) DEFAULT 'media'
                    CHECK (priority IN ('urgente', 'alta', 'media', 'baixa')),
    description     TEXT,
    pct             INTEGER DEFAULT 0 CHECK (pct >= 0 AND pct <= 100),
    sort_order      INTEGER DEFAULT 0,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Subtarefas de projeto
CREATE TABLE project_task_subtasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
    name            VARCHAR(300) NOT NULL,
    done            BOOLEAN DEFAULT false,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Marcos/checkpoints do projeto anual
CREATE TABLE project_milestones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(300) NOT NULL,
    date            DATE NOT NULL,
    description     TEXT,
    done            BOOLEAN DEFAULT false,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- ███ MÓDULO 5: EXPANSÃO 2025-2029 ███
-- ================================================================

-- Marcos do plano de expansão (ex: "Compra do terreno", "Projeto arquitetônico")
CREATE TABLE expansion_milestones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(300) NOT NULL,
    description     TEXT,
    deadline        DATE,
    phase           VARCHAR(50),          -- "2025", "2026", "2027-2029"
    budget_planned  DECIMAL(12,2) DEFAULT 0,
    budget_spent    DECIMAL(12,2) DEFAULT 0,
    sort_order      INTEGER DEFAULT 0,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Tarefas dentro de marcos de expansão
CREATE TABLE expansion_tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id    UUID NOT NULL REFERENCES expansion_milestones(id) ON DELETE CASCADE,
    name            VARCHAR(300) NOT NULL,
    responsible     VARCHAR(200),
    area            VARCHAR(100),
    start_date      DATE,
    deadline        DATE,
    status          VARCHAR(20) DEFAULT 'pendente'
                    CHECK (status IN ('pendente', 'em-andamento', 'concluida', 'bloqueada')),
    description     TEXT,
    sort_order      INTEGER DEFAULT 0,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Subtarefas de expansão com % de conclusão individual
CREATE TABLE expansion_subtasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES expansion_tasks(id) ON DELETE CASCADE,
    name            VARCHAR(300) NOT NULL,
    pct             INTEGER DEFAULT 0 CHECK (pct >= 0 AND pct <= 100),
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- ███ MÓDULO 6: AGENTES IA ███
-- ================================================================

-- Fila de aprovações dos agentes (human-in-the-loop)
CREATE TABLE agent_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent           VARCHAR(50) NOT NULL
                    CHECK (agent IN ('transcriber', 'monitor', 'progress', 'reporter')),
    type            VARCHAR(50) NOT NULL
                    CHECK (type IN ('meeting', 'task', 'status_change', 'alert', 'report')),
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
    event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
    label           VARCHAR(300),
    preview         TEXT,
    payload         JSONB NOT NULL DEFAULT '{}',
    reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at     TIMESTAMPTZ
);

-- Log de atividades dos agentes
CREATE TABLE agent_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent           VARCHAR(50) NOT NULL,
    action          TEXT NOT NULL,
    event_name      VARCHAR(300),
    project_name    VARCHAR(300),
    details         JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- ███ MÓDULO 7: SISTEMA ███
-- ================================================================

-- Log de auditoria geral
CREATE TABLE activity_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(50),
    entity_id       UUID,
    entity_name     VARCHAR(300),
    old_value       JSONB,
    new_value       JSONB,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Notificações do sistema
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) DEFAULT 'info'
                    CHECK (type IN ('info', 'warning', 'alert', 'success')),
    title           VARCHAR(300),
    message         TEXT NOT NULL,
    link            VARCHAR(500),
    read            BOOLEAN DEFAULT false,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Configurações do sistema (key-value)
CREATE TABLE system_settings (
    key             VARCHAR(100) PRIMARY KEY,
    value           TEXT NOT NULL,
    description     VARCHAR(300),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed de configurações padrão
INSERT INTO system_settings (key, value, description) VALUES
    ('org_name', 'CBRio', 'Nome da organização'),
    ('org_full_name', 'Comunidade Batista do Rio', 'Nome completo'),
    ('fiscal_year_start', '01-01', 'Início do ano fiscal (MM-DD)'),
    ('risk_threshold_days', '7', 'Dias antes do prazo para marcar em-risco'),
    ('late_threshold_days', '0', 'Dias após prazo para marcar atrasado');

-- ================================================================
-- ███ FOREIGN KEYS CRUZADAS (entre módulos) ███
-- ================================================================

-- events.project_id → projects
ALTER TABLE events
    ADD CONSTRAINT fk_events_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- meetings.project_id → projects
ALTER TABLE meetings
    ADD CONSTRAINT fk_meetings_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- pendencies.project_id → projects
ALTER TABLE pendencies
    ADD CONSTRAINT fk_pendencies_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- projects.milestone_id → expansion_milestones
ALTER TABLE projects
    ADD CONSTRAINT fk_projects_expansion_milestone
    FOREIGN KEY (milestone_id) REFERENCES expansion_milestones(id) ON DELETE SET NULL;

-- ================================================================
-- ███ VIEWS (consultas pré-prontas) ███
-- ================================================================

-- Dashboard: eventos com categoria e contagem de tarefas
CREATE OR REPLACE VIEW v_events_dashboard AS
SELECT
    e.id,
    e.name,
    e.date,
    e.status,
    e.recurrence,
    e.responsible,
    e.budget_planned,
    e.budget_spent,
    ec.name AS category_name,
    ec.color AS category_color,
    p.name AS project_name,
    COUNT(DISTINCT et.id) AS total_tasks,
    COUNT(DISTINCT et.id) FILTER (WHERE et.status = 'concluida') AS completed_tasks,
    COUNT(DISTINCT m.id) AS total_meetings,
    COUNT(DISTINCT pd.id) FILTER (WHERE pd.done = false) AS open_pendencies,
    COUNT(DISTINCT eo.id) AS total_occurrences,
    COUNT(DISTINCT eo.id) FILTER (WHERE eo.status = 'concluido') AS completed_occurrences
FROM events e
LEFT JOIN event_categories ec ON e.category_id = ec.id
LEFT JOIN projects p ON e.project_id = p.id
LEFT JOIN event_tasks et ON et.event_id = e.id
LEFT JOIN meetings m ON m.event_id = e.id
LEFT JOIN pendencies pd ON pd.event_id = e.id
LEFT JOIN event_occurrences eo ON eo.event_id = e.id
GROUP BY e.id, ec.name, ec.color, p.name;

-- Dashboard: projetos anuais com progresso
CREATE OR REPLACE VIEW v_projects_dashboard AS
SELECT
    p.id,
    p.name,
    p.year,
    p.status,
    p.area,
    p.budget_planned,
    p.budget_spent,
    p.priority,
    em.name AS expansion_milestone_name,
    u.name AS owner_name,
    COUNT(DISTINCT pt.id) AS total_tasks,
    COUNT(DISTINCT pt.id) FILTER (WHERE pt.status = 'concluida') AS completed_tasks,
    COALESCE(AVG(pt.pct), 0)::INTEGER AS avg_progress,
    COUNT(DISTINCT po.id) AS total_objectives,
    COUNT(DISTINCT po.id) FILTER (WHERE po.status = 'concluido') AS completed_objectives,
    COUNT(DISTINCT ev.id) AS linked_events
FROM projects p
LEFT JOIN expansion_milestones em ON p.milestone_id = em.id
LEFT JOIN users u ON p.owner_id = u.id
LEFT JOIN project_tasks pt ON pt.project_id = p.id
LEFT JOIN project_objectives po ON po.project_id = p.id
LEFT JOIN events ev ON ev.project_id = p.id
GROUP BY p.id, em.name, u.name;

-- Dashboard: expansão com progresso cascateado
CREATE OR REPLACE VIEW v_expansion_dashboard AS
SELECT
    mi.id,
    mi.name,
    mi.phase,
    mi.deadline,
    mi.budget_planned,
    mi.budget_spent,
    COUNT(DISTINCT t.id) AS total_tasks,
    COALESCE(
        AVG(
            COALESCE(sub_avg.avg_pct, 0)
        ), 0
    )::INTEGER AS overall_pct,
    COUNT(DISTINCT pr.id) AS linked_projects
FROM expansion_milestones mi
LEFT JOIN expansion_tasks t ON t.milestone_id = mi.id
LEFT JOIN (
    SELECT task_id, AVG(pct)::INTEGER AS avg_pct
    FROM expansion_subtasks
    GROUP BY task_id
) sub_avg ON sub_avg.task_id = t.id
LEFT JOIN projects pr ON pr.milestone_id = mi.id
GROUP BY mi.id;

-- Pendências abertas por área (para radar do PMO)
CREATE OR REPLACE VIEW v_pendencies_by_area AS
SELECT
    COALESCE(pd.area, 'Sem área') AS area,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE pd.deadline < CURRENT_DATE AND pd.done = false) AS overdue,
    COUNT(*) FILTER (WHERE pd.done = false) AS open,
    COUNT(*) FILTER (WHERE pd.done = true) AS done
FROM pendencies pd
GROUP BY COALESCE(pd.area, 'Sem área')
ORDER BY overdue DESC, open DESC;

-- Carga por responsável (radar de sobrecarga)
CREATE OR REPLACE VIEW v_workload_by_responsible AS
SELECT
    responsible,
    'evento' AS source,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status IN ('pendente', 'em-andamento')) AS active,
    COUNT(*) FILTER (WHERE status = 'concluida') AS done,
    COUNT(*) FILTER (WHERE priority = 'urgente') AS urgent
FROM event_tasks
WHERE responsible IS NOT NULL AND responsible != ''
GROUP BY responsible
UNION ALL
SELECT
    responsible,
    'projeto' AS source,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status IN ('pendente', 'em-andamento')) AS active,
    COUNT(*) FILTER (WHERE status = 'concluida') AS done,
    COUNT(*) FILTER (WHERE priority = 'urgente') AS urgent
FROM project_tasks
WHERE responsible IS NOT NULL AND responsible != ''
GROUP BY responsible
UNION ALL
SELECT
    responsible,
    'expansao' AS source,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status IN ('pendente', 'em-andamento')) AS active,
    COUNT(*) FILTER (WHERE status = 'concluida') AS done,
    0 AS urgent
FROM expansion_tasks
WHERE responsible IS NOT NULL AND responsible != ''
GROUP BY responsible;

-- ================================================================
-- ███ FUNCTIONS ███
-- ================================================================

-- Função: atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função: calcular status automático de evento por prazo
CREATE OR REPLACE FUNCTION fn_auto_event_status()
RETURNS TRIGGER AS $$
DECLARE
    risk_days INTEGER;
BEGIN
    -- Não alterar se já está concluido
    IF NEW.status = 'concluido' THEN
        RETURN NEW;
    END IF;

    -- Buscar threshold de risco nas configurações
    SELECT COALESCE(value::INTEGER, 7) INTO risk_days
    FROM system_settings WHERE key = 'risk_threshold_days';

    -- Calcular status baseado na data
    IF NEW.date < CURRENT_DATE THEN
        NEW.status := 'atrasado';
    ELSIF NEW.date <= CURRENT_DATE + (risk_days || ' days')::INTERVAL THEN
        NEW.status := 'em-risco';
    ELSE
        NEW.status := 'no-prazo';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função: registrar atividade no log de auditoria
CREATE OR REPLACE FUNCTION fn_log_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO activity_log (action, entity_type, entity_id, new_value)
        VALUES ('create', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO activity_log (action, entity_type, entity_id, old_value, new_value)
        VALUES ('update', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO activity_log (action, entity_type, entity_id, old_value)
        VALUES ('delete', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- ███ TRIGGERS ███
-- ================================================================

-- Auto-update timestamp em todas as tabelas com updated_at
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_events_updated BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_event_occurrences_updated BEFORE UPDATE ON event_occurrences
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_event_tasks_updated BEFORE UPDATE ON event_tasks
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_meetings_updated BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_project_objectives_updated BEFORE UPDATE ON project_objectives
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_project_tasks_updated BEFORE UPDATE ON project_tasks
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_expansion_milestones_updated BEFORE UPDATE ON expansion_milestones
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_expansion_tasks_updated BEFORE UPDATE ON expansion_tasks
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Auto-status de evento (calcula no-prazo/em-risco/atrasado)
CREATE TRIGGER trg_events_auto_status BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION fn_auto_event_status();

-- Auditoria em tabelas críticas
CREATE TRIGGER trg_events_audit AFTER INSERT OR UPDATE OR DELETE ON events
    FOR EACH ROW EXECUTE FUNCTION fn_log_activity();

CREATE TRIGGER trg_projects_audit AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION fn_log_activity();

CREATE TRIGGER trg_expansion_milestones_audit AFTER INSERT OR UPDATE OR DELETE ON expansion_milestones
    FOR EACH ROW EXECUTE FUNCTION fn_log_activity();

CREATE TRIGGER trg_agent_queue_audit AFTER UPDATE ON agent_queue
    FOR EACH ROW EXECUTE FUNCTION fn_log_activity();

-- ================================================================
-- ███ ÍNDICES DE PERFORMANCE ███
-- ================================================================

-- Autenticação
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(refresh_token);

-- Eventos
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_category ON events(category_id);
CREATE INDEX idx_events_project ON events(project_id);
CREATE INDEX idx_events_recurrence ON events(recurrence);

-- Ocorrências
CREATE INDEX idx_event_occurrences_event ON event_occurrences(event_id);
CREATE INDEX idx_event_occurrences_date ON event_occurrences(date);
CREATE INDEX idx_event_occurrences_status ON event_occurrences(status);

-- Tarefas de evento
CREATE INDEX idx_event_tasks_event ON event_tasks(event_id);
CREATE INDEX idx_event_tasks_status ON event_tasks(status);
CREATE INDEX idx_event_tasks_deadline ON event_tasks(deadline);
CREATE INDEX idx_event_tasks_responsible ON event_tasks(responsible);
CREATE INDEX idx_event_tasks_priority ON event_tasks(priority);

-- Subtarefas e comentários
CREATE INDEX idx_event_task_subtasks_task ON event_task_subtasks(task_id);
CREATE INDEX idx_event_task_comments_task ON event_task_comments(task_id);

-- Reuniões
CREATE INDEX idx_meetings_event ON meetings(event_id);
CREATE INDEX idx_meetings_occurrence ON meetings(occurrence_id);
CREATE INDEX idx_meetings_project ON meetings(project_id);
CREATE INDEX idx_meetings_date ON meetings(date);

-- Pendências
CREATE INDEX idx_pendencies_event ON pendencies(event_id);
CREATE INDEX idx_pendencies_meeting ON pendencies(meeting_id);
CREATE INDEX idx_pendencies_project ON pendencies(project_id);
CREATE INDEX idx_pendencies_done ON pendencies(done);
CREATE INDEX idx_pendencies_deadline ON pendencies(deadline);

-- Projetos anuais
CREATE INDEX idx_projects_year ON projects(year);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_milestone ON projects(milestone_id);
CREATE INDEX idx_projects_owner ON projects(owner_id);

-- Objetivos
CREATE INDEX idx_project_objectives_project ON project_objectives(project_id);

-- Tarefas de projeto
CREATE INDEX idx_project_tasks_project ON project_tasks(project_id);
CREATE INDEX idx_project_tasks_objective ON project_tasks(objective_id);
CREATE INDEX idx_project_tasks_status ON project_tasks(status);
CREATE INDEX idx_project_tasks_deadline ON project_tasks(deadline);
CREATE INDEX idx_project_tasks_responsible ON project_tasks(responsible);

-- Marcos de projeto
CREATE INDEX idx_project_milestones_project ON project_milestones(project_id);

-- Expansão
CREATE INDEX idx_expansion_tasks_milestone ON expansion_tasks(milestone_id);
CREATE INDEX idx_expansion_tasks_status ON expansion_tasks(status);
CREATE INDEX idx_expansion_subtasks_task ON expansion_subtasks(task_id);

-- Agentes
CREATE INDEX idx_agent_queue_status ON agent_queue(status);
CREATE INDEX idx_agent_queue_agent ON agent_queue(agent);
CREATE INDEX idx_agent_log_agent ON agent_log(agent);
CREATE INDEX idx_agent_log_created ON agent_log(created_at);

-- Sistema
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- ================================================================
-- ███ SEED: USUÁRIOS INICIAIS ███
-- ================================================================

-- Senhas: usar bcrypt no backend (custo 12)
-- Aqui são placeholders — o seed real roda via script Node.js
-- INSERT INTO users (name, email, role, password_hash) VALUES
--     ('Diretor', 'diretor@cbrio.com.br', 'diretor', '$BCRYPT_HASH'),
--     ('Administração', 'admin@cbrio.com.br', 'admin', '$BCRYPT_HASH'),
--     ('Assistente', 'assistente@cbrio.com.br', 'assistente', '$BCRYPT_HASH');

-- ================================================================
-- RESUMO DO SCHEMA
-- ================================================================
-- 
-- 25 tabelas:
--   Auth:      users, user_sessions (2)
--   Eventos:   event_categories, events, event_occurrences,
--              event_tasks, event_task_dependencies,
--              event_task_subtasks, event_task_comments,
--              event_task_links (8)
--   Reuniões:  meetings, pendencies (2)
--   Projetos:  projects, project_objectives, project_tasks,
--              project_task_subtasks, project_milestones (5)
--   Expansão:  expansion_milestones, expansion_tasks,
--              expansion_subtasks (3)
--   Agentes:   agent_queue, agent_log (2)
--   Sistema:   activity_log, notifications, system_settings (3)
--   Junctions: event_task_dependencies (inclusa em Eventos)
--
-- 5 views:
--   v_events_dashboard, v_projects_dashboard,
--   v_expansion_dashboard, v_pendencies_by_area,
--   v_workload_by_responsible
--
-- 3 functions:
--   fn_update_timestamp, fn_auto_event_status, fn_log_activity
--
-- 14 triggers:
--   10 auto-timestamp, 1 auto-status, 4 auditoria
--
-- 48 índices de performance
-- ================================================================
