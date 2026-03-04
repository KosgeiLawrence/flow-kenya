
-- Allow aggregators to view recycler roles
CREATE POLICY "Aggregators can view recycler roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'aggregator'::app_role) AND role = 'recycler'::app_role
);

-- Allow aggregators to view recycler profiles
CREATE POLICY "Aggregators can view recycler profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'aggregator'::app_role)
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = profiles.user_id AND ur.role = 'recycler'::app_role
  )
);

-- Allow aggregators to view available recycler products
CREATE POLICY "Aggregators can view recycler products"
ON public.recycler_products FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'aggregator'::app_role) AND status = 'available'
);
