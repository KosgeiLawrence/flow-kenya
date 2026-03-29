
-- Table for manual balance sheet entries (assets, liabilities, equity)
CREATE TABLE public.balance_sheet_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  section TEXT NOT NULL DEFAULT 'asset',
  sub_section TEXT NOT NULL DEFAULT 'current_asset',
  account_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  is_auto BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.balance_sheet_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own balance sheet items"
  ON public.balance_sheet_items FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own balance sheet items"
  ON public.balance_sheet_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own balance sheet items"
  ON public.balance_sheet_items FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own balance sheet items"
  ON public.balance_sheet_items FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all balance sheet items"
  ON public.balance_sheet_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
