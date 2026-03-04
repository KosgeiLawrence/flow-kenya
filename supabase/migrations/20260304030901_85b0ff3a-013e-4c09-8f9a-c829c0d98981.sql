
-- Allow aggregators to insert pickup requests (to recyclers)
CREATE POLICY "Aggregators can insert pickup requests"
ON public.pickup_requests FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'aggregator'::app_role)
  AND auth.uid() = waste_picker_id
  AND target_role = 'recycler'
);

-- Allow aggregators to view their own sent requests
CREATE POLICY "Aggregators can view own sent requests"
ON public.pickup_requests FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'aggregator'::app_role)
  AND auth.uid() = waste_picker_id
);

-- Allow recyclers to view aggregator profiles (for requester names in pickup requests)
CREATE POLICY "Recyclers can view aggregator profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'recycler'::app_role)
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = profiles.user_id AND ur.role = 'aggregator'::app_role
  )
);

-- Allow recyclers to view aggregator roles
CREATE POLICY "Recyclers can view aggregator roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'recycler'::app_role) AND role = 'aggregator'::app_role
);
