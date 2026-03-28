
-- Financial transaction categories (predefined + custom)
CREATE TABLE public.financial_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
  icon TEXT DEFAULT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seed system categories
INSERT INTO public.financial_categories (name, type, icon, is_system) VALUES
  ('Plastic Sales', 'income', '♻️', true),
  ('Collection Payments', 'income', '💰', true),
  ('Product Sales', 'income', '📦', true),
  ('Service Income', 'income', '🔧', true),
  ('Other Income', 'income', '💵', true),
  ('Transport', 'expense', '🚛', true),
  ('Labor', 'expense', '👷', true),
  ('Sorting', 'expense', '🗂️', true),
  ('Storage', 'expense', '🏪', true),
  ('Fuel', 'expense', '⛽', true),
  ('Equipment', 'expense', '🔨', true),
  ('Phone & Airtime', 'expense', '📱', true),
  ('Food & Meals', 'expense', '🍽️', true),
  ('Rent', 'expense', '🏠', true),
  ('Utilities', 'expense', '💡', true),
  ('Maintenance', 'expense', '🔧', true),
  ('Other Expense', 'expense', '📋', true);

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view system categories" ON public.financial_categories
  FOR SELECT TO authenticated USING (is_system = true);

CREATE POLICY "Users can view own categories" ON public.financial_categories
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON public.financial_categories
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete own categories" ON public.financial_categories
  FOR DELETE TO authenticated USING (auth.uid() = user_id AND is_system = false);

-- Financial transactions
CREATE TABLE public.financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.financial_categories(id),
  type TEXT NOT NULL DEFAULT 'income' CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'mpesa', 'bank', 'other')),
  reference_number TEXT,
  receipt_url TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.financial_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.financial_transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON public.financial_transactions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON public.financial_transactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON public.financial_transactions
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Financial budgets
CREATE TABLE public.financial_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.financial_categories(id),
  period_type TEXT NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('daily', 'weekly', 'monthly', 'annual')),
  amount NUMERIC NOT NULL DEFAULT 0,
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets" ON public.financial_budgets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets" ON public.financial_budgets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" ON public.financial_budgets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" ON public.financial_budgets
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
