-- Allow authenticated users to update their own org logos
CREATE POLICY "Authenticated users can update org logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'org-logos')
WITH CHECK (bucket_id = 'org-logos');

-- Allow authenticated users to delete their own org logos
CREATE POLICY "Authenticated users can delete org logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'org-logos');
