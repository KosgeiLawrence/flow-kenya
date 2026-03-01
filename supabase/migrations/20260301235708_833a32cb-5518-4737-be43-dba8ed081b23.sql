
-- Create compliance documents table
CREATE TABLE public.compliance_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own compliance docs" ON public.compliance_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own compliance docs" ON public.compliance_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own compliance docs" ON public.compliance_documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own compliance docs" ON public.compliance_documents FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all compliance docs" ON public.compliance_documents FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_compliance_documents_updated_at
  BEFORE UPDATE ON public.compliance_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for compliance documents
INSERT INTO storage.buckets (id, name, public) VALUES ('compliance-documents', 'compliance-documents', false);

CREATE POLICY "Users can upload own compliance docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'compliance-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own compliance docs" ON storage.objects FOR SELECT USING (bucket_id = 'compliance-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own compliance docs" ON storage.objects FOR DELETE USING (bucket_id = 'compliance-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all compliance docs storage" ON storage.objects FOR SELECT USING (bucket_id = 'compliance-documents' AND has_role(auth.uid(), 'admin'::app_role));
