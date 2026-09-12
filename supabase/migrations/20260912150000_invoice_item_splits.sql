-- Dividir uma compra entre pessoas (ex.: hotel de viagem pago num cartao so).
-- A compra continua um lancamento unico na fatura; as partes dizem quanto
-- cabe a cada pessoa e a despesa espelhada vira uma por parte.
CREATE TABLE IF NOT EXISTS public.invoice_item_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.invoice_items(id) ON DELETE CASCADE,
  person TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (item_id, person)
);
CREATE INDEX IF NOT EXISTS invoice_item_splits_item_id_idx ON public.invoice_item_splits(item_id);

ALTER TABLE public.invoice_item_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own splits select" ON public.invoice_item_splits;
DROP POLICY IF EXISTS "own splits insert" ON public.invoice_item_splits;
DROP POLICY IF EXISTS "own splits update" ON public.invoice_item_splits;
DROP POLICY IF EXISTS "own splits delete" ON public.invoice_item_splits;
CREATE POLICY "own splits select" ON public.invoice_item_splits FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.invoice_items ii JOIN public.invoices i ON i.id = ii.invoice_id JOIN public.credit_cards c ON c.id = i.card_id
          WHERE ii.id = invoice_item_splits.item_id AND c.user_id = auth.uid()));
CREATE POLICY "own splits insert" ON public.invoice_item_splits FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.invoice_items ii JOIN public.invoices i ON i.id = ii.invoice_id JOIN public.credit_cards c ON c.id = i.card_id
          WHERE ii.id = invoice_item_splits.item_id AND c.user_id = auth.uid()));
CREATE POLICY "own splits update" ON public.invoice_item_splits FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.invoice_items ii JOIN public.invoices i ON i.id = ii.invoice_id JOIN public.credit_cards c ON c.id = i.card_id
          WHERE ii.id = invoice_item_splits.item_id AND c.user_id = auth.uid()));
CREATE POLICY "own splits delete" ON public.invoice_item_splits FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.invoice_items ii JOIN public.invoices i ON i.id = ii.invoice_id JOIN public.credit_cards c ON c.id = i.card_id
          WHERE ii.id = invoice_item_splits.item_id AND c.user_id = auth.uid()));

-- Uma compra dividida vira varias despesas espelhadas: a unicidade cai, o indice fica.
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_invoice_item_id_key;
CREATE INDEX IF NOT EXISTS transactions_invoice_item_id_idx ON public.transactions(invoice_item_id);
