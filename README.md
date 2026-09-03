# Controle Financeiro

Aplicacao web de controle financeiro pessoal: transacoes, categorias, orcamentos,
metas, cartoes, investimentos, relatorios e insights.

## Stack

React 18 + TypeScript + Vite + Tailwind CSS + shadcn-ui + Supabase (Postgres, Auth,
Edge Functions) + TanStack Query + Recharts.

## Rodando localmente

Requer Node.js 20+.

```sh
npm install
cp .env.example .env   # preencha com as credenciais do seu projeto Supabase
npm run dev
```

O app sobe em `http://localhost:8080`.

## Variaveis de ambiente

| Variavel | Descricao |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave publica (anon) do Supabase |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto Supabase |

Em desenvolvimento elas vem do `.env` (via Vite). Em producao o container gera
`env-config.js` em runtime a partir das variaveis do ambiente, e o app le de
`window.__env` — necessario porque o build do Vite e estatico e o EasyPanel nao
passa variaveis como build args.

## Deploy

Build multi-stage (Node 20 -> Nginx) via `Dockerfile`, publicado no EasyPanel.

```sh
docker build -t controle-financeiro .
docker run -p 8080:80 \
  -e VITE_SUPABASE_URL=... \
  -e VITE_SUPABASE_PUBLISHABLE_KEY=... \
  controle-financeiro
```

## Edge Functions (Supabase)

| Funcao | O que faz |
|---|---|
| `analyze-finances` | Gera insights financeiros com IA a partir das transacoes e orcamentos |
| `fetch-quotes` | Busca cotacoes para o modulo de investimentos |
| `process-recurring-transactions` | Materializa transacoes recorrentes |

Deploy: `supabase functions deploy <nome>`.
