-- Migration: Add category_id to budgets table for per-category monthly budget limits

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON public.budgets(category_id);
