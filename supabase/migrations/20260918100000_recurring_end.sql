-- Recorrencias com prazo: ate uma data ou por um numero de parcelas.
-- As transacoes geradas guardam de qual recorrencia vieram.
ALTER TABLE public.recurring_transactions
  ADD COLUMN IF NOT EXISTS end_date DATE NULL,
  ADD COLUMN IF NOT EXISTS installments_total INTEGER NULL CHECK (installments_total IS NULL OR installments_total > 0),
  ADD COLUMN IF NOT EXISTS installments_done INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS recurring_id UUID NULL REFERENCES public.recurring_transactions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS transactions_recurring_id_idx ON public.transactions(recurring_id);
