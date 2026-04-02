# CLAUDE.md — CBRio ERP

Guia para Claude Code e agentes de IA trabalhando neste repositório.
Atualizado em: 2026-04-02

---

## Visão Geral do Projeto

Sistema ERP interno da Igreja CBRio. Arquitetura modular com React + Express + Supabase.

**Repositório:** `https://github.com/igreja-cbrio/crmcbrio`
**Devs ativos:** Matheus Ribeiro e Marcos Paulo (cada um em um módulo por vez)
**Deploy:** Vercel (frontend) — auto-deploy da `main`

---

## Stack

| Camada    | Tecnologia                                           |
|-----------|-----------------------------------------------------|
| Frontend  | React 18 + TypeScript + Vite + React Router v7      |
| Estilo    | Tailwind CSS v4 + shadcn/ui pattern + lucide-react  |
| Backend   | Express.js (Node.js)                                 |
| Banco     | Supabase (PostgreSQL + Auth + Storage)               |
| Auth      | Supabase Auth (Google OAuth + Microsoft + e-mail)    |
| Deploy    | Vercel (frontend) — configurado via `vercel.json`    |

---

## Configuração do Ambiente

### Variáveis de Ambiente

**Backend — `backend/.env`** (não committar, usar `.env.example`):
```
SUPABASE_URL=https://hhntwfawfnxvuobhdfkb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
DATABASE_URL=postgresql://postgres.hhntwfawfnxvuobhdfkb:<senha>@aws-0-us-west-2.pooler.supabase.com:6543/postgres
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
ANTHROPIC_API_KEY=<chave_anthropic>
```

**Frontend — `frontend/.env`** (não committar, usar `.env.example`):
```
VITE_SUPABASE_URL=https://hhntwfawfnxvuobhdfkb.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_API_URL=http://localhost:3001
```

### Rodando Localmente
```bash
# Backend (porta 3001)
cd backend && npm run dev

# Frontend (porta 5173)
cd frontend && npm run dev
```

---

## Arquitetura

### Fluxo de Autenticação
```
Browser → Supabase Auth (OAuth/e-mail) → JWT token
  → Frontend envia token no header Authorization: Bearer <token>
  → Backend middleware/auth.js valida token via supabase.auth.getUser()
  → Busca profile na tabela profiles → injeta req.user
```

### Backend (`backend/`)
- **`server.js`** — Express entry: middleware de segurança + rotas
- **`utils/supabase.js`** — cliente Supabase service_role + pool pg direto
- **`middleware/auth.js`** — valida JWT Supabase + busca profile
- **`routes/`** — módulos:
  - `auth.js` — GET /me, PATCH /profile
  - `events.js` — CRUD eventos + tarefas + subtarefas + comentários
  - `projects.js` — CRUD projetos + objetivos + tarefas + milestones
  - `expansion.js` — CRUD marcos de expansão + tarefas + subtarefas
  - `meetings.js` — CRUD reuniões + pendências
  - `agents.js` — proxy IA (Anthropic Claude)
  - `rh.js` — CRUD funcionários, documentos, treinamentos, férias
  - `financeiro.js` — CRUD contas, transações, contas a pagar, reembolsos
  - `logistica.js` — CRUD fornecedores, solicitações, pedidos, recebimentos
  - `patrimonio.js` — CRUD bens, categorias, localizações, movimentações, inventários
- Login/registro: **não tem rota no backend** — o Supabase Auth cuida direto no frontend

### Frontend (`frontend/src/`)
- **`main.tsx`** — entry point React
- **`supabaseClient.js`** — cliente Supabase com anon key
- **`api.js`** — client HTTP com todos os endpoints (events, projects, expansion, meetings, agents, rh, financeiro, logistica, patrimonio)
- **`contexts/AuthContext.jsx`** — provider de sessão, perfil e helpers de OAuth
- **`components/layout/AppShell.jsx`** — layout com sidebar + `<Outlet />`
- **`components/ui/modern-side-bar.tsx`** — sidebar moderna com submenus colapsáveis por módulo (Tailwind + lucide-react)
- **`components/layout/Sidebar.jsx`** — sidebar legada (mantida para referência)
- **`lib/utils.ts`** — helper `cn()` para merge de classes Tailwind
- **`pages/`** — uma pasta por módulo (ver estrutura abaixo)
- **`App.jsx`** — BrowserRouter + rotas + ProtectedRoute

