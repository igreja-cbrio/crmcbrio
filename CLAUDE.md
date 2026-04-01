# CLAUDE.md — CBRio ERP

Guia para Claude Code e agentes de IA trabalhando neste repositório.
Atualizado em: 2026-04-01

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

### Nomenclatura de Branches
```
{dev}/modulo-{nome}
```

### Branches Ativas

**Matheus:**
- `matheus/modulo-rh` — Módulo RH (frontend + backend)
- `matheus/modulo-financeiro` — Módulo Financeiro
- `matheus/modulo-logistica` — Módulo Logística
- `matheus/modulo-patrimonio` — Módulo Patrimônio
- `matheus/modulo-projetos` — Módulo Projetos
- `matheus/modulo-expansao` — Módulo Expansão

**Marcos Paulo:**
- `marcos/modulo-eventos` — Módulo Eventos (frontend + backend)
- `marcos/modulo-ministerial` — Módulo Ministerial (Integração, Grupos, Cuidados, Voluntariado, Membresia)
- `marcos/modulo-geracional` — Módulo Geracional (AMI, Kids)
- `marcos/modulo-criativo` — Módulo Criativo (Marketing)

**Nunca commitar direto na `main`.**

### Arquivos Compartilhados — SEMPRE via PR

Estes arquivos afetam o sistema inteiro. Qualquer alteração deve ser feita via Pull Request:

- `CLAUDE.md` / `README.md`
- `frontend/src/App.jsx` — rotas
- `frontend/src/components/ui/modern-side-bar.tsx` — sidebar (navegação)
- `frontend/src/components/layout/AppShell.jsx` — layout
- `frontend/src/contexts/AuthContext.jsx` — autenticação
- `frontend/src/api.js` — client HTTP
- `frontend/src/index.css` — tema global Tailwind
- `supabase/migrations/` — schema do banco
- `backend/server.js` — registro de rotas
- `backend/middleware/auth.js` — autenticação
- `backend/utils/supabase.js` — conexão Supabase
- `vercel.json` — configuração de deploy

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
- Backend completo: Events, Projects, Expansion, Meetings, Agents, RH, Financeiro, Logística, Patrimônio (10 módulos de API)
- Frontend RH (parcialmente implementado)
- Schema Supabase aplicado: profiles, RLS, RH, Financeiro, Logística, Patrimônio (24 tabelas + 1 view + indexes)
- Storage Buckets criados: `documentos-rh`, `comprovantes`, `patrimonio-fotos`
- Sidebar moderna com submenus colapsáveis
- Migração para Tailwind CSS v4 + TypeScript

### Em Desenvolvimento 🔧
- Frontend Eventos (branch marcos/modulo-eventos)
- Frontend Financeiro, Logística, Patrimônio (branches matheus/)

### Planejados 📋
- Ministerial: Integração, Grupos, Cuidados, Online, Voluntariado, Membresia
- Geracionais: AMI (Jovens), Kids
- Criativo: Marketing, Produção, Louvor
- Sistema: Notificações, busca de membro, trilha dos valores

---

## Supabase

**Project ref:** `hhntwfawfnxvuobhdfkb`
**URL:** `https://hhntwfawfnxvuobhdfkb.supabase.co`

Migrations aplicadas (001-005) em 2026-04-01 via `supabase db push`.

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
