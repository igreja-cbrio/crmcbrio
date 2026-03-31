# PMO CBRio — Sistema de Gestão de Projetos

## Visão geral

Sistema web para o PMO (Project Management Office) da Igreja Comunidade Batista do Rio (CBRio, Barra da Tijuca, RJ). Gerencia **eventos da igreja**, **projetos anuais por área ministerial**, e o **plano de expansão 2025-2029**.

O PMO é operado por uma pessoa (Marcos Paulo) que centraliza informações, identifica gargalos entre áreas, monitora prazos e entregas, e reporta à liderança. O sistema é o radar central que dá visibilidade a tudo.

---

## Stack técnico

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 18 + Vite 6 |
| **Backend** | Node.js + Express 4 |
| **Banco de dados** | PostgreSQL (25 tabelas, 5 views, 3 functions, 14 triggers, 48+ índices) |
| **Autenticação** | JWT + bcrypt (RBAC com 3 perfis) |
| **IA** | Anthropic API (Claude) via proxy no backend |
| **Deploy target** | VPS Linux com Nginx + PM2 |

---

## Estrutura do projeto

```
cbrio-pmo/
├── backend/
│   ├── server.js                 ← Express principal (middleware, rotas, error handler)
│   ├── package.json
│   ├── .env.example              ← Template de variáveis de ambiente
│   ├── nginx-cbrio.conf          ← Config do Nginx para produção
│   ├── middleware/
│   │   └── auth.js               ← JWT verify + RBAC authorize()
│   ├── routes/
│   │   ├── auth.js               ← Login, /me
│   │   ├── events.js             ← CRUD eventos + tarefas + ocorrências + subtarefas + comentários
│   │   ├── projects.js           ← CRUD projetos + objetivos + tarefas + marcos + views PMO
│   │   ├── expansion.js          ← CRUD marcos expansão + tarefas + subtarefas com %
│   │   ├── meetings.js           ← CRUD reuniões + pendências
│   │   └── agents.js             ← Proxy Anthropic API + fila de aprovação + log
│   └── utils/
│       ├── db.js                 ← Pool PostgreSQL + helpers query/transaction
│       ├── sanitize.js           ← XSS escape + UUID validation + audit log
│       └── seed.js               ← Cria 3 usuários iniciais com bcrypt
├── frontend/
│   ├── package.json
│   ├── vite.config.js            ← Proxy /api → localhost:3001 em dev
│   ├── index.html
│   └── src/
│       ├── main.jsx              ← Entry point React
│       ├── api.js                ← Client HTTP com JWT auto (setToken, clearToken, todos os endpoints)
│       └── App.jsx               ← App completo (Login, Sidebar, Events, Projects, Expansion, Agents)
├── cbrio-pmo-schema.sql          ← Schema PostgreSQL unificado v2.0 (DDL completo)
├── .gitignore
└── README.md                     ← Este arquivo
```

---

## Módulos do sistema

### 1. Eventos (módulo principal)
- CRUD de eventos com categorias coloridas (Evento Especial, Rotina de Liturgia, Rotina Staff, Feriado, Geracional, Grupos)
- Recorrência (único, semanal, mensal, bimestral, trimestral, semestral)
- **Ocorrências individuais**: cada data de um evento recorrente tem status, notas e lições aprendidas próprias
- Tarefas com prioridade (urgente/alta/média/baixa), status (pendente/em-andamento/concluída/bloqueada), subtarefas, comentários, links
- Dependências entre tarefas
- Marcos (milestones) dentro de eventos
- Orçamento planejado vs realizado
- Auto-status calculado por trigger (no-prazo → em-risco → atrasado baseado na data)
- Calendário visual com bolinhas coloridas por categoria

### 2. Projetos Anuais (NOVO)
- Projetos agrupados por ano e área ministerial
- Objetivos/OKRs simplificados (meta numérica + progresso atual)
- Tarefas com % de conclusão individual
- Marcos/checkpoints do projeto
- Vinculação bidirecional com eventos (um projeto pode ter vários eventos)
- Vinculação com marcos de expansão (projeto alimentado pelo plano estratégico)
- Dashboard com progresso médio