### Estrutura de Páginas
```
pages/
  Login.jsx
  eventos/          → branch marcos/modulo-eventos
  Projetos.jsx      → branch matheus/modulo-projetos
  Expansao.jsx      → branch matheus/modulo-expansao
  admin/
    rh/             → branch matheus/modulo-rh
    financeiro/     → branch matheus/modulo-financeiro
    logistica/      → branch matheus/modulo-logistica
    patrimonio/     → branch matheus/modulo-patrimonio
  ministerial/      → branch marcos/modulo-ministerial
  geracional/       → branch marcos/modulo-geracional
  criativo/         → branch marcos/modulo-criativo
```

### Banco de Dados (Supabase)
Migrations em `supabase/migrations/`:
- `001_core_schema.sql` — tabela `profiles`, trigger `handle_new_user`, RLS base
- `002_rh_schema.sql` — funcionários, documentos, treinamentos, férias
- `003_financeiro_schema.sql` — contas, transações, contas a pagar, reembolsos
- `004_logistica_schema.sql` — fornecedores, compras, pedidos, recebimento
- `005_patrimonio_schema.sql` — bens, localizações, movimentações, inventário

---

## Roles e Permissões

| Role         | Eventos | Projetos/Expansão | Módulos Admin | Criar/Editar/Excluir | Agentes IA |
|--------------|---------|-------------------|---------------|----------------------|------------|
| `assistente` | leitura | ❌                | ❌            | ❌                   | ❌         |
| `admin`      | leitura | leitura           | leitura       | ❌                   | ❌         |
| `diretor`    | total   | total             | total         | ✅                   | ✅         |

---

## Workflow Git — REGRAS OBRIGATÓRIAS

> **⚠️ ATENÇÃO CLAUDE CODE: leia esta seção INTEIRA antes de executar qualquer comando git.**

### Regra #1: NUNCA commitar direto na `main`
Sempre criar branch primeiro. A `main` só recebe código via Pull Request.

### Regra #2: NUNCA editar arquivos de outro dev
Cada dev tem pastas exclusivas. Editar arquivos fora da sua área **quebra o trabalho do outro**.

### Nomenclatura de Branches
```
{dev}/modulo-{nome}
```

---

### 🔒 DIVISÃO DE ARQUIVOS POR DEV — RESPEITAR SEMPRE

#### MATHEUS — só pode editar:
```
frontend/src/pages/admin/rh/          ✅ Pode editar
frontend/src/pages/admin/financeiro/  ✅ Pode editar
frontend/src/pages/admin/logistica/   ✅ Pode editar
frontend/src/pages/admin/patrimonio/  ✅ Pode editar
frontend/src/pages/Projetos.jsx       ✅ Pode editar
frontend/src/pages/Expansao.jsx       ✅ Pode editar
backend/routes/rh.js                  ✅ Pode editar
backend/routes/financeiro.js          ✅ Pode editar
backend/routes/logistica.js           ✅ Pode editar
backend/routes/patrimonio.js          ✅ Pode editar
backend/routes/projects.js            ✅ Pode editar
backend/routes/expansion.js           ✅ Pode editar
```

#### MATHEUS — NÃO pode editar (pertence ao Marcos Paulo):
```
frontend/src/pages/eventos/           ❌ PROIBIDO
frontend/src/pages/eventos/Eventos.jsx          ❌ PROIBIDO
frontend/src/pages/eventos/EventDetail.jsx      ❌ PROIBIDO
frontend/src/pages/eventos/components/          ❌ PROIBIDO (todos os arquivos)
backend/routes/events.js              ❌ PROIBIDO
backend/routes/meetings.js            ❌ PROIBIDO
backend/routes/cycles.js              ❌ PROIBIDO
backend/routes/occurrences.js         ❌ PROIBIDO
```

