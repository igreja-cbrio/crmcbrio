# CLAUDE.md — CBRio ERP

Guia para Claude Code e agentes de IA trabalhando neste repositório.
Atualizado em: 2026-04-01

---

## Visão Geral do Projeto

Sistema ERP interno da Igreja CBRio. Arquitetura modular com React + Express + Supabase.

**Repositório:** `https://github.com/igreja-cbrio/crmcbrio`
**Devs ativos:** Matheus Ribeiro e Marcos Paulo (cada um em um módulo por vez)

---

## Stack

| Camada    | Tecnologia                                     |
|-----------|-----------------------------------------------|
| Frontend  | React 18 + React Router v6 + Vite             |
| Backend   | Express.js (Node.js)                           |
| Banco     | Supabase (PostgreSQL + Auth + Storage)         |
| Auth      | Supabase Auth (Google OAuth + Microsoft + e-mail) |
| Estilo    | Inline styles com constantes de tema (sem CSS framework) |

---

## Configuração do Ambiente

### Variáveis de Ambiente

**Backend — `backend/.env`** (não committar, usar `.env.example`):
```
SUPABASE_URL=https://hhntwfawfnxvuobhdfkb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
DATABASE_URL=postgresql://postgres.hhntwfawfnxvuobhdfkb:<senha>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
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
- **`routes/`** — módulos: `auth`, `events`, `projects`, `expansion`, `meetings`, `agents`
- Login/registro: **não tem rota no backend** — o Supabase Auth cuida direto no frontend

### Frontend (`frontend/src/`)
- **`supabaseClient.js`** — cliente Supabase com anon key
- **`contexts/AuthContext.jsx`** — provider de sessão, perfil e helpers de OAuth
- **`components/layout/AppShell.jsx`** — layout com sidebar + `<Outlet />`
- **`components/layout/Sidebar.jsx`** — navegação por role
- **`pages/`** — uma pasta por módulo (ver estrutura abaixo)
- **`App.jsx`** — BrowserRouter + rotas + ProtectedRoute

### Estrutura de Páginas
```
pages/
  Login.jsx
  eventos/          → branch do Matheus (módulo original)
  Projetos.jsx      → branch do Matheus
  Expansao.jsx      → branch do Matheus
  admin/
    rh/             → branch do Matheus
    financeiro/     → branch do Matheus
    logistica/      → branch do Matheus
    patrimonio/     → branch do Matheus
  ministerial/      → branch do Marcos Paulo
  geracional/       → branch do Marcos Paulo
  criativo/         → branch do Marcos Paulo
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
Exemplos:
- `matheus/modulo-rh`
- `matheus/modulo-financeiro`
- `marcos/modulo-membresia`
- `marcos/modulo-grupos`

**Nunca commitar direto na `main`.**

### Quem mexe em quê

**Matheus:**
- Módulos Administrativos: RH, Financeiro, Logística, Patrimônio
- Módulos existentes: Eventos, Projetos, Expansão

**Marcos Paulo:**
- Módulos Ministeriais: Integração, Grupos, Cuidados, Online, Voluntariado, Membresia
- Módulos Geracionais: AMI (Jovens), Kids
- Módulos Criativos: Marketing, Produção, Louvor

**Arquivos compartilhados — sempre usar PR para alterar:**
- `CLAUDE.md` (este arquivo)
- `frontend/src/App.jsx`
- `frontend/src/components/layout/Sidebar.jsx`
- `frontend/src/contexts/AuthContext.jsx`
- `supabase/migrations/`
- `backend/server.js`
- `backend/middleware/auth.js`
- `backend/utils/supabase.js`

### Integrações via Pull Request
1. Abrir PR da branch do módulo para `main`
2. Descrever o que foi feito
3. Outro dev revisa antes de mergar

---

## Padrões de Código

### Estilo (Frontend)
- **Inline styles** com objeto `styles` no topo do componente — sem CSS modules, sem Tailwind
- Paleta de cores consistente:
  - Background sidebar: `#1a1a2e`
  - Cor primária: `#7c3aed`
  - Texto principal: `#1a1a2e`
  - Texto secundário: `#6b7280`
  - Background app: `#f3f4f6`
- Fonte: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Sem biblioteca de componentes externa (tudo custom)

### Padrão de Componente (Frontend)
```jsx
// styles no topo
const styles = { container: {...}, title: {...} };

// componente funcional com export default
export default function MeuComponente({ prop }) {
  const { role } = useAuth();
  // ...
  return <div style={styles.container}>...</div>;
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

## Módulos do Sistema

### Implementados ✅
- Eventos, Projetos, Expansão, Reuniões (módulo original, PostgreSQL local)
- Schema Supabase: profiles, RLS, RH, Financeiro, Logística, Patrimônio (migrations prontas)

### Em Desenvolvimento 🔧
- Frontend dos módulos administrativos (RH, Financeiro, Logística, Patrimônio)

### Planejados 📋
- Ministerial: Integração, Grupos, Cuidados, Online, Voluntariado, Membresia
- Geracionais: AMI (Jovens), Kids
- Criativo: Marketing, Produção, Louvor
- Sistema: Notificações, busca de membro, trilha dos valores

---

## Supabase

**Project ref:** `hhntwfawfnxvuobhdfkb`
**URL:** `https://hhntwfawfnxvuobhdfkb.supabase.co`

Para rodar as migrations:
```bash
# Via Supabase CLI
supabase db push

# Ou manualmente no SQL Editor do dashboard
```

Storage buckets a criar:
- `documentos-rh` — documentos de funcionários
- `comprovantes` — notas fiscais e comprovantes financeiros
- `patrimonio-fotos` — fotos de bens e recebimentos
