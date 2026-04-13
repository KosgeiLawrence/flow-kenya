
-- Add new columns to financial_budgets
ALTER TABLE public.financial_budgets
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing rows to have a period_end based on period_type
UPDATE public.financial_budgets
SET period_end = CASE
  WHEN period_type = 'daily' THEN period_start::date
  WHEN period_type = 'weekly' THEN (period_start::date + INTERVAL '6 days')::date
  WHEN period_type = 'monthly' THEN (date_trunc('month', period_start::date) + INTERVAL '1 month - 1 day')::date
  WHEN period_type = 'annual' THEN (date_trunc('year', period_start::date) + INTERVAL '1 year - 1 day')::date
  ELSE (period_start::date + INTERVAL '30 days')::date
END
WHERE period_end IS NULL;