#### MARCOS PAULO — só pode editar:
```
frontend/src/pages/eventos/           ✅ Pode editar (toda a pasta)
backend/routes/events.js              ✅ Pode editar
backend/routes/meetings.js            ✅ Pode editar
backend/routes/cycles.js              ✅ Pode editar
backend/routes/occurrences.js         ✅ Pode editar
docs/eventos/                         ✅ Pode editar
```

#### MARCOS PAULO — NÃO pode editar (pertence ao Matheus):
```
frontend/src/pages/admin/             ❌ PROIBIDO (toda a pasta)
backend/routes/rh.js                  ❌ PROIBIDO
backend/routes/financeiro.js          ❌ PROIBIDO
backend/routes/logistica.js           ❌ PROIBIDO
backend/routes/patrimonio.js          ❌ PROIBIDO
```

---

### Arquivos Compartilhados — SEMPRE via PR e comunicação

Estes arquivos afetam o sistema inteiro. **Qualquer alteração deve ser feita via Pull Request** com descrição clara:

- `CLAUDE.md` — este arquivo
- `frontend/src/App.jsx` — rotas do React
- `frontend/src/components/ui/` — componentes compartilhados
- `frontend/src/components/layout/` — layout (AppShell, Sidebar)
- `frontend/src/contexts/AuthContext.jsx` — autenticação
- `frontend/src/api.js` — client HTTP
- `frontend/src/index.css` — tema global Tailwind
- `supabase/migrations/` — schema do banco
- `backend/server.js` — registro de rotas
- `backend/middleware/auth.js` — autenticação
- `backend/utils/` — utilitários compartilhados
- `vercel.json` — configuração de deploy

**Se precisar alterar um arquivo compartilhado:**
1. Criar branch específica (ex: `matheus/fix-sidebar`)
2. Fazer a alteração mínima necessária
3. Abrir PR descrevendo o que mudou
4. O outro dev revisa antes de mergear

### Integrações via Pull Request
1. Abrir PR da branch do módulo para `main`
2. Descrever o que foi feito
3. Outro dev revisa antes de mergar
4. Vercel faz deploy automático ao mergar na `main`

---

## Padrões de Código

### Estilo (Frontend)
- **Tailwind CSS v4** com classes utilitárias — NÃO usar inline styles em novos componentes
- Tema definido em `frontend/src/index.css` com `@theme {}` (CSS custom properties)
- Paleta de cores (via variáveis do tema):
  - Sidebar: `var(--color-sidebar)` = `#1a1a2e`
  - Primária: `var(--color-primary)` = `#7c3aed`
  - Texto: `var(--color-foreground)` = `#1a1a2e`
  - Texto secundário: `var(--color-muted-foreground)` = `#6b7280`
  - Background: `var(--color-background)` = `#f3f4f6`
- Ícones: `lucide-react` — usar ícones do lucide em vez de emojis para UI
- Utility: `cn()` de `@/lib/utils.ts` para merge de classes condicionais
- Fonte: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Componentes reutilizáveis em `frontend/src/components/ui/`
- Páginas legadas (RH, Login) ainda usam inline styles — migrar gradualmente

### Padrão de Componente (Frontend — novo)
```tsx
import { cn } from '@/lib/utils';
import { SomeIcon } from 'lucide-react';

interface Props {
  title: string;
}

export default function MeuComponente({ title }: Props) {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
    </div>
  );
}
```

### Padrão de Rota (Backend)
```js
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');

// GET /api/modulo
router.get('/', authenticate, authorize('admin', 'diretor'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('tabela').select('*');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('[MODULO]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
```

