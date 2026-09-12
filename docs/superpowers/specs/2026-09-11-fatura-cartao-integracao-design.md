# Fatura de cartão: importação pela aba Cartões, categorização e integração com as finanças

Data: 2026-09-11. Aprovado pelo usuário em conversa.

## Contexto

A importação da Fatura Mensal do Bradesco (PDF) passou a funcionar em 2026-09-11
(`src/lib/pdf/`). Mas o módulo de cartões é uma ilha: Dashboard, Orçamentos,
Relatórios e Insights leem só de `transactions` + `categories`; `invoice_items`
não aparece em lugar nenhum. E há dois sistemas de categoria: a lista fixa do
cartão (texto, `CARD_CATEGORIES`) e a tabela `categories` do usuário (ícone,
cor, orçamento).

## Decisões tomadas com o usuário

| Decisão | Escolha |
|---|---|
| Pagamento da fatura em Transações | **Não registra.** Cada compra vira uma despesa; pagamento seria duplicar |
| Data da despesa espelhada | **Data da compra** (não o vencimento): orçamento e análise por categoria fazem sentido |
| Estornos | Despesa **negativa** na categoria — reduz o gasto, efeito real |
| Categorização | Memória (mesma descrição já categorizada) → regras por palavra-chave → "Outros" |
| Categorias | Unificar nas categorias do usuário (`categories`); criar as que faltarem |
| Projeção | Comprometido (parcelas restantes) e estimado (recorrentes) **separados**, mês a mês |
| Onde mostrar | Aba Cartões (6 meses por cartão) + card no Dashboard + contexto do Insights |
| Exclusão | Botões para excluir **fatura** e **cartão**, com confirmação |
| Insights (Gemini) | Fica pendente do `GEMINI_API_KEY`; não bloqueia as entregas |

## Entrega 1 — Importar fatura pela aba Cartões

**Parser (`bradesco.ts`)** passa a devolver `header`: `brand` ("ELO GRAFITE"),
`bank` ("Bradesco"), `lastFour` (do "Número do Cartão"), `limit` (Limite de
compras), `dueDate`, `closingDate` ("Disponível em dd/mm/aaaa" ou a data de
fechamento impressa), `holders` (nomes dos blocos de cartão).

**Botão "Importar fatura"** ao lado de "Novo Cartão" em `Cards.tsx`:
1. Seleciona PDF → `extractPdfLines` → `parseBradescoFatura`
2. Cartão com o mesmo `last_four_digits` já existe → usa. Senão abre
   `CardModal` pré-preenchido (nickname "Bradesco ELO Grafite", brand, banco,
   final, limite, fechamento, vencimento) para o usuário confirmar
3. Cria `card_holders` que faltarem (nomes dos blocos)
4. Cria a fatura do período: `period_end` = data de fechamento da fatura,
   `period_start` = fechamento anterior + 1 dia (mesmo dia do mês anterior)
5. Se já existe fatura desse cartão com o mesmo `period_end`: pergunta se
   substitui (apaga itens e transações espelhadas, reimporta) ou cancela
6. Abre o modal de revisão (Conferência + itens) e, ao confirmar, importa e
   navega para `/cartoes/:id/faturas`

## Entrega 2 — Categorização inteligente

`src/lib/pdf/categorize.ts` (puro, testado):

1. **Memória**: `normalize(description)` (maiúsculas, sem acento, sem
   dígitos/parcela, espaços únicos) → última categoria usada em `invoice_items`
   ou `transactions` do usuário com a mesma chave
2. **Regras**: tabela de palavras-chave → nome de categoria (~60 termos:
   farmácia/drogaria, mercado/atacadão/extra, posto/combustível, pet/vet,
   estacionamento/parking, Apple/Netflix/Spotify/Hotmart → Assinaturas,
   restaurante/lanchonete/padaria/iFood, Uber/99, clínica/hospital/laboratório,
   decathlon/besni/renner → Vestuário/Esporte, IOF/anuidade/juros → Tarifas)
3. Sobra → "Outros"

Categorias alvo que não existirem em `categories` do usuário são criadas
(`type='expense'`, ícone e cor padrão por categoria). O modal de revisão passa
a listar as categorias do usuário. `invoice_items` ganha `category_id`
(mantém `category` texto para exibição).

## Entrega 3 — Integração, projeções e saúde

**Migration**: `transactions.invoice_item_id UUID UNIQUE NULL REFERENCES
invoice_items(id) ON DELETE CASCADE`; `invoice_items.category_id UUID NULL
REFERENCES categories(id) ON DELETE SET NULL`.

**Espelhamento** ao confirmar a importação: para cada item que **não** é
pagamento (descrição casa `PAGTO|PAGAMENTO`), insere em `transactions`
(`type='expense'`, `amount` = valor do item — negativo em estorno, `date` =
data da compra, `category_id`, `description`, `invoice_item_id`). Excluir a
fatura ou o cartão cascateia para itens e transações.

**Projeção** (`src/lib/cards/projection.ts`, puro, testado), a partir de
todos os `invoice_items` do usuário:
- *Comprometido*: item com parcela N/M → M−N parcelas futuras do mesmo valor,
  uma por mês a partir do mês seguinte à fatura
- *Estimado*: descrição normalizada que aparece em ≥ 2 faturas distintas
  (ou ≥ 2 vezes na mesma fatura) → média do valor, 1× por mês
- Saída: `[{ month: 'aaaa-mm', committed, estimated }]` para 6 meses

**UI**: seção "Próximas faturas" em `Cards.tsx` (por cartão) e em
`CardInvoices.tsx`; card "Próximas faturas" no Dashboard (`Index.tsx`) com o
próximo mês (comprometido / provável) e o indicador "comprometido nos próximos
3 meses × renda média dos últimos 3 meses".

**Insights**: `useInsights` envia `{ projection }` no body de
`analyze-finances`; a função inclui no contexto da IA.

## Exclusão

- `CardInvoices.tsx`: botão "Excluir fatura" (AlertDialog de confirmação)
- `Cards.tsx`: botão "Excluir" no card (AlertDialog: "apaga todas as faturas,
  lançamentos e as despesas espelhadas")

## Fora de escopo

Outros bancos além do Bradesco; transferências como tipo de transação;
edição de transação espelhada refletindo de volta na fatura.
