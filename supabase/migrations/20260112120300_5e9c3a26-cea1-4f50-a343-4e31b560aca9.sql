-- Create table for portfolio history snapshots
CREATE TABLE public.portfolio_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  total_value NUMERIC NOT NULL,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to avoid duplicate snapshots per day
CREATE UNIQUE INDEX idx_portfolio_history_user_date ON public.portfolio_history (user_id, snapshot_date);

-- Enable Row Level Security
ALTER TABLE public.portfolio_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own portfolio history" 
ON public.portfolio_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own portfolio history" 
ON public.portfolio_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolio history" 
ON public.portfolio_history 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolio history" 
ON public.portfolio_history 
FOR DELETE 
USING (auth.uid() = user_id);