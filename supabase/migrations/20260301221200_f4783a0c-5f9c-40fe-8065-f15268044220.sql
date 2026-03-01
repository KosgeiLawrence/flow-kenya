-- NGO Sponsorships: track which pickers an NGO sponsors
CREATE TABLE public.ngo_sponsorships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ngo_user_id UUID NOT NULL,
  picker_profile_id UUID NOT NULL REFERENCES public.profiles(id),
  county TEXT,
  community TEXT,
  fund_type TEXT NOT NULL DEFAULT 'general',
  amount_allocated NUMERIC NOT NULL DEFAULT 0,
  amount_disbursed NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ngo_sponsorships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NGOs can view own sponsorships" ON public.ngo_sponsorships
  FOR SELECT USING (auth.uid() = ngo_user_id);
CREATE POLICY "NGOs can insert own sponsorships" ON public.ngo_sponsorships
  FOR INSERT WITH CHECK (auth.uid() = ngo_user_id);
CREATE POLICY "NGOs can update own sponsorships" ON public.ngo_sponsorships
  FOR UPDATE USING (auth.uid() = ngo_user_id);
CREATE POLICY "Admins can view all sponsorships" ON public.ngo_sponsorships
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ngo_sponsorships_updated_at
  BEFORE UPDATE ON public.ngo_sponsorships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- NGO Programs / Grants
CREATE TABLE public.ngo_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ngo_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  funder TEXT,
  description TEXT,
  county TEXT,
  budget NUMERIC NOT NULL DEFAULT 0,
  spent NUMERIC NOT NULL DEFAULT 0,
  target_kg NUMERIC NOT NULL DEFAULT 0,
  recovered_kg NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ngo_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NGOs can view own programs" ON public.ngo_programs
  FOR SELECT USING (auth.uid() = ngo_user_id);
CREATE POLICY "NGOs can insert own programs" ON public.ngo_programs
  FOR INSERT WITH CHECK (auth.uid() = ngo_user_id);
CREATE POLICY "NGOs can update own programs" ON public.ngo_programs
  FOR UPDATE USING (auth.uid() = ngo_user_id);
CREATE POLICY "Admins can view all programs" ON public.ngo_programs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ngo_programs_updated_at
  BEFORE UPDATE ON public.ngo_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Program Documents
CREATE TABLE public.ngo_program_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.ngo_programs(id) ON DELETE CASCADE,
  ngo_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ngo_program_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NGOs can view own docs" ON public.ngo_program_documents
  FOR SELECT USING (auth.uid() = ngo_user_id);
CREATE POLICY "NGOs can insert own docs" ON public.ngo_program_documents
  FOR INSERT WITH CHECK (auth.uid() = ngo_user_id);
CREATE POLICY "NGOs can delete own docs" ON public.ngo_program_documents
  FOR DELETE USING (auth.uid() = ngo_user_id);
CREATE POLICY "Admins can view all docs" ON public.ngo_program_documents
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for program documents
INSERT INTO storage.buckets (id, name, public) VALUES ('ngo-documents', 'ngo-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "NGOs can upload docs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'ngo-documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "NGOs can view own docs storage" ON storage.objects
  FOR SELECT USING (bucket_id = 'ngo-documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "NGOs can delete own docs storage" ON storage.objects
  FOR DELETE USING (bucket_id = 'ngo-documents' AND auth.uid() IS NOT NULL);
