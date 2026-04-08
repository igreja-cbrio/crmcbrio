# CLAUDE.md — CBRio ERP

Guia para Claude Code e agentes de IA trabalhando neste repositório.
Atualizado em: 2026-04-08 (v10.1) — Fix upload SharePoint via CompletionSection + ensureFolder + token cache unificado

---

## Regras de UI/Design — OBRIGATÓRIO

> **⚠️ SEMPRE que for gerar ou alterar componentes visuais, consultar os MCPs de design ANTES de escrever código.**

### MCPs de Design Disponíveis
- **21st.dev Magic MCP** (`magic`): para gerar layouts completos e profissionais do zero — usar como referência principal de design moderno
- **shadcn-ui MCP** (`shadcn-ui`): para componentes (Button, Card, Dialog, Table, etc.) com props e variantes corretos do registry oficial
- **Magic UI MCP** (`magic-ui`): para animações e efeitos visuais (shimmer, blur fade, marquee, grid patterns, particle backgrounds)
- **TailwindCSS MCP** (`tailwindcss`): para classes Tailwind v4 corretas e conversão CSS→Tailwind

### Diretrizes de Design
- Design limpo, profissional e consistente em todo o sistema
- Seguir o design system existente (CSS variables `--cbrio-*`, dark/light mode)
- Priorizar componentes shadcn/ui já existentes no projeto antes de criar novos
- Usar animações do Magic UI para dar polish visual (KPI cards, loading states, transições)
- Ao criar layouts novos, usar 21st.dev Magic como inspiração de design moderno
- Manter responsividade e acessibilidade em todos os componentes
- Nunca usar cores hardcoded — sempre CSS variables ou classes Tailwind

---

## Visão Geral do Projeto

Sistema ERP interno da Igreja CBRio. Arquitetura modular com React + Express + Supabase.

**Repositório:** `https://github.com/igreja-cbrio/crmcbrio`
**Deploy:** https://crmcbrio.vercel.app (frontend + backend serverless)
**Devs ativos:** Matheus Toscano e Marcos Paulo (cada um em um módulo por vez)

---

## Stack

| Camada    | Tecnologia                                           |
|-----------|-----------------------------------------------------|
| Frontend  | React 18 + TypeScript + Vite + React Router v7      |
| Estilo    | Tailwind CSS v4 + inline styles (CSS vars) + lucide-react |
| Backend   | Express.js (Node.js) — serverless via Vercel         |
| Banco     | Supabase (PostgreSQL + Auth + Storage)               |
| Auth      | Supabase Auth (Google OAuth + Microsoft + e-mail)    |
| Deploy    | Vercel (frontend estático + API serverless)           |

---

## Configuração do Ambiente

### Variáveis de Ambiente

**Backend — `backend/.env`** (não committar, usar `.env.example`):
```
SUPABASE_URL=https://hhntwfawfnxvuobhdfkb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
DATABASE_URL=postgresql://postgres.hhntwfawfnxvuobhdfkb:<senha>@aws-0-us-west-2.pooler.supabase.com:5432/postgres
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
```

**Frontend — `frontend/.env`** (não committar, usar `.env.example`):
```
VITE_SUPABASE_URL=https://hhntwfawfnxvuobhdfkb.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

**Vercel env vars (produção):**
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

### Rodando Localmente
```bash
# Backend (porta 3001)
cd backend && npm install && npm run dev