### 3. Expansão 2025-2029
- Marcos do plano de expansão (fases anuais)
- Tarefas por marco
- Subtarefas com slider de % individual
- Progresso cascateado: subtarefas → tarefas → marco
- Orçamento por fase
- Projetos anuais vinculados a marcos

### 4. Reuniões
- Vinculadas a eventos ou projetos
- Vinculadas opcionalmente a uma ocorrência específica de evento recorrente
- Participantes, decisões, notas
- Pendências com responsável, prazo e status de conclusão

### 5. Agentes IA
- Proxy seguro para Anthropic API (chave nunca exposta ao frontend)
- Fila de aprovação human-in-the-loop (sugestões → pendente → aprovado/rejeitado)
- Log de todas as ações de IA
- Rate limiting específico (10 req/15min)
- 4 agentes planejados: Transcritor, Monitor, Progresso, Relator

### 6. Sistema
- Auditoria automática via triggers em tabelas críticas
- Notificações
- Configurações dinâmicas (threshold de risco, nome da org)
- Health check endpoint

---

## RBAC (Controle de acesso)

| Permissão | Assistente | Administração | Diretor |
|-----------|-----------|---------------|---------|
| Ver eventos | ✅ | ✅ | ✅ |
| Ver projetos | ❌ | ✅ | ✅ |
| Ver expansão | ❌ | ✅ | ✅ |
| Criar/editar/excluir | ❌ | ❌ | ✅ |
| Agentes IA | ❌ | ❌ | ✅ |
| Relatórios | ❌ | ❌ | ✅ |
| Backup | ❌ | ❌ | ✅ |

**Credenciais padrão (seed):**
- Diretor: `diretor@cbrio.com.br` / `diretor`
- Admin: `admin@cbrio.com.br` / `admin`
- Assistente: `assistente@cbrio.com.br` / `123`

---

## Banco de dados (PostgreSQL)

### Tabelas (25)

**Auth (2):** `users`, `user_sessions`

**Eventos (8):** `event_categories`, `events`, `event_occurrences`, `event_tasks`, `event_task_dependencies`, `event_task_subtasks`, `event_task_comments`, `event_task_links`

**Reuniões (2):** `meetings`, `pendencies`

**Projetos (5):** `projects`, `project_objectives`, `project_tasks`, `project_task_subtasks`, `project_milestones`

**Expansão (3):** `expansion_milestones`, `expansion_tasks`, `expansion_subtasks`

**Agentes (2):** `agent_queue`, `agent_log`

**Sistema (3):** `activity_log`, `notifications`, `system_settings`

### Views otimizadas (5)
- `v_events_dashboard` — Eventos com categoria, contagem de tarefas/reuniões/pendências
- `v_projects_dashboard` — Projetos com progresso médio e vínculos
- `v_expansion_dashboard` — Marcos com % cascateado
- `v_pendencies_by_area` — Radar do PMO: pendências por área
- `v_workload_by_responsible` — Carga de trabalho consolidada

### Relacionamentos entre módulos
- `events.project_id → projects` (evento vinculado a projeto)
- `projects.milestone_id → expansion_milestones` (projeto alimentado pelo plano)
- `meetings.project_id → projects` (reunião de projeto)
- `pendencies.project_id → projects` (pendência de projeto)

---

## Como rodar localmente

### Pré-requisitos
- Node.js 20+
- PostgreSQL 14+
- Git

### Setup

```bash
# 1. Clonar
git clone <repo-url>
cd cbrio-pmo

# 2. Criar banco
psql -U postgres -c "CREATE USER cbrio WITH PASSWORD 'cbrio123';"
psql -U postgres -c "CREATE DATABASE cbrio_pmo OWNER cbrio;"
psql -U cbrio -d cbrio_pmo -f cbrio-pmo-schema.sql

# 3. Backend
cd backend
cp .env.example .env
# Editar .env com DATABASE_URL=postgresql://cbrio:cbrio123@localhost:5432/cbrio_pmo
npm install
npm run seed    # Cria os 3 usuários

# 4. Frontend
cd ../frontend
npm install

# 5. Rodar (dois terminais)
# Terminal 1:
cd backend && npm run dev
# Terminal 2:
cd frontend && npm run dev

# 6. Abrir http://localhost:5173
```

