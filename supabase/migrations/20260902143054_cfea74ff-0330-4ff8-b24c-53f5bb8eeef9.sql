DROP POLICY IF EXISTS "NGOs can upload docs" ON storage.objects;
DROP POLICY IF EXISTS "NGOs can view own docs storage" ON storage.objects;
DROP POLICY IF EXISTS "NGOs can delete own docs storage" ON storage.objects;

CREATE POLICY "NGOs can upload own docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ngo-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "NGOs can view own docs storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ngo-documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "NGOs can delete own docs storage" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ngo-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Authenticated users can update org logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete org logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload org logos" ON storage.objects;

CREATE POLICY "Users can upload own org logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'org-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own org logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'org-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own org logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'org-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload marketplace images" ON storage.objects;

CREATE POLICY "Users can upload own marketplace images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketplace-images' AND auth.uid()::text = (storage.foldername(name))[1]);