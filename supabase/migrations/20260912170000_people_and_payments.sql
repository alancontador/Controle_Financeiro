-- Pessoas cadastradas pelo usuario (terceiros que usam o cartao e pagam
-- depois) e pagamentos recebidos deles. Pessoas da casa continuam vindo dos
-- cartoes (card_holders); esta tabela guarda os terceiros.
CREATE TABLE IF NOT EXISTS public.people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'third_party' CHECK (kind IN ('household', 'third_party')),
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own people select" ON public.people;
DROP POLICY IF EXISTS "own people insert" ON public.people;
DROP POLICY IF EXISTS "own people update" ON public.people;
DROP POLICY IF EXISTS "own people delete" ON public.people;
CREATE POLICY "own people select" ON public.people FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own people insert" ON public.people FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own people update" ON public.people FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own people delete" ON public.people FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.person_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  person TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS person_payments_user_person_idx ON public.person_payments(user_id, person);
ALTER TABLE public.person_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own payments select" ON public.person_payments;
DROP POLICY IF EXISTS "own payments insert" ON public.person_payments;
DROP POLICY IF EXISTS "own payments update" ON public.person_payments;
DROP POLICY IF EXISTS "own payments delete" ON public.person_payments;
CREATE POLICY "own payments select" ON public.person_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own payments insert" ON public.person_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own payments update" ON public.person_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own payments delete" ON public.person_payments FOR DELETE USING (auth.uid() = user_id);
