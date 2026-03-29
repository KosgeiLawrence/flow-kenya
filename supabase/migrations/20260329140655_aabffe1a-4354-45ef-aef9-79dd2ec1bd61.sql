
CREATE POLICY "Waste pickers can update material prices"
ON public.material_types
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'waste_picker'::app_role)
  OR has_role(auth.uid(), 'aggregator'::app_role)
  OR has_role(auth.uid(), 'recycler'::app_role)
);
