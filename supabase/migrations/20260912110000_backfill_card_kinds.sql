-- Converte lancamentos importados antes da separacao pessoa/cartao
-- (holder_name "NOME (final NNNN)") para holder_name = pessoa,
-- card_last_four = NNNN e card_kind inferido, e completa card_holders.
-- Idempotente: so toca linhas ainda no formato antigo.

-- 1) invoice_items: separa pessoa e numero
UPDATE public.invoice_items
SET card_last_four = substring(holder_name from '\(final (\d{4})\)$'),
    holder_name    = btrim(regexp_replace(holder_name, '\s*\(final \d{4}\)$', ''))
WHERE card_last_four IS NULL
  AND holder_name ~ '\(final \d{4}\)$';

-- 2) invoice_items: tipo inferido
--    principal = numero do cartao cadastrado; mesmo titular do principal = virtual; outra pessoa = adicional
WITH ctx AS (
  SELECT ii.id,
         cc.last_four_digits AS principal_last_four,
         (SELECT holder_name FROM public.card_holders h WHERE h.card_id = cc.id AND h.is_primary LIMIT 1) AS principal_holder
  FROM public.invoice_items ii
  JOIN public.invoices i ON i.id = ii.invoice_id
  JOIN public.credit_cards cc ON cc.id = i.card_id
)
UPDATE public.invoice_items ii
SET card_kind = CASE
  WHEN ii.card_last_four = ctx.principal_last_four THEN 'principal'
  WHEN upper(btrim(ii.holder_name)) = upper(btrim(coalesce(ctx.principal_holder, ''))) THEN 'virtual'
  ELSE 'adicional'
END
FROM ctx
WHERE ctx.id = ii.id AND ii.card_kind IS NULL AND ii.card_last_four IS NOT NULL;

-- 3) card_holders: uma linha por (pessoa, numero, tipo) vista nos lancamentos
--    3a) completa a linha antiga da pessoa (sem numero) com o primeiro numero dela
WITH firsts AS (
  SELECT DISTINCT ON (i.card_id, ii.holder_name) i.card_id, ii.holder_name, ii.card_last_four, ii.card_kind
  FROM public.invoice_items ii JOIN public.invoices i ON i.id = ii.invoice_id
  WHERE ii.card_last_four IS NOT NULL
  ORDER BY i.card_id, ii.holder_name, (ii.card_kind = 'principal') DESC, ii.card_last_four
)
UPDATE public.card_holders h
SET last_four = f.card_last_four, kind = f.card_kind
FROM firsts f
WHERE h.card_id = f.card_id AND h.last_four IS NULL
  AND upper(btrim(h.holder_name)) = upper(btrim(f.holder_name));

--    3b) insere os demais numeros que ainda nao existem
INSERT INTO public.card_holders (card_id, holder_name, last_four, kind, is_primary)
SELECT DISTINCT i.card_id, ii.holder_name, ii.card_last_four, ii.card_kind, false
FROM public.invoice_items ii JOIN public.invoices i ON i.id = ii.invoice_id
WHERE ii.card_last_four IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.card_holders h WHERE h.card_id = i.card_id AND h.last_four = ii.card_last_four);
