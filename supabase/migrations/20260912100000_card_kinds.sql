-- Separacao por pessoa e por cartao dentro de uma fatura.
-- card_holders passa a ter uma linha por cartao (numero + tipo) alem da pessoa;
-- o tipo escolhido pelo usuario fica lembrado por numero para as proximas faturas.
ALTER TABLE public.card_holders
  ADD COLUMN IF NOT EXISTS last_four TEXT NULL,
  ADD COLUMN IF NOT EXISTS kind TEXT NULL CHECK (kind IN ('principal', 'adicional', 'virtual'));

CREATE UNIQUE INDEX IF NOT EXISTS card_holders_card_last_four_key
  ON public.card_holders(card_id, last_four) WHERE last_four IS NOT NULL;

-- Cada lancamento sabe de qual cartao (numero) veio e o tipo dele na epoca.
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS card_last_four TEXT NULL,
  ADD COLUMN IF NOT EXISTS card_kind TEXT NULL CHECK (card_kind IN ('principal', 'adicional', 'virtual'));
