-- Memoria de realocacoes e divisoes, para reaplicar ao reimportar a mesma
-- fatura e nas proximas (parcelas seguintes, mesma loja no mesmo cartao).
-- key: 'p:' + compra exata (cartao|data|descricao|valor|parcelas)
--      'd:' + descricao no cartao (cartao|descricao)
CREATE TABLE IF NOT EXISTS public.attribution_memory (
  user_id UUID NOT NULL,
  key TEXT NOT NULL,
  assigned_to TEXT NULL,
  shares JSONB NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
ALTER TABLE public.attribution_memory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own attribution select" ON public.attribution_memory;
DROP POLICY IF EXISTS "own attribution insert" ON public.attribution_memory;
DROP POLICY IF EXISTS "own attribution update" ON public.attribution_memory;
DROP POLICY IF EXISTS "own attribution delete" ON public.attribution_memory;
CREATE POLICY "own attribution select" ON public.attribution_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own attribution insert" ON public.attribution_memory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own attribution update" ON public.attribution_memory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own attribution delete" ON public.attribution_memory FOR DELETE USING (auth.uid() = user_id);
