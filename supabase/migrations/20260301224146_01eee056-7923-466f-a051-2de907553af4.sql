
-- Allow NGO users to view profiles of waste pickers, aggregators, and recyclers for sponsorship
CREATE POLICY "NGOs can view participant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'ngo'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.user_id
      AND ur.role IN ('waste_picker', 'aggregator', 'recycler')
  )
);

-- Allow NGOs to view roles of participants
CREATE POLICY "NGOs can view participant roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'ngo'::app_role)
);
