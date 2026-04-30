CREATE POLICY "Users can delete own collections"
ON public.collections
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own client collections"
ON public.client_collections
FOR DELETE
TO authenticated
USING (auth.uid() = waste_picker_id);