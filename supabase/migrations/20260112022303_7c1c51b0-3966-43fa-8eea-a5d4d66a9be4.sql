-- Add parent_category_id column to categories table for subcategory support
ALTER TABLE public.categories 
ADD COLUMN parent_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create index for better performance on parent lookups
CREATE INDEX idx_categories_parent ON public.categories(parent_category_id);

-- Add RLS policy for subcategories (inherits from parent policies already in place)
-- No additional policies needed since the existing user_id based policies will work