# CLAUDE.md — CBRio ERP

Guia para Claude Code e agentes de IA trabalhando neste repositório.
Atualizado em: 2026-04-02 (v2)

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
  - `expansion.js` — CRUD marcos de expansão (usa pg pool)
  - `meetings.js` — CRUD reuniões (usa pg pool)
  - `cycles.js` — Ciclos criativos de eventos
  - `agents.js` — proxy IA (Anthropic Claude)
  - `rh.js` — CRUD funcionários, documentos, treinamentos, férias, **escalas de extras**, benefícios, materiais
  - `financeiro.js` — CRUD contas, transações, contas a pagar, reembolsos, arrecadação
  - `logistica.js` — CRUD fornecedores, solicitações, pedidos, recebimentos, notas fiscais
  - `patrimonio.js` — CRUD bens, categorias, localizações, movimentações, inventários
  - `membresia.js` — CRUD membros, famílias, trilha dos valores, histórico
  - `mercadolivre.js` — Integração ML (OAuth, pedidos, envios, rastreio) com thumbnails enriquecidas
  - `notificacoes.js` — Listar, contar, marcar lida, **gerar automáticas**, CRUD regras por módulo
  - `permissoes.js` — Sistema de permissões (cargos, áreas, módulos)
- **`services/`** — serviços:
  - `notificar.js` — Helper central: resolve destinatários + dedup + insert
  - `notificacaoGenerator.js` — Gera notificações automáticas por módulo (RH, Financeiro, Logística, Patrimônio)

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
  Login.jsx                    — login com WebGL background
  Calendario.jsx               — calendário interativo
  Projetos.jsx
  Expansao.jsx
  eventos/
    Eventos.jsx                — listagem + CRUD eventos
    EventDetail.jsx            — detalhe do evento
    components/                — modais e sub-componentes
  admin/
    rh/
      RH.jsx                   — Dashboard, Funcionários, Treinamentos, Férias, Extras
      ModalFuncionario.jsx
      TabTreinamentos.jsx
      TabFerias.jsx
      TabExtras.jsx            — escalas de extras com notificações
    financeiro/Financeiro.jsx
    logistica/Logistica.jsx
    patrimonio/Patrimonio.jsx
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
- Mega menu horizontal com dropdowns animados por área
- **Sistema de notificações inteligente** — polling 30s, geração automática a cada 6h
  - Notificações por módulo (RH, Financeiro, Logística, Patrimônio)
  - Regras configuráveis por usuário (`notificacao_regras`)
  - Deduplicação via `chave_dedup`
  - Dropdown com badges de módulo coloridos + indicador de severidade (info/aviso/urgente)
  - Click-to-navigate para o módulo relevante
- Login com WebGL smokey background + OAuth (Google, Microsoft)
- **KPI Cards unificados** — estilo moderno em todos os módulos (fundo colorido, SVGs decorativos, hover interativo)
- Logo CBRio SVG oficial
- Ícones profissionais Lucide React em todo o sistema
- Backend serverless no Vercel (Express como function)
- Sistema de permissões (cargos, áreas, módulos)

### RH
- Dashboard com KPIs interativos
- CRUD funcionários (CPF, foto_url, cargo, área, salário, status)
- Treinamentos (criar, inscrever funcionários, concluir, materiais)
- Férias/Licenças (solicitar, aprovar/rejeitar)
- **Escalas de Extras** (escalar funcionário para plantão/domingo)
- **Benefícios** de funcionários
- **Notificações automáticas**: férias vencendo/iniciando, pendentes, documentos vencidos, experiência CLT

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

### Logística
- Dashboard com KPIs interativos
- CRUD fornecedores, solicitações de compra, pedidos, notas fiscais (upload PDF)
- **Integração Mercado Livre** — OAuth, listagem de compras com **thumbnails dos produtos**, detalhes de envio
- **Rastreio ML** — tracking de envios em tempo real
- **Integração Arquivei** — importação automática de notas fiscais
- **Notificações automáticas**: pedidos atrasados, solicitações pendentes

### Patrimônio
- Dashboard com KPIs interativos
- CRUD bens, categorias, localizações, inventários
- **Scanner de código de barras** (via câmera ou manual) para bens e movimentações
- **Movimentações** de estoque (movido da Logística) — entrada, saída, transferência, devolução, inventário
- **Notificações automáticas**: bens extraviados, inventários abertos

### Eventos, Projetos, Expansão
- Frontend implementado (Marcos Paulo)
- Backend usa pg pool direto (requer DATABASE_URL)
- Ciclos criativos com subtarefas

### Calendário
- Página /calendario com react-day-picker
- Integração com eventos do Supabase

---

## Supabase

**Project ref:** `hhntwfawfnxvuobhdfkb`
**URL:** `https://hhntwfawfnxvuobhdfkb.supabase.co`

Migrations aplicadas: 001-018

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

### Sistema de Notificações (Cron)
- `backend/services/notificacaoGenerator.js` — roda a cada 6h (setInterval no server.js)
- Módulos: RH, Financeiro, Logística, Patrimônio
- Regras de destinatário: tabela `notificacao_regras` (modulo → profile_id)
- Fallback: todos admin/diretor se não houver regra específica
- Deduplicação: coluna `chave_dedup` evita notificações repetidas
