
-- Table for recycler orders/contracts
CREATE TABLE public.recycler_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  supplier_name TEXT NOT NULL,
  material_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recycler_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders" ON public.recycler_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON public.recycler_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orders" ON public.recycler_orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own orders" ON public.recycler_orders FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all orders" ON public.recycler_orders FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_recycler_orders_updated_at BEFORE UPDATE ON public.recycler_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table for recycler products (finished goods)
CREATE TABLE public.recycler_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  material_source TEXT,
  stock_quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  price_per_unit NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recycler_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products" ON public.recycler_products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own products" ON public.recycler_products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON public.recycler_products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own products" ON public.recycler_products FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all products" ON public.recycler_products FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_recycler_products_updated_at BEFORE UPDATE ON public.recycler_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