### Queries
- Usar sempre Supabase client (`supabase.from(...)`) — não SQL direto no frontend
- SQL direto (`utils/supabase.js pool`) apenas no backend para queries complexas
- Nunca expor service_role key no frontend
- Nunca concatenar strings em queries SQL — usar parâmetros `$1, $2`

---

## Deploy (Vercel)

O frontend é publicado automaticamente via Vercel:
- **Produção:** deploy automático ao mergar PR na `main`
- **Preview:** cada PR gera uma URL de preview automaticamente
- **Config:** `vercel.json` na raiz do repositório
- **Build:** `cd frontend && npm install && npm run build`
- **Output:** `frontend/dist`

O backend roda separadamente (configurar conforme infraestrutura).

---

## Módulos do Sistema

### Implementados ✅
- Backend completo: Events, Projects, Expansion, Meetings, Agents, RH, Financeiro, Logística, Patrimônio, **Cycles** (11 módulos de API)
- **Módulo Eventos frontend completo** (branch marcos/modulo-eventos):
  - Aba Home com calendário interativo mensal + KPIs
  - Aba Lista com tabela, filtros, DaysCounter colorido, busca
  - Detalhe do evento com tarefas, reuniões, ocorrências
  - Formulários: criar/editar evento, tarefa, reunião
  - Botões Finalizar/Reabrir evento
- **Módulo Ciclo Criativo** (11 fases marketing + trilha ADM):
  - 8 tabelas Supabase: cycle_phase_templates, event_cycles, event_cycle_phases, cycle_phase_tasks, event_adm_track, event_budgets, event_expenses, budget_alerts
  - Backend routes/cycles.js: ativar ciclo, CRUD fases/tarefas/ADM, gastos com alerta de estouro
  - Frontend: CycleView (Fases Marketing, Tarefas kanban, Fases Administração), BudgetPanel
  - Integrado como sub-aba no detalhe do evento
- Frontend RH (parcialmente implementado)
- Schema Supabase aplicado: profiles, RLS, todos os módulos (34+ tabelas + views + indexes)
- Storage Buckets criados: `documentos-rh`, `comprovantes`, `patrimonio-fotos`
- Sidebar moderna com submenus colapsáveis
- Migração para Tailwind CSS v4 + TypeScript

### Regra atual: Permissões
- **Tudo visível para todos os usuários** — sem restrições de role por enquanto
- Permissões (isDiretor, isAdmin, canEdit) serão implementadas depois

### Em Desenvolvimento 🔧
- Frontend Financeiro, Logística, Patrimônio (branches matheus/)

### Planejados 📋
- Ministerial: Integração, Grupos, Cuidados, Online, Voluntariado, Membresia
- Geracionais: AMI (Jovens), Kids
- Criativo: Marketing, Produção, Louvor
- Sistema: Notificações, busca de membro, trilha dos valores, permissões por role

---

## Supabase

**Project ref:** `hhntwfawfnxvuobhdfkb`
**URL:** `https://hhntwfawfnxvuobhdfkb.supabase.co`

Migrations aplicadas (001-009) via `supabase db push`.
- 001-005: core, RH, financeiro, logística, patrimônio
- 006: módulo eventos (10 tabelas + view v_events_dashboard)
- 007: fix trigger handle_new_user (search_path)
- 008: ciclo criativo (8 tabelas + 2 views + seed 11 fases)
- 009: occurrence_tasks, occurrence_meetings, occurrence_meeting_pendencies

Para adicionar novas migrations:
```bash
# Criar novo arquivo em supabase/migrations/006_nome.sql
# Depois rodar:
npx supabase db push
```

Storage Buckets (já criados):
- `documentos-rh` — documentos de funcionários (privado)
- `comprovantes` — notas fiscais e comprovantes financeiros (privado)
- `patrimonio-fotos` — fotos de bens e recebimentos (privado)

**Região do pooler:** `aws-0-us-west-2` (DATABASE_URL usa esta região, não sa-east-1)
