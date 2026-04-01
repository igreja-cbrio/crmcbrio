# CBRio ERP

Sistema ERP interno da Igreja CBRio. Gestão de eventos, projetos, RH, financeiro, logística, patrimônio e ministérios.

## Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS v4 + Vite
- **Backend:** Express.js + Node.js
- **Banco:** Supabase (PostgreSQL + Auth + Storage)
- **Deploy:** Vercel (auto-deploy da `main`)

## Início Rápido

### Pré-requisitos
- Node.js >= 18
- Conta Supabase configurada
- Variáveis de ambiente (ver `.env.example` em `backend/` e `frontend/`)

### Instalação

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### Rodando localmente

```bash
# Terminal 1 — Backend (porta 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (porta 5173)
cd frontend && npm run dev
```

O frontend faz proxy de `/api/*` para o backend automaticamente via Vite.

## Estrutura do Projeto

```
crmcbrio/
├── backend/
│   ├── server.js              # Entry point Express
│   ├── middleware/auth.js      # Autenticação JWT Supabase
│   ├── utils/                  # Supabase client, DB pool, sanitização
│   └── routes/                 # API modules (10 rotas)
│       ├── auth.js
│       ├── events.js
│       ├── projects.js
│       ├── expansion.js
│       ├── meetings.js
│       ├── agents.js
│       ├── rh.js
│       ├── financeiro.js
│       ├── logistica.js
│       └── patrimonio.js
├── frontend/
│   ├── src/
│   │   ├── main.tsx            # Entry point React
│   │   ├── App.jsx             # Rotas + ProtectedRoute
│   │   ├── api.js              # HTTP client (todos os endpoints)
│   │   ├── index.css           # Tailwind + tema global
│   │   ├── lib/utils.ts        # cn() utility
│   │   ├── components/
│   │   │   ├── ui/             # Componentes reutilizáveis (shadcn pattern)
│   │   │   │   └── modern-side-bar.tsx
│   │   │   └── layout/
│   │   │       └── AppShell.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── eventos/
│   │       ├── admin/rh/
│   │       ├── admin/financeiro/
│   │       ├── admin/logistica/
│   │       └── admin/patrimonio/
│   ├── tsconfig.json
│   └── vite.config.ts
├── supabase/
│   └── migrations/             # 001-005 SQL schemas
├── vercel.json                 # Config de deploy Vercel
├── CLAUDE.md                   # Guia para IA e devs
└── README.md
```

## Módulos

| Módulo | Backend | Frontend | Responsável |
|--------|---------|----------|-------------|
| Eventos | ✅ | 🔧 Em dev | Marcos Paulo |
| Projetos | ✅ | 📋 Stub | Matheus |
| Expansão | ✅ | 📋 Stub | Matheus |
| RH | ✅ | 🔧 Parcial | Matheus |
| Financeiro | ✅ | 📋 Stub | Matheus |
| Logística | ✅ | 📋 Stub | Matheus |
| Patrimônio | ✅ | 📋 Stub | Matheus |
| Ministerial | 📋 | 📋 | Marcos Paulo |
| Criativo | 📋 | 📋 | Marcos Paulo |

## Workflow Git

Cada dev trabalha na sua branch:
```
matheus/modulo-{nome}
marcos/modulo-{nome}
```

- Nunca commitar direto na `main`
- Alterações em arquivos compartilhados sempre via PR
- Deploy automático ao mergar PR na `main`

## Deploy

O frontend é publicado via Vercel com deploy automático:
- **Produção:** merge na `main` → deploy
- **Preview:** cada PR gera URL de preview

O backend roda separadamente (configurar hosting conforme necessidade).

## Licença

Projeto interno — uso exclusivo da Igreja CBRio.
