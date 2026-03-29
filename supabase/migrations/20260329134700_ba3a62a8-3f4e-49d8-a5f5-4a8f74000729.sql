
-- Aggregator purchase orders for waste procurement
CREATE TABLE public.aggregator_purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  po_number TEXT NOT NULL DEFAULT ('PO-' || substr(gen_random_uuid()::text, 1, 8)),
  supplier_name TEXT NOT NULL,
  supplier_phone TEXT,
  supplier_role TEXT DEFAULT 'waste_picker',
  material_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  delivered_at TIMESTAMPTZ,
  grn_number TEXT,
  delivered_quantity NUMERIC,
  delivery_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.aggregator_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchase orders" ON public.aggregator_purchase_orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchase orders" ON public.aggregator_purchase_orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own purchase orders" ON public.aggregator_purchase_orders
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own purchase orders" ON public.aggregator_purchase_orders
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchase orders" ON public.aggregator_purchase_orders
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
