
-- Material types with admin-managed pricing
CREATE TABLE public.material_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  price_per_unit NUMERIC(10,2) NOT NULL DEFAULT 0,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.material_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view material types"
  ON public.material_types FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage material types"
  ON public.material_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_material_types_updated_at
  BEFORE UPDATE ON public.material_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed common material types
INSERT INTO public.material_types (name, unit, price_per_unit, icon) VALUES
  ('PET Bottles', 'kg', 35.00, 'bottle'),
  ('HDPE Plastics', 'kg', 25.00, 'package'),
  ('Cardboard', 'kg', 15.00, 'box'),
  ('Glass', 'kg', 10.00, 'glass-water'),
  ('Metal/Aluminium', 'kg', 80.00, 'circle'),
  ('E-Waste', 'kg', 120.00, 'cpu'),
  ('Paper', 'kg', 12.00, 'file-text'),
  ('Organic Waste', 'kg', 5.00, 'leaf');

-- Collections tracking
CREATE TABLE public.collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_type_id UUID NOT NULL REFERENCES public.material_types(id),
  quantity NUMERIC(10,2) NOT NULL,
  batch_id TEXT NOT NULL DEFAULT 'B-' || substr(gen_random_uuid()::text, 1, 8),
  location_lat NUMERIC(10,7),
  location_lng NUMERIC(10,7),
  location_name TEXT,
  notes TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collections"
  ON public.collections FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collections"
  ON public.collections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all collections"
  ON public.collections FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_collections_user_id ON public.collections(user_id);
CREATE INDEX idx_collections_collected_at ON public.collections(collected_at);

-- Payments / M-Pesa transactions
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  phone_number TEXT NOT NULL,
  mpesa_receipt_number TEXT,
  merchant_request_id TEXT,
  checkout_request_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  result_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payments"
  ON public.payments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_payments_user_id ON public.payments(user_id);

-- Pickup schedules
CREATE TABLE public.pickup_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  location_lat NUMERIC(10,7),
  location_lng NUMERIC(10,7),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pickup_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedules"
  ON public.pickup_schedules FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedules"
  ON public.pickup_schedules FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
  ON public.pickup_schedules FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all schedules"
  ON public.pickup_schedules FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_pickup_schedules_updated_at
  BEFORE UPDATE ON public.pickup_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Training resources
CREATE TABLE public.training_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  content_url TEXT,
  thumbnail_url TEXT,
  duration_minutes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.training_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view training resources"
  ON public.training_resources FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage training resources"
  ON public.training_resources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed some training resources
INSERT INTO public.training_resources (title, description, category, duration_minutes) VALUES
  ('Waste Sorting 101', 'Learn how to properly sort recyclable materials for maximum value', 'sorting', 15),
  ('Safety on the Job', 'Essential safety practices for waste collection', 'safety', 20),
  ('Maximizing Earnings', 'Tips and strategies to increase your daily collection earnings', 'business', 10),
  ('Using Your QR ID', 'How to use your digital QR code for material verification', 'platform', 5);

-- Enable realtime for collections and payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.collections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
