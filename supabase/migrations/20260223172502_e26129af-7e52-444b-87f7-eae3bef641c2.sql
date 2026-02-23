
-- Credit Cards table
CREATE TABLE public.credit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nickname TEXT NOT NULL,
  brand TEXT NOT NULL,
  issuer_bank TEXT NOT NULL,
  last_four_digits TEXT NOT NULL,
  total_limit NUMERIC NOT NULL DEFAULT 0,
  closing_day INTEGER NOT NULL,
  due_day INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cards" ON public.credit_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cards" ON public.credit_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON public.credit_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cards" ON public.credit_cards FOR DELETE USING (auth.uid() = user_id);

-- Card Holders table
CREATE TABLE public.card_holders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  holder_name TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.card_holders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view holders of own cards" ON public.card_holders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.credit_cards WHERE credit_cards.id = card_holders.card_id AND credit_cards.user_id = auth.uid())
);
CREATE POLICY "Users can insert holders of own cards" ON public.card_holders FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.credit_cards WHERE credit_cards.id = card_holders.card_id AND credit_cards.user_id = auth.uid())
);
CREATE POLICY "Users can update holders of own cards" ON public.card_holders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.credit_cards WHERE credit_cards.id = card_holders.card_id AND credit_cards.user_id = auth.uid())
);
CREATE POLICY "Users can delete holders of own cards" ON public.card_holders FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.credit_cards WHERE credit_cards.id = card_holders.card_id AND credit_cards.user_id = auth.uid())
);

-- Invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  previous_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices of own cards" ON public.invoices FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.credit_cards WHERE credit_cards.id = invoices.card_id AND credit_cards.user_id = auth.uid())
);
CREATE POLICY "Users can insert invoices of own cards" ON public.invoices FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.credit_cards WHERE credit_cards.id = invoices.card_id AND credit_cards.user_id = auth.uid())
);
CREATE POLICY "Users can update invoices of own cards" ON public.invoices FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.credit_cards WHERE credit_cards.id = invoices.card_id AND credit_cards.user_id = auth.uid())
);
CREATE POLICY "Users can delete invoices of own cards" ON public.invoices FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.credit_cards WHERE credit_cards.id = invoices.card_id AND credit_cards.user_id = auth.uid())
);

-- Invoice Items table
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  holder_name TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'Outros',
  installment_current INTEGER,
  installment_total INTEGER,
  is_previous_balance BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items of own invoices" ON public.invoice_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.invoices
    JOIN public.credit_cards ON credit_cards.id = invoices.card_id
    WHERE invoices.id = invoice_items.invoice_id AND credit_cards.user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert items of own invoices" ON public.invoice_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices
    JOIN public.credit_cards ON credit_cards.id = invoices.card_id
    WHERE invoices.id = invoice_items.invoice_id AND credit_cards.user_id = auth.uid()
  )
);
CREATE POLICY "Users can update items of own invoices" ON public.invoice_items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.invoices
    JOIN public.credit_cards ON credit_cards.id = invoices.card_id
    WHERE invoices.id = invoice_items.invoice_id AND credit_cards.user_id = auth.uid()
  )
);
CREATE POLICY "Users can delete items of own invoices" ON public.invoice_items FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.invoices
    JOIN public.credit_cards ON credit_cards.id = invoices.card_id
    WHERE invoices.id = invoice_items.invoice_id AND credit_cards.user_id = auth.uid()
  )
);
