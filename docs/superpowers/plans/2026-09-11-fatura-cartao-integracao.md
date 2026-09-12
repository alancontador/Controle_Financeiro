# Fatura de cartão — integração — Implementation Plan

Spec: `docs/superpowers/specs/2026-09-11-fatura-cartao-integracao-design.md`

Regras: TDD nos módulos puros (`src/lib/**`), `npm test` verde antes de cada commit,
`npx tsc -p tsconfig.app.json --noEmit` limpo, deploy ao fim de cada entrega com
`ssh hostinger-vps 'sh /opt/controle-financeiro/scripts/deploy.sh'`. Migrations
vão para `supabase/migrations/` e são aplicadas no SQL Editor do Supabase.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/pdf/bradesco.ts` | + `header` (bandeira, banco, final, limite, fechamento, titulares) |
| `src/lib/pdf/categorize.ts` (novo) | `normalizeDescription`, `suggestCategory(desc, memory, rules)`, `CATEGORY_RULES`, `DEFAULT_CATEGORY_STYLE` |
| `src/lib/cards/period.ts` (novo) | `invoicePeriodFromClosing(closingDate)` → `{ period_start, period_end }` |
| `src/lib/cards/projection.ts` (novo) | `projectUpcomingInvoices(items, invoices, months)` |
| `src/lib/cards/mirror.ts` (novo) | `itemToTransaction(item)` / `isPaymentLine(desc)` (puro) |
| `src/hooks/useInvoiceImport.tsx` (novo) | Orquestra: cartão (acha/cria) → titulares → fatura (dup) → itens → espelho |
| `src/components/cards/ImportPdfModal.tsx` | Aceita `categories` do usuário; usa `suggestCategory`; expõe `onParsed(header)` |
| `src/components/cards/ImportInvoiceFlow.tsx` (novo) | Fluxo do botão da aba Cartões (PDF → cartão → revisão) |
| `src/components/cards/UpcomingInvoices.tsx` (novo) | Tabela 6 meses comprometido/estimado |
| `src/components/dashboard/UpcomingInvoicesCard.tsx` (novo) | Card do Dashboard + indicador 3 meses × renda |
| `src/pages/Cards.tsx` | Botão Importar fatura, Excluir cartão, seção Próximas faturas |
| `src/pages/CardInvoices.tsx` | Excluir fatura, Próximas faturas do cartão |
| `src/hooks/useCreditCards.tsx` | `deleteInvoice`, `findCardByLastFour`, `replaceInvoiceItems` |
| `src/hooks/useInsights.tsx` + `supabase/functions/analyze-finances/index.ts` | body `{ projection }` no contexto |
| `supabase/migrations/2026091101_invoice_integration.sql` | `invoice_items.category_id`, `transactions.invoice_item_id` |

## Entrega 1 — Importar pela aba Cartões

- [ ] T1.1 `bradesco.ts`: teste `header` (sintético + real local) → implementar. Fechamento: linha "Disponível em dd/mm/aaaa" (pág. 2) ou, na falta, previsão de fechamento − 1 mês.
- [ ] T1.2 `period.ts`: teste `invoicePeriodFromClosing('2026-08-28')` → `{2026-07-29, 2026-08-28}`; borda de mês (31/01 → 01/01..31/01? não: 01/01 é fechamento anterior+1 → `{2026-01-01? }`) — definir: start = mesma data no mês anterior + 1 dia, clamp no fim do mês.
- [ ] T1.3 `useCreditCards`: `findCardByLastFour`, `deleteInvoice`, `replaceInvoiceItems(invoiceId)`; `createCard` já existe.
- [ ] T1.4 `CardModal`: prop `initial?: Partial<CardData>` para pré-preencher (sem quebrar edição).
- [ ] T1.5 `ImportInvoiceFlow` + botão em `Cards.tsx`; navegação para a fatura ao confirmar; dup → AlertDialog substituir/cancelar.
- [ ] T1.6 Excluir cartão (Cards.tsx) e excluir fatura (CardInvoices.tsx) com AlertDialog.
- [ ] T1.7 tsc + build + deploy + smoke no navegador (boot). Commit.

## Entrega 2 — Categorização

- [ ] T2.1 Migration `invoice_items.category_id`. Aplicar no Supabase.
- [ ] T2.2 `categorize.ts`: testes (normalize remove parcela/dígitos/acentos; memória vence regra; regra por palavra; fallback Outros) → implementar com `CATEGORY_RULES` (~60 termos) e `DEFAULT_CATEGORY_STYLE` (ícone/cor por nome).
- [ ] T2.3 `useInvoiceImport`: carrega memória (`invoice_items` + `transactions` do usuário, últimos 24 meses), garante categorias (cria as que faltarem via `addCategory`), aplica `suggestCategory`.
- [ ] T2.4 `ImportPdfModal`: select lista `categories` do usuário (expense); grava `category_id` + `category` nome.
- [ ] T2.5 tsc + test + deploy. Commit.

## Entrega 3 — Integração, projeção, saúde

- [ ] T3.1 Migration `transactions.invoice_item_id` (UNIQUE, CASCADE). Aplicar.
- [ ] T3.2 `mirror.ts`: testes (pagamento não espelha; estorno negativo; data = compra; category_id) → implementar. `useInvoiceImport` insere transações após itens (usa ids retornados).
- [ ] T3.3 `projection.ts`: testes (parcela 09/10 → 1 futura; 02/10 → 8 futuras no valor; recorrente em ≥2 faturas → estimado; item sem parcela em 1 fatura → nada; 6 meses) → implementar.
- [ ] T3.4 `UpcomingInvoices` em Cards.tsx (por cartão) e CardInvoices.tsx.
- [ ] T3.5 `UpcomingInvoicesCard` no Dashboard: próximo mês (comprometido/provável) + "comprometido 3 meses × renda média 3 meses" (renda de `useDashboardStats`/transactions income).
- [ ] T3.6 Insights: `useInsights` envia `{ projection }`; função inclui bloco "COMPROMISSOS FUTUROS NO CARTÃO" no contexto. `deno check`.
- [ ] T3.7 tsc + test + build + deploy + verificação no navegador. Commit. Atualizar memória/README.
