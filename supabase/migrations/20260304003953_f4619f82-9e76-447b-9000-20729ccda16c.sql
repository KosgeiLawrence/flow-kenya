
CREATE POLICY "Waste pickers can view aggregator and recycler roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'waste_picker'::app_role)
  AND role IN ('aggregator'::app_role, 'recycler'::app_role)
);
