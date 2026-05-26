# cbrio-agent-worker

Worker long-running de agentes IA do CBRio ERP. Usa **Claude Agent SDK** (TypeScript) e roda fora do Vercel — em Railway por padrão.

**Por que separado:** o Agent SDK precisa de processo que vive minutos, com filesystem persistente. Vercel Hobby corta em 10s. Worker resolve isso, e o backend Vercel só dispatcha via HTTP autenticado por HMAC.

## Arquitetura

```
Frontend (Vercel)
    ↓ POST /api/agents/run
Backend Vercel (Express serverless)
    ↓ POST /run  (com X-CBRio-Signature HMAC-SHA256)
Worker Railway (este projeto)
    ↓ @anthropic-ai/claude-agent-sdk → query() loop
Tools custom (in-process MCP server)
    ↓ supabase-js
Supabase (mesmo banco)
```

O worker também roda **scheduler interno** (node-cron) que dispara o agente financeiro 3x/dia automaticamente — sem precisar de cron externo.

## Tools disponíveis (módulo Financeiro)

**Leitura:** `listar_contas_pagar_pendentes`, `listar_reembolsos_pendentes`, `listar_transacoes_sem_categoria`, `listar_categorias`, `historico_categoria_por_descricao`, `listar_contas_bancarias`, `ler_memorias`.

**Escrita (enfileiram em `agent_queue`):** `propor_categorizar_transacao`, `propor_marcar_conta_paga`, `propor_aprovar_reembolso`.

**Aprendizado:** `lembrar_aprendizado` — escreve em `agent_memory`, lido em runs futuras.

A skill com regras de domínio mora em `skills/financeiro-cbrio/SKILL.md` e é injetada no system prompt.

## Setup local

```bash
cd agent-worker
npm install
cp .env.example .env
# preencha ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WORKER_SECRET
npm run dev
```

Smoke test:

```bash
curl http://localhost:3030/health
# → { ok: true, ts: "...", version: "0.1.0" }
```

Dispatch manual (precisa do mesmo `WORKER_SECRET`):

```bash
BODY='{"agent":"financeiro"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WORKER_SECRET" | awk '{print $2}')
curl -X POST http://localhost:3030/run \
  -H "Content-Type: application/json" \
  -H "X-CBRio-Signature: $SIG" \
  -d "$BODY"
# → { status: "running", runId: "...", agent: "financeiro" }
```

## Deploy em Railway (passo a passo)

1. **Criar projeto** em [railway.app](https://railway.app) → New Project → Deploy from GitHub repo → escolher `igreja-cbrio/crmcbrio`.
2. **Settings → Root Directory** → `agent-worker`.
3. **Variables** (Settings → Variables, adicione todas):
   - `ANTHROPIC_API_KEY` — mesma que está no Vercel
   - `SUPABASE_URL` — `https://hhntwfawfnxvuobhdfkb.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` — mesma do Vercel
   - `WORKER_SECRET` — gere com `openssl rand -hex 32` (anote, vai usar no Vercel também)
   - `ENABLE_SCHEDULER=1` (em prod liga o cron)
   - `CRON_TZ=America/Sao_Paulo`
4. **Networking → Generate Domain** — gera URL pública (ex: `cbrio-agent-worker-production.up.railway.app`).
5. **Smoke test:** `curl https://<url-railway>/health` deve responder `{ok:true}`.
6. **Conectar Vercel ao worker:** no dashboard Vercel do crmcbrio, Settings → Environment Variables, adicione:
   - `AGENT_WORKER_URL=https://<url-railway>` (sem trailing slash)
   - `WORKER_SECRET=<mesmo valor do Railway>`
7. **Redeploy Vercel** pra pegar as envs novas.
8. **Validar end-to-end:** entre em `/assistente-ia` no crmcbrio.vercel.app, clique "Executar" no card **⚡ Executor Financeiro**. Olhe os logs do Railway — deve aparecer `[worker] /run` e em seguida o loop de tool calls.

## Custos esperados

- Railway: ~US$ 5/mês (Hobby plan) — primeiros US$ 5 grátis no mês.
- Anthropic API: depende do uso. Cada run completa do financeiro ≈ 30-80k tokens com Sonnet = US$ 0,10–0,30 por run. 3 runs/dia × 30 dias ≈ US$ 9–27/mês.

Monitora pelo painel `/assistente-ia` (mostra `cost_usd` por run) ou pelo dashboard Anthropic.

## Estrutura

```
agent-worker/
├── package.json          Node 20+, ESM, TypeScript
├── tsconfig.json
├── railway.json          Config Railway (Nixpacks build)
├── Dockerfile            Fallback pra Fly/Cloud Run/Render
├── .env.example
├── skills/
│   └── financeiro-cbrio/
│       └── SKILL.md      Conhecimento de domínio
└── src/
    ├── server.ts         Express + HMAC auth + /run dispatch
    ├── scheduler.ts      node-cron jobs (9h, 14h, 19h)
    ├── lib/
    │   ├── auth.ts       Verify HMAC X-CBRio-Signature
    │   └── supabase.ts   Service-role client
    ├── tools/
    │   └── financeiroTools.ts   MCP in-process com 11 tools
    └── agents/
        └── financeiroAgent.ts   Loop query() + persistência em agent_runs/agent_steps
```

## Troubleshooting

- **`[worker] /run` retorna 401 "Assinatura inválida"** — `WORKER_SECRET` está diferente entre Vercel e Railway. Verifique env vars.
- **Worker crasha no boot** — confira `ANTHROPIC_API_KEY` e Supabase keys. O agent-worker exige tudo no env.
- **Run fica "running" pra sempre** — Agent SDK pode travar se tools custom lançarem exception sem `isError:true`. Olhe os logs do Railway.
- **Scheduler não dispara** — `ENABLE_SCHEDULER` precisa ser exatamente `1`. `CRON_TZ` afeta horário do disparo.
