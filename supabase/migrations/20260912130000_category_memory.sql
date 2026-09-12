-- Memoria de categorizacao do usuario: descricao normalizada -> categoria.
-- Antes a memoria era inferida dos proprios lancamentos/despesas; excluir ou
-- substituir uma fatura apagava a memoria junto. Esta tabela sobrevive.
CREATE TABLE IF NOT EXISTS public.category_memory (
  user_id UUID NOT NULL,
  key TEXT NOT NULL,
  category_name TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

ALTER TABLE public.category_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own category memory select" ON public.category_memory;
DROP POLICY IF EXISTS "own category memory insert" ON public.category_memory;
DROP POLICY IF EXISTS "own category memory update" ON public.category_memory;
DROP POLICY IF EXISTS "own category memory delete" ON public.category_memory;
CREATE POLICY "own category memory select" ON public.category_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own category memory insert" ON public.category_memory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own category memory update" ON public.category_memory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own category memory delete" ON public.category_memory FOR DELETE USING (auth.uid() = user_id);
