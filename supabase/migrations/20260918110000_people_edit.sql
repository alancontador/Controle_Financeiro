-- Editar pessoas: renomear propaga para tudo que guarda o nome, e o nome antigo
-- (o que vem impresso na fatura) fica como apelido para as proximas importacoes
-- caírem na pessoa certa.
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS aliases TEXT[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.rename_person(p_old TEXT, p_new TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_old IS NULL OR p_new IS NULL OR btrim(p_new) = '' OR p_old = p_new THEN RETURN; END IF;

  -- titulares dos cartoes do usuario
  UPDATE card_holders h SET holder_name = p_new
    FROM credit_cards c WHERE h.card_id = c.id AND c.user_id = uid AND h.holder_name = p_old;

  -- lancamentos das faturas dos cartoes do usuario
  UPDATE invoice_items i SET holder_name = p_new
    FROM invoices inv JOIN credit_cards c ON c.id = inv.card_id
    WHERE i.invoice_id = inv.id AND c.user_id = uid AND i.holder_name = p_old;
  UPDATE invoice_items i SET assigned_to = p_new
    FROM invoices inv JOIN credit_cards c ON c.id = inv.card_id
    WHERE i.invoice_id = inv.id AND c.user_id = uid AND i.assigned_to = p_old;
  UPDATE invoice_item_splits s SET person = p_new
    FROM invoice_items i JOIN invoices inv ON inv.id = i.invoice_id JOIN credit_cards c ON c.id = inv.card_id
    WHERE s.item_id = i.id AND c.user_id = uid AND s.person = p_old;

  UPDATE transactions SET holder_name = p_new WHERE user_id = uid AND holder_name = p_old;
  UPDATE person_payments SET person = p_new WHERE user_id = uid AND person = p_old;

  -- memoria de atribuicao: realocacao e partes (jsonb [{person, fraction}])
  UPDATE attribution_memory SET assigned_to = p_new WHERE user_id = uid AND assigned_to = p_old;
  UPDATE attribution_memory m SET shares = (
      SELECT jsonb_agg(CASE WHEN e->>'person' = p_old THEN jsonb_set(e, '{person}', to_jsonb(p_new)) ELSE e END)
      FROM jsonb_array_elements(m.shares) e)
    WHERE user_id = uid AND shares IS NOT NULL AND shares @> jsonb_build_array(jsonb_build_object('person', p_old));
END;
$$;

REVOKE ALL ON FUNCTION public.rename_person(TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.rename_person(TEXT, TEXT) TO authenticated;