---

## Deploy em VPS

```bash
# Na VPS (Ubuntu 24)
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs postgresql postgresql-contrib nginx git certbot python3-certbot-nginx
npm install -g pm2

# Banco
sudo -u postgres psql
# CREATE USER cbrio WITH PASSWORD 'SENHA_FORTE';
# CREATE DATABASE cbrio_pmo OWNER cbrio;
# \q
psql -U cbrio -d cbrio_pmo -f cbrio-pmo-schema.sql

# Código
cd /root && git clone <repo> cbrio-pmo && cd cbrio-pmo
cd backend && cp .env.example .env && nano .env  # preencher
npm install && npm run seed
cd ../frontend && npm install && npm run build

# PM2
cd /root/cbrio-pmo/backend
pm2 start server.js --name cbrio-pmo && pm2 save && pm2 startup

# Nginx
cp /root/cbrio-pmo/backend/nginx-cbrio.conf /etc/nginx/sites-available/cbrio
ln -s /etc/nginx/sites-available/cbrio /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# HTTPS
certbot --nginx -d seudominio.com.br
```

---

## Segurança implementada

- **XSS**: `sanitizeObj()` escapa HTML em todas as entradas
- **SQL Injection**: Queries 100% parametrizadas ($1, $2...), zero concatenação
- **Auth**: bcrypt custo 12 + JWT com expiração + RBAC enforced no servidor
- **Rate limiting**: Global (100/15min), login (5/15min), IA (10/15min)
- **Headers**: Helmet + Nginx (CSP, HSTS, X-Frame, X-Content-Type, Referrer-Policy)
- **API key**: Anthropic key fica exclusivamente no .env do servidor, proxied via /api/agents
- **Auditoria**: Triggers registram create/update/delete em tabelas críticas

---

## Princípios de design

1. **Human-in-the-loop**: Sugestões de IA nunca auto-aplicam. Tudo passa pela fila de aprovação.
2. **Autoridade consultiva**: O PMO não tem autoridade diretiva. O sistema escala informações, não toma decisões.
3. **Ocorrências individuais**: Cada vez que um evento recorrente acontece, tem vida própria (status, notas, reuniões).
4. **Três elos**: Expansão → Projetos → Eventos formam uma hierarquia natural do estratégico ao operacional.

---

## Funcionalidades planejadas (backlog)

- [ ] Gantt view (timeline visual de tarefas)
- [ ] CSV import de eventos e projetos
- [ ] Templates de evento (duplicar com recálculo de datas)
- [ ] Aba pós-evento (planejado vs realizado + lições aprendidas)
- [ ] Notificações push / email
- [ ] Dashboard financeiro por área
- [ ] Integração opensquad para automação de agentes
- [ ] Visão de carga por responsável (gráfico)
- [ ] Matriz de riscos por evento
- [ ] Export PDF de relatórios

---

## Variáveis de ambiente (.env)

```
DATABASE_URL=postgresql://cbrio:SENHA@localhost:5432/cbrio_pmo
JWT_SECRET=chave_longa_aleatoria_64_chars
JWT_EXPIRES_IN=8h
PORT=3001
NODE_ENV=development|production
ANTHROPIC_API_KEY=sk-ant-... (opcional)
FRONTEND_URL=http://localhost:5173
RATE_LIMIT_MAX=100
LOGIN_RATE_LIMIT_MAX=5
AI_RATE_LIMIT_MAX=10
```

---

## Contexto organizacional

- **Organização**: Igreja Comunidade Batista do Rio (CBRio), Barra da Tijuca, RJ
- **Áreas ministeriais**: Louvor, Jovens, Crianças, Comunicação, Infraestrutura, Financeiro, etc.
- **Categorias de evento**: Evento Especial (#2E7D32), Rotina de Liturgia (#1565C0), Rotina Staff (#4FC3F7), Feriado (#F9A825), Geracional (#E91E63), Grupos (#00839D)
- **Calendário**: ~50 eventos/ano (9 recorrentes + 41 únicos)
- **Identidade visual**: Palette CBRio — accent #00839D (teal profundo), fundo claro cream/sand
- **Ferramentas existentes**: Google Workspace
