
-- Client collections (field collection from clients)
CREATE TABLE public.client_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waste_picker_id uuid NOT NULL,
  client_name text NOT NULL,
  client_phone text,
  client_email text,
  material_type text NOT NULL,
  quantity_kg numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  location_name text,
  collection_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own client collections" ON public.client_collections FOR INSERT TO authenticated WITH CHECK (auth.uid() = waste_picker_id);
CREATE POLICY "Users can view own client collections" ON public.client_collections FOR SELECT TO authenticated USING (auth.uid() = waste_picker_id);
CREATE POLICY "Users can update own client collections" ON public.client_collections FOR UPDATE TO authenticated USING (auth.uid() = waste_picker_id);
CREATE POLICY "Admins can view all client collections" ON public.client_collections FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Pickup requests (waste picker -> aggregator/recycler)
CREATE TABLE public.pickup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waste_picker_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  target_role text NOT NULL DEFAULT 'aggregator',
  material_type text NOT NULL,
  quantity_kg numeric NOT NULL DEFAULT 0,
  proposed_price_per_kg numeric,
  total_amount numeric,
  location_name text,
  scheduled_date timestamptz,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  response_notes text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pickup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Waste pickers can insert own requests" ON public.pickup_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = waste_picker_id);
CREATE POLICY "Waste pickers can view own requests" ON public.pickup_requests FOR SELECT TO authenticated USING (auth.uid() = waste_picker_id);
CREATE POLICY "Waste pickers can update own requests" ON public.pickup_requests FOR UPDATE TO authenticated USING (auth.uid() = waste_picker_id);
CREATE POLICY "Target users can view requests for them" ON public.pickup_requests FOR SELECT TO authenticated USING (auth.uid() = target_user_id);
CREATE POLICY "Target users can update request status" ON public.pickup_requests FOR UPDATE TO authenticated USING (auth.uid() = target_user_id);
CREATE POLICY "Admins can view all pickup requests" ON public.pickup_requests FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow waste pickers to see aggregator/recycler profiles for selection
CREATE POLICY "Waste pickers can view aggregator recycler profiles" ON public.profiles FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'waste_picker'::app_role) AND EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = profiles.user_id AND ur.role IN ('aggregator'::app_role, 'recycler'::app_role)
  )
);

-- Enable realtime for pickup_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_requests;