# Frontend (porta 5173)
cd frontend && npm install && npm run dev
```

---

## Arquitetura

### Deploy (Vercel)

O projeto roda inteiro no Vercel:
- **Frontend:** build estático do Vite (`frontend/dist`)
- **Backend:** serverless function via `api/[...path].js` que importa o Express
- **Config:** `vercel.json` na raiz — `routes` mapeia `/api/*` para a function
- **Root Directory:** raiz do repo (não `frontend/`)
- Deploy automático ao push na `main`

### Layout do Sistema

- **Header fixo** com logo CBRio + mega menu horizontal + notificações + avatar + toggle tema
- **Mega Menu** suspenso com dropdowns por área (Administrativo, Projetos, Ministerial, Criativo)
- **Dark mode** por padrão, alternável via toggle sol/lua (persiste no localStorage)
- **CSS Variables** (`var(--cbrio-*)`) em todos os módulos para suportar light/dark mode
- **Tema definido em** `frontend/src/index.css` com `:root` (dark) e `[data-theme="light"]`

### Fluxo de Autenticação
```
Browser → Supabase Auth (OAuth/e-mail) → JWT token
  → Frontend envia token no header Authorization: Bearer <token>
  → Backend middleware/auth.js valida token via supabase.auth.getUser()
  → Busca profile na tabela profiles → injeta req.user
```

### Backend (`backend/`)
- **`server.js`** — Express entry: middleware + rotas + `module.exports = app` (serverless-ready)
- **`utils/supabase.js`** — cliente Supabase service_role + pool pg opcional
- **`middleware/auth.js`** — valida JWT Supabase + busca profile
- **`routes/`** — módulos:
  - `auth.js` — GET /me, PATCH /profile
  - `events.js` — CRUD eventos (usa pg pool direto — requer DATABASE_URL)
  - `projects.js` — CRUD projetos (usa pg pool)
  - `expansion.js` — CRUD marcos de expansão (usa Supabase client, nested select, authorize('diretor') em todas as escritas, validação de input)
  - `meetings.js` — CRUD reuniões (usa pg pool)
  - `cycles.js` — Ciclos criativos de eventos
  - `agents.js` — proxy IA (Anthropic Claude)
  - `rh.js` — CRUD funcionários, documentos, treinamentos, férias, extras, benefícios, materiais, **admissões com contratos**, **avaliações de desempenho**
  - `financeiro.js` — CRUD contas, transações, contas a pagar, reembolsos, arrecadação + **notificações inline**
  - `logistica.js` — CRUD fornecedores, solicitações, pedidos, recebimentos, notas fiscais + **notificações inline**
  - `patrimonio.js` — CRUD bens (paginado >1000), categorias, localizações, movimentações, inventários
  - `membresia.js` — CRUD membros, famílias, trilha dos valores, histórico
  - `mercadolivre.js` — Integração ML (OAuth, pedidos, envios, rastreio) com thumbnails enriquecidas
  - `notificacoes.js` — Listar, contar, marcar lida, **gerar automáticas**, CRUD regras, **endpoint cron**
  - `permissoes.js` — Sistema de permissões (cargos, áreas, módulos)
  - `agents.js` — Framework de agentes IA (runs, steps, stats) + System Auditor
- **`services/`** — serviços:
  - `notificar.js` — Helper central: resolve destinatários + dedup + insert
  - `notificacaoGenerator.js` — Gera notificações automáticas por módulo (RH, Financeiro, Logística, Patrimônio)
  - `agentService.js` — Wrapper Claude API com model routing, token budgets, guardrails
  - `agentContext.js` — RAG context builder com dados reais do banco
- **`agents/`** — agentes IA:
  - `systemAuditor.js` — Analisa dados reais e identifica problemas/melhorias

### Frontend (`frontend/src/`)
- **`main.tsx`** — entry point com ThemeProvider + App
- **`supabaseClient.js`** — cliente Supabase com anon key
- **`api.js`** — client HTTP com endpoints: events, projects, expansion, meetings, agents, rh, financeiro, logistica, patrimonio, membresia, notificacoes, permissoes, ml, arquivei
- **`contexts/AuthContext.jsx`** — sessão, perfil, OAuth helpers
- **`contexts/ThemeContext.jsx`** — dark/light mode com localStorage
- **`components/layout/AppShell.jsx`** — header com mega menu + Outlet
- **`components/ui/mega-menu.tsx`** — navegação horizontal com dropdowns animados
- **`components/ui/calendar.tsx`** — calendário react-day-picker
- **`components/ui/switch.tsx`** — toggle switch (radix-ui)
- **`components/ui/`** — shadcn components (avatar, badge, button, dropdown-menu, scroll-area, separator, skeleton)
- **`lib/utils.ts`** — helper `cn()` para merge de classes Tailwind
- **`App.jsx`** — BrowserRouter + rotas + ProtectedRoute
- **`pages/Login.jsx`** — tela de login glassmorphism com WebGL smokey background

### Estrutura de Páginas
```
pages/
  Login.jsx                    — login com WebGL background + logo shimmer
  Calendario.jsx               — calendário interativo
  Projetos.jsx
  Expansao.jsx
  eventos/
    Eventos.jsx                — listagem + CRUD eventos
    EventDetail.jsx            — detalhe do evento
    components/                — modais e sub-componentes
  admin/
    rh/
      RH.jsx                   — 9 tabs: Dashboard, Colaboradores, Admissão, Organograma, Folha, Avaliações, Treinamentos, Férias, Extras
      ModalFuncionario.jsx     — modal criar/editar colaborador com validação CPF
      TabAdmissao.jsx          — admissão com contratos PJ/CLT/Voluntário/Estagiário editáveis
      TabFolha.jsx             — folha de pagamento com export CSV e holerite
      TabAvaliacoes.jsx        — avaliações de desempenho com estrelas (6 critérios)
      TabFerias.jsx            — férias com saldo CLT e carry-over
      TabExtras.jsx            — escalas de extras com notificações
    financeiro/Financeiro.jsx
    logistica/Logistica.jsx    — 7 tabs: Dashboard, Fornecedores, Solicitações, Pedidos, Notas Fiscais, Compras ML, Rastreio
    patrimonio/Patrimonio.jsx  — 6 tabs: Dashboard, Bens, Scanner, Categorias/Localizações, Inventários, Movimentações
    AssistenteIA.jsx           — painel de agentes IA (System Auditor)
    NotificacaoRegras.jsx      — configuração de regras de notificação por módulo/usuário
  ministerial/
    Membresia.jsx              — membros, famílias, trilha dos valores
```

### Banco de Dados (Supabase)
Migrations em `supabase/migrations/`:
- `001_core_schema.sql` — profiles, trigger handle_new_user, RLS
- `002_rh_schema.sql` — funcionários, documentos, treinamentos, férias
- `003_financeiro_schema.sql` — contas, transações, contas a pagar, reembolsos
- `004_logistica_schema.sql` — fornecedores, compras, pedidos, recebimento
- `005_patrimonio_schema.sql` — bens, localizações, movimentações, inventário
- `006_eventos_schema.sql` — eventos, tarefas, ocorrências
- `007_fix_trigger.sql` — fix trigger
- `008_ciclo_criativo_schema.sql` — ciclos criativos
- `009_membresia_schema.sql` — membros (CPF como ID), famílias, trilha dos valores, histórico
- `010_rh_cpf_foto_extras.sql` — foto_url + CPF NOT NULL em funcionários
- `011_rh_escalas_extras_e_notificacoes.sql` — escalas de extras, rh_config, notificações
- `012_rh_foto_url.sql` — foto_url em funcionários
- `013_rh_materiais.sql` — materiais de treinamento
- `014_log_movimentacoes.sql` — movimentações de estoque (log_movimentacoes)
- `015_mercadolivre_integration.sql` — integração Mercado Livre (tokens, config)
- `015_pmo_improvements.sql` — melhorias no PMO
- `016_arquivei_integration.sql` — integração Arquivei (notas fiscais)
- `016_cycle_task_subtasks.sql` — subtarefas de ciclos criativos
- `017_rh_beneficios.sql` — benefícios de funcionários
- `018_notificacoes_system.sql` — sistema de notificações (modulo, severidade, chave_dedup, notificacao_regras)
- `019_rh_admissoes.sql` — sistema de admissão (rh_admissoes com contratos)
- `020_agent_framework.sql` — framework de agentes IA (agent_runs, agent_steps, agent_queue)
- `021_rh_organograma.sql` — gestor_id em rh_funcionarios (hierarquia)
- `022_rh_avaliacoes.sql` — avaliações de desempenho (6 critérios, notas 1-5)
- `027_pmo_views.sql` — views `vw_pmo_kpis` (KPIs agregados) e `vw_workload` (carga por responsável)

**RLS importante:** A policy `profiles_select_all_authenticated` permite qualquer user autenticado ler perfis (evita recursão infinita). NÃO usar sub-select em profiles dentro de policies de profiles.

---

## Roles e Permissões

| Role         | Eventos | Projetos/Expansão | Módulos Admin | Ministerial | Criar/Editar | Agentes IA |
|--------------|---------|-------------------|---------------|-------------|--------------|------------|
| `assistente` | leitura | ❌                | ❌            | ❌          | ❌           | ❌         |
| `admin`      | total   | leitura           | leitura       | leitura     | ❌           | ❌         |
| `diretor`    | total   | total             | total         | total       | ✅           | ✅         |

---

## Workflow Git — REGRAS OBRIGATÓRIAS

> **⚠️ ATENÇÃO CLAUDE CODE: leia esta seção INTEIRA antes de fazer qualquer alteração.**
> **Estas regras existem para evitar conflitos entre os dois devs.**
> **Violá-las causa perda de trabalho e bugs em produção.**

### Regra #1: NUNCA commitar direto na `main`
Sempre criar branch primeiro. A `main` só recebe código via Pull Request.

### Regra #2: NUNCA editar arquivos de outro dev
Cada dev tem pastas e arquivos exclusivos. **Editar fora da sua área quebra o trabalho do outro.**

### Nomenclatura de Branches
```
{dev}/modulo-{nome}
```

---

### 🔒 DIVISÃO DE ARQUIVOS POR DEV — RESPEITAR SEMPRE

#### MATHEUS (Toscano) — pode editar APENAS:
```
frontend/src/pages/admin/rh/           ✅
frontend/src/pages/admin/financeiro/   ✅
frontend/src/pages/admin/logistica/    ✅
frontend/src/pages/admin/patrimonio/   ✅
frontend/src/pages/Projetos.jsx        ✅
frontend/src/pages/Expansao.jsx        ✅
frontend/src/pages/ministerial/        ✅
frontend/src/components/ui/            ✅ (componentes compartilhados)
frontend/src/components/layout/        ✅ (layout, sidebar, mega-menu)
frontend/src/contexts/                 ✅ (auth, tema)
frontend/src/index.css                 ✅ (tema global)
backend/routes/rh.js                   ✅
backend/routes/financeiro.js           ✅
backend/routes/logistica.js            ✅
backend/routes/patrimonio.js           ✅
backend/routes/projects.js             ✅
backend/routes/expansion.js            ✅
backend/routes/membresia.js            ✅
backend/routes/notificacoes.js         ✅
```

#### MATHEUS — NÃO PODE editar (pertence ao Marcos Paulo):
```
frontend/src/pages/eventos/            ❌ PROIBIDO — toda a pasta
  Eventos.jsx                          ❌ PROIBIDO
  EventDetail.jsx                      ❌ PROIBIDO
  components/CycleView.jsx             ❌ PROIBIDO
  components/BudgetPanel.jsx           ❌ PROIBIDO
  components/EventFormModal.jsx        ❌ PROIBIDO
  components/TaskFormModal.jsx         ❌ PROIBIDO
  components/MeetingFormModal.jsx      ❌ PROIBIDO
backend/routes/events.js               ❌ PROIBIDO
backend/routes/meetings.js             ❌ PROIBIDO
backend/routes/cycles.js               ❌ PROIBIDO
backend/routes/occurrences.js          ❌ PROIBIDO
```

> **Se precisar ajustar tema/dark mode em páginas de Eventos:**
> Comunicar ao Marcos Paulo para ele aplicar. NÃO editar diretamente.

#### MARCOS PAULO — pode editar APENAS:
```
frontend/src/pages/eventos/            ✅ toda a pasta
backend/routes/events.js               ✅
backend/routes/meetings.js             ✅
backend/routes/cycles.js               ✅
backend/routes/occurrences.js          ✅
docs/eventos/                          ✅
```

#### MARCOS PAULO — NÃO PODE editar (pertence ao Matheus):
```
frontend/src/pages/admin/              ❌ PROIBIDO — toda a pasta
backend/routes/rh.js                   ❌ PROIBIDO
backend/routes/financeiro.js           ❌ PROIBIDO
backend/routes/logistica.js            ❌ PROIBIDO
backend/routes/patrimonio.js           ❌ PROIBIDO
```

---

### Arquivos Compartilhados — via PR com comunicação
Estes arquivos afetam o sistema inteiro. Alterações devem ser feitas via **Pull Request**:
- `CLAUDE.md`, `README.md`
- `frontend/src/App.jsx` — rotas
- `frontend/src/api.js` — client HTTP
- `frontend/src/components/layout/AppShell.jsx`
- `frontend/src/components/ui/mega-menu.tsx`
- `frontend/src/contexts/` — auth e tema
- `frontend/src/index.css` — tema global
- `supabase/migrations/`
- `backend/server.js`
- `vercel.json`

---

## Funcionalidades Implementadas ✅

### Sistema
- Dark mode + Light mode (toggle no header, persiste em localStorage)
- Mega menu horizontal com dropdowns animados por área (Administrativo > Inteligência inclui Assistente IA)
- **Loading screen** com logo CBRio + shimmer animation
- **Sistema de notificações inteligente**:
  - Geração automática (13 tipos: RH 6, Financeiro 3, Logística 2, Patrimônio 2)
  - **10 notificações inline** (férias, reembolsos, solicitações, pedidos, admissões, avaliações)
  - Regras configuráveis por usuário (`/admin/notificacao-regras`)
  - Deduplicação via `chave_dedup`
  - Dropdown com badges de módulo coloridos + severidade (info/aviso/urgente)
  - Botão "Gerar agora" (diretor) + endpoint cron `/api/notificacoes/cron`
  - Click-to-navigate para o módulo relevante
- **Framework de Agentes IA** (Assistente IA):
  - AgentService com model routing (Haiku/Sonnet), token budgets, guardrails
  - RAG context com dados reais do banco
  - System Auditor agent
  - Painel em `/assistente-ia` com runs, findings, steps, custos
- Login com WebGL smokey background + OAuth (Google, Microsoft)
- **KPI Cards unificados** — estilo moderno em todos os módulos (fundo colorido, SVGs decorativos, hover interativo)
- **Layout 1600px** — conteúdo ocupa mais espaço horizontal (era 1200px)
- **shadcn Button** — componente unificado com variantes (default, outline, ghost, destructive, success) + tamanhos (xs, sm, default, lg, icon)
- Logo CBRio SVG oficial
- Ícones profissionais Lucide React
- Backend serverless no Vercel (Express como function)
- Sistema de permissões (cargos, áreas, módulos)

### RH (9 abas — módulo auditado ~98%)
- **Dashboard** com KPIs (total, ativos, férias, licença, inativos, custo mensal, turnover) + métricas (admissões, desligamentos, folha salarial)
- **Colaboradores** — CRUD com foto upload, filtros, busca, import CSV em massa, **emails importados da planilha** (33 colaboradores)
- **Admissão** — workflow completo com formulário condicional PJ (CNPJ, razão social, banco) + contratos editáveis (PJ, CLT, Voluntário, Estagiário) + impressão/PDF
- **Organograma** — visualização flowchart com pan/zoom, cards conectados por linhas, hierarquia via gestor_id
- **Folha** — tabela salarial com benefícios/descontos, export CSV, geração de holerite imprimível
- **Avaliações** — 6 critérios com estrelas (1-5), nota geral calculada, pontos fortes/melhoria, metas
- **Treinamentos** — CRUD com materiais, progresso (barra %), certificado imprimível
- **Férias/Licenças** — solicitação, aprovação, saldo CLT (30d/12m), carry-over com alerta de prescrição
- **Extras** — escalas de plantão com notificações
- **Benefícios editáveis** inline no detalhe do colaborador (24 campos)
- **Documentos obrigatórios** com alertas por tipo de contrato (CLT, PJ, Voluntário, Estagiário)
- **Validação** — CPF, email, datas, campos obrigatórios
- **Notificações inline** — férias criadas/aprovadas, admissão concluída, avaliação registrada
- **Todos os botões** usam shadcn Button component
- **UX Auditada (v5):**
  - Toast notifications + ConfirmDialog no lugar de alert()/confirm() nativos
  - Todos os modais são painéis laterais deslizantes (slide-in side panels)
  - Inline edit mode no painel de detalhes do colaborador (botão Salvar Alterações)
  - Error states visuais em todos os formulários (banners vermelhos)
  - Cores hardcoded trocadas por CSS variables

#### Permissões do Sistema (ENFORÇADO)
- **Middleware `authorizeModule(routeKey)`** — substitui `authorize('admin','diretor')` em todos os routes protegidos
- **5 níveis de acesso:** 1=Negado, 2=Assistente (pessoal), 3=Líder (área), 4=Diretor (setor), 5=Admin (total)
- **12 módulos:** Tarefas, Banco de Arquivos, Patrimônio, DP, Pessoas, Financeiro, Agenda, Comunicação, Logística, Membresia, Projetos, IA/Agentes
- **Tabelas:** `usuarios` (57 importados), `cargos` (5), `modulos` (12), `setores` (4), `areas` (16), `permissoes_modulo` (overrides), `usuario_areas` (vínculos)
- **Backend:** `authenticate()` carrega permissões granulares automaticamente; `authorizeModule()` verifica nível por módulo + tipo (leitura/escrita baseado no HTTP method)
- **Frontend:** `AuthContext` expõe `canRH`, `canFinanceiro`, `canLogistica`, `canPatrimonio`, `canIA` etc.; navegação filtrada por permissões
- **Endpoint:** `GET /api/auth/my-permissions` retorna permissões granulares do usuário
- **Backward compat:** Admin/Diretor sempre passam; usuários sem entry em `usuarios` são bloqueados
- **UI de configuração:** Painel de detalhes do colaborador → seção "Permissões do Sistema" → configurar cargo, áreas, overrides por módulo

### Membresia
- Listagem de membros com avatar, família, status, telefone, ministério
- Busca por nome + filtro por status
- Detalhe do membro: dados pessoais, CPF, familiares, trilha dos valores (timeline), histórico
- Famílias (agrupamento de membros)
- Trilha dos valores (11 etapas: primeiro contato → ministério)

### Financeiro
- Dashboard com KPIs interativos (saldo, receitas, despesas, contas a pagar, reembolsos)
- CRUD contas bancárias, transações, contas a pagar, reembolsos, arrecadação
- Fluxo de caixa (view SQL)
- **Notificações automáticas**: contas vencendo/vencidas, reembolsos pendentes

### Logística (7 abas — módulo auditado ~92%)
- **Dashboard** com KPIs interativos
- **Fornecedores** — CRUD com validação CNPJ (14 dígitos), email, toggle ativo/inativo
- **Solicitações** — CRUD com edição pós-criação, aprovação/rejeição, urgência
- **Pedidos** — CRUD com bulk select/delete (checkboxes), export CSV, itens de pedido
- **Notas Fiscais** — upload PDF, integração ML (sync compras), integração Arquivei
- **Compras ML** — OAuth, listagem com thumbnails dos produtos, detalhes de envio
- **Rastreio** — tracking com auto-refresh 60s, timeline visual
- **Validação** — CNPJ, email, valores negativos, campos obrigatórios
- **Error handling** — setError visual (sem alert()), error states locais em componentes filhos
- **Notificações inline** — solicitação criada/aprovada, pedido recebido
- **Todos os botões** usam shadcn Button component

### Patrimônio (6 abas — módulo auditado A-)
- **Dashboard** com KPIs (paginado para >1000 bens) — **4.264 bens** importados da planilha CBRio
- **Bens** — CRUD com filtros, busca, 16 categorias, 31 localizações
- **Scanner** — BarcodeDetector API (7 formatos) + entrada manual, movimentação inline
- **Categorias/Localizações** — CRUD com Enter key
- **Inventários** — criar, concluir/cancelar
- **Movimentações** — entrada, saída, transferência, devolução, inventário com barcode
- **Dados importados**: 2.487 ativos + 1.777 baixados = R$ 12.7M+ (planilha inventário CBRio)
- **Notificações automáticas**: bens extraviados, inventários abertos
- **Validação** — nome, código de barras, valor >= 0
- **Todos os botões** usam shadcn Button component

### Eventos, Projetos, Expansão
- Frontend implementado (Marcos Paulo)
- Backend usa Supabase client (migrado de pg pool)
- **Expansão auditado (v7):**
  - 93 marcos estratégicos + 465 tarefas (2026-2029), migration 030
  - Backend usa **nested select** (`expansion_milestones → expansion_tasks → expansion_subtasks`) em uma query só — evita headers overflow com 465+ IDs
  - `authorize('diretor')` em **todos** os endpoints de escrita (POST/PUT/PATCH/DELETE)
  - Validação de input: name obrigatório, status/phase contra enum, year range, budget >= 0
  - Query params validados (year NaN check, status whitelist), retorna 400 ao invés de 500
  - Frontend: TASK_STATUS corrigido (usava underscore `em_andamento`, agora usa hífen `em-andamento` igual ao DB)
  - ConfirmDialog substituiu `window.confirm()` em deleteMilestone e deleteTask
  - Loading spinner animado ao invés de texto "Carregando..."
  - Timeline: cálculo de data usa dias reais do mês (antes usava 30 fixo)
  - Stale state corrigido: `refreshAll()` centralizado, handles `undefined` após delete
  - Kanban drag-drop: valida existência do milestone antes de enviar, limpa state corretamente
  - Validação de datas: `date_start <= date_end` verificado antes de submit
  - **responsible_id UUID** (migration 031): responsáveis vinculados por UUID do profile, people picker no formulário
  - **Permissões granulares** (v8): `authorizeModule('expansion')` no backend, `getAccessLevel(['Projetos'])` no frontend
  - **5 níveis de acesso**: Admin(5)=tudo, Diretor(4)=setor, Líder(3)=área, Assistente(2)=só seus itens, Negado(1)=bloqueado
  - Assistente: sem dashboard, só Marcos/Gantt filtrado por responsible_id
  - Líder: dashboard filtrado por área, pode editar itens da área
  - PermissionGate nos routes (App.jsx) bloqueia acesso se nível < 2
  - Nav items filtrados por `canExpansao`, `canProjetos`, `canAgenda`
- **Sistema de Entregáveis (v9):**
  - Tabela `event_task_attachments`: anexos vinculados a event_tasks ou cycle_phase_tasks
  - Upload via Supabase Storage (bucket `eventos-anexos`, privado, 10MB max)
  - Componente `AttachmentButton.jsx` reutilizável em todos os cards de tarefa
  - Integrado no CycleView.jsx (kanban + tabela) com ícone de clipe + contador
  - Aceita: PDF, DOCX, XLSX, imagens (JPG/PNG/GIF)
  - Extração de texto para IA: pdf-parse (PDF), mammoth (DOCX), xlsx (planilhas)
  - **Relatório IA**: endpoint POST `/api/events/:eventId/report` gera relatório via Claude Sonnet
  - Relatório estruturado: resumo executivo, entregas por área, status, pontos de atenção, recomendações
  - Tabela `event_reports` armazena relatórios gerados com custo em tokens
  - Tab "Relatórios" no detalhe do evento com histórico + visualização + copiar
  - SharePoint integrado via Microsoft Graph API (App Registration configurado)
  - Sync automático Supabase→SharePoint via cron /api/cron/sharepoint-sync
- **Card Completions (v10 + v10.1 fix):**
  - Tabela `card_completions`: registro formal de conclusão com observação + arquivo + snapshot
  - Botão "Concluir tarefa" nos modais de detalhe (CycleView + Eventos kanban)
  - Ao concluir: observação opcional + upload de arquivo → status muda para 'concluida' → fase recalculada
  - Badge "Concluído por X em DD/MM" com observação e link do arquivo
  - PMO pode "Reabrir" card concluído com motivo (volta para 'a_fazer')
  - Dropdown de status oculta opção 'concluida' (só via botão Concluir)
  - View SQL `vw_phase_progress`: progresso por fase/área (migration 033)
  - Relatório IA enriquecido: inclui dados de conclusões (quem, quando, observações)
  - **Fix v10.1:** CompletionSection.jsx agora valida `uploadRes.ok` — antes, falhas no PUT ao SharePoint eram silenciosas (arquivo se perdia, tarefa ficava 'concluída' sem documento)
  - **Fix v10.1:** `completions.js` agora chama `ensureSharePointFolder()` antes de criar upload session (evita 404)
  - **Fix v10.1:** Token cache do Graph API unificado — `completions.js` reutiliza `getGraphToken` de `storageService.js` (antes eram caches duplicados)
  - **Fix v10.1:** Encoding de filenames com acentos corrigido — multer/busboy interpreta como latin1, agora usa `Buffer.from(originalname, 'latin1').toString('utf8')`
  - **Fix v10.1:** Upload agora usa mesma pasta do ciclo — formato `Fase_XX_-_Nome` (antes usava só `Nome`, criando pasta duplicada)
  - **Fix v10.1:** Removida seção "Anexos / Entregáveis" (AttachmentButton) do detalhe de tarefa no CycleView e Eventos — upload unificado via CompletionSection
  - **Fix v10.1:** Upload em chunks de 10MB para arquivos grandes (≤10MB = PUT único, >10MB = chunked upload com progresso %)
- Ciclos criativos com 11 fases + 35 tarefas ADM + 138 subtarefas automáticas
- **KPIs clicáveis** — todos os números do dashboard navegam para os dados filtrados
- **Abas Riscos + Histórico + Retrospectiva** no detalhe do evento
- **People picker** — campo responsável com autocomplete de usuários
- **Subtarefas persistentes** — checkbox salva via API (endpoint PATCH /cycles/subtasks/:subId)
- **Drag-and-drop com feedback visual** — cards ficam transparentes, colunas destacam ao receber
- **Filtro de área direto** — usa campo `area` ao invés de regex em observacoes
- **Horizonte padrão 30 dias** — ciclos de 5 semanas visíveis por padrão
- **URL params drill-down** — `/eventos?status=atrasado`, `/planejamento?person=João`
- **Views SQL** — `vw_pmo_kpis` e `vw_workload` (migration 027)
- Projetos/Estratégico com dropdowns populados no kanban

### Calendário
- Página /calendario com react-day-picker
- Integração com eventos do Supabase

---

## Supabase

**Project ref:** `hhntwfawfnxvuobhdfkb`
**URL:** `https://hhntwfawfnxvuobhdfkb.supabase.co`

Migrations aplicadas: 001-022, 027, 030, 031, 032, 033

Para novas migrations: criar arquivo em `supabase/migrations/` e rodar manualmente no Supabase SQL Editor.

Storage Buckets:
- `documentos-rh` — documentos de funcionários (privado)
- `comprovantes` — notas fiscais e comprovantes (privado)
- `patrimonio-fotos` — fotos de bens (privado)
- `log-arquivos` — notas fiscais (logística)
- `rh-materiais` — materiais de treinamento

---

## Integrações Externas

### Mercado Livre
- OAuth com refresh automático de token
- Listagem de compras com thumbnails (multi-get `/items`)
- Rastreio de envios em tempo real
- Backend: `routes/mercadolivre.js`

### Arquivei
- Importação automática de notas fiscais
- Sync periódico
- Backend: `routes/arquivei.js` (se existir) ou integrado em logistica

### Sistema de Notificações
- `backend/services/notificacaoGenerator.js` — geração automática (13 tipos)
- `backend/services/notificar.js` — helper para notificações inline nos endpoints
- Cron: `GET /api/notificacoes/cron` (protegido por CRON_SECRET) — usar serviço externo (cron-job.org) pois Vercel Hobby não suporta crons nativos
- Também roda via setInterval no server.js (apenas dev local, não Vercel)
- Regras: tabela `notificacao_regras` (modulo → profile_id), UI em `/admin/notificacao-regras`
- Fallback: todos admin/diretor se não houver regra específica
- Deduplicação: coluna `chave_dedup` evita notificações repetidas
- **10 notificações inline** nos endpoints de RH, Financeiro, Logística

### Framework de Agentes IA
- `backend/services/agentService.js` — wrapper Claude API (Haiku para checks, Sonnet para análise)
- `backend/services/agentContext.js` — RAG com dados reais do banco por módulo
- `backend/agents/systemAuditor.js` — auditor que analisa dados e gera findings
- Token budgets, guardrails (nunca inventar dados), cost tracking
- Frontend: `/assistente-ia` com painel de runs, findings, steps, custos
- DB: `agent_runs`, `agent_steps`, `agent_queue` (migration 020)

### Importante: Vercel Hobby
- Plano Hobby **não suporta** cron jobs nativos em vercel.json
- Serverless functions têm timeout de 10s
- Supabase queries com `.select()` retornam máximo **1000 rows** por padrão — usar `.range()` ou paginação para tabelas grandes (ex: pat_bens com 4264 items)
