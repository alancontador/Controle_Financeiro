-- Categorias duplicadas: duas telas semeavam as categorias padrao ao mesmo
-- tempo e cada usuario ficou com o conjunto em dobro. Funde as repetidas
-- (mantem a mais antiga e reaponta tudo que referenciava as outras) e um
-- indice unico impede que volte a acontecer.
CREATE OR REPLACE FUNCTION public.merge_duplicate_categories(p_user UUID DEFAULT auth.uid())
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  removed INTEGER := 0;
BEGIN
  IF p_user IS NULL THEN RETURN 0; END IF;
  -- so o proprio usuario (ou o service role, sem auth.uid()) pode fundir as suas
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user THEN RAISE EXCEPTION 'not allowed'; END IF;

  FOR r IN
    SELECT keep.id AS keep_id, dup.id AS dup_id
    FROM categories dup
    JOIN LATERAL (
      SELECT c.id FROM categories c
      WHERE c.user_id = dup.user_id AND lower(c.name) = lower(dup.name) AND c.type = dup.type
      ORDER BY c.created_at, c.id LIMIT 1
    ) keep ON keep.id <> dup.id
    WHERE dup.user_id = p_user
  LOOP
    UPDATE transactions SET category_id = r.keep_id WHERE category_id = r.dup_id;
    UPDATE invoice_items SET category_id = r.keep_id WHERE category_id = r.dup_id;
    UPDATE recurring_transactions SET category_id = r.keep_id WHERE category_id = r.dup_id;
    UPDATE categories SET parent_category_id = r.keep_id WHERE parent_category_id = r.dup_id;
    -- orcamento: se ja existe um para a categoria mantida no mesmo periodo, o repetido some
    DELETE FROM budgets b WHERE b.category_id = r.dup_id
      AND EXISTS (SELECT 1 FROM budgets k WHERE k.category_id = r.keep_id AND k.user_id = b.user_id AND k.period = b.period);
    UPDATE budgets SET category_id = r.keep_id WHERE category_id = r.dup_id;
    DELETE FROM categories WHERE id = r.dup_id;
    removed := removed + 1;
  END LOOP;
  RETURN removed;
END;
$$;
REVOKE ALL ON FUNCTION public.merge_duplicate_categories(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.merge_duplicate_categories(UUID) TO authenticated;

-- funde para todos os usuarios existentes
SELECT public.merge_duplicate_categories(u.id) FROM auth.users u;

CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_type_key
  ON public.categories (user_id, lower(name), type);
