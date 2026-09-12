-- Integracao da fatura de cartao com as financas.
-- Spec: docs/superpowers/specs/2026-09-11-fatura-cartao-integracao-design.md

-- 1) Lancamento de fatura passa a apontar para a categoria do usuario
--    (mantem a coluna `category` texto para exibicao e compatibilidade).
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS category_id UUID NULL REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS invoice_items_category_id_idx ON public.invoice_items(category_id);

-- 2) Transacao espelhada de um lancamento de fatura. UNIQUE evita duplicar o
--    espelho; CASCADE apaga a despesa quando o lancamento (ou a fatura, ou o
--    cartao) e excluido.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS invoice_item_id UUID NULL UNIQUE REFERENCES public.invoice_items(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS transactions_invoice_item_id_idx ON public.transactions(invoice_item_id);
