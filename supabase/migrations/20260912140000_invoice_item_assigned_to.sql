-- Realocar uma compra para outra pessoa sem mudar o cartao onde foi feita.
-- holder_name = titular do cartao (vem da fatura); assigned_to = responsavel
-- pela despesa quando diferente. Pessoa efetiva = coalesce(assigned_to, holder_name).
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS assigned_to TEXT NULL;
