
CREATE POLICY "Aggregators can view waste picker profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'aggregator'::app_role)
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = profiles.user_id
    AND ur.role = 'waste_picker'::app_role
  )
);

CREATE POLICY "Recyclers can view waste picker profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'recycler'::app_role)
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = profiles.user_id
    AND ur.role = 'waste_picker'::app_role
  )
);

CREATE POLICY "Aggregators can view waste picker roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'aggregator'::app_role)
  AND role = 'waste_picker'::app_role
);

CREATE POLICY "Recyclers can view waste picker roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'recycler'::app_role)
  AND role = 'waste_picker'::app_role
);
