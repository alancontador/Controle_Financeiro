-- Create dividends table for tracking income from investments
CREATE TABLE public.dividends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  investment_id UUID REFERENCES public.investments(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'dividend', -- dividend, jcp, rental (FIIs)
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dividends ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own dividends" 
ON public.dividends 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own dividends" 
ON public.dividends 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dividends" 
ON public.dividends 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dividends" 
ON public.dividends 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_dividends_user_id ON public.dividends(user_id);
CREATE INDEX idx_dividends_investment_id ON public.dividends(investment_id);
CREATE INDEX idx_dividends_payment_date ON public.dividends(payment_date);

-- Add trigger for updated_at
CREATE TRIGGER update_dividends_updated_at
BEFORE UPDATE ON public.dividends
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();