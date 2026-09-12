-- Pessoa como dimensao das transacoes.
-- holder_name: quem gastou (vem do bloco da fatura no espelho; opcional em
-- lancamentos manuais). card_last_four: cartao de origem, quando houver.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS holder_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS card_last_four TEXT NULL;

CREATE INDEX IF NOT EXISTS transactions_holder_name_idx ON public.transactions(user_id, holder_name);

-- Despesas ja espelhadas de faturas herdam pessoa e cartao do lancamento de origem.
UPDATE public.transactions t
SET holder_name = ii.holder_name, card_last_four = ii.card_last_four
FROM public.invoice_items ii
WHERE ii.id = t.invoice_item_id AND t.holder_name IS NULL;
