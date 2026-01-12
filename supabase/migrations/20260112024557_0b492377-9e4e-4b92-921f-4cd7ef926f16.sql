-- Tabela de classes de ativos (Ações BR, Ações EUA, Renda Fixa, FIIs, Cripto, ETFs)
CREATE TABLE public.investment_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  target_allocation NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (target_allocation >= 0 AND target_allocation <= 100),
  color TEXT NOT NULL DEFAULT 'hsl(255 75% 64%)',
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de ativos individuais
CREATE TABLE public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  class_id UUID REFERENCES public.investment_classes(id) ON DELETE SET NULL,
  ticker TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stock_br', 'stock_us', 'fixed_income', 'reits', 'crypto', 'etf_br', 'etf_us')),
  quantity NUMERIC(18,8) NOT NULL DEFAULT 0,
  average_price NUMERIC(18,8) NOT NULL DEFAULT 0,
  current_price NUMERIC(18,8) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.investment_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Políticas para investment_classes
CREATE POLICY "Users can view their own investment classes"
ON public.investment_classes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own investment classes"
ON public.investment_classes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investment classes"
ON public.investment_classes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investment classes"
ON public.investment_classes FOR DELETE
USING (auth.uid() = user_id);

-- Políticas para investments
CREATE POLICY "Users can view their own investments"
ON public.investments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own investments"
ON public.investments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investments"
ON public.investments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investments"
ON public.investments FOR DELETE
USING (auth.uid() = user_id);

-- Triggers para updated_at
CREATE TRIGGER update_investment_classes_updated_at
  BEFORE UPDATE ON public.investment_classes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX idx_investment_classes_user_id ON public.investment_classes(user_id);
CREATE INDEX idx_investments_user_id ON public.investments(user_id);
CREATE INDEX idx_investments_class_id ON public.investments(class_id);