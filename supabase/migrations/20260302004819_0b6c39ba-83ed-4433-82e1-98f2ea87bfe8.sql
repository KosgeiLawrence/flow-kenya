
-- 1. Allow waste pickers, aggregators, recyclers to view NGO programs
CREATE POLICY "Waste pickers can view programs"
ON public.ngo_programs
FOR SELECT
USING (has_role(auth.uid(), 'waste_picker'::app_role));

CREATE POLICY "Aggregators can view programs"
ON public.ngo_programs
FOR SELECT
USING (has_role(auth.uid(), 'aggregator'::app_role));

CREATE POLICY "Recyclers can view programs"
ON public.ngo_programs
FOR SELECT
USING (has_role(auth.uid(), 'recycler'::app_role));

-- 2. Create program_applications table
CREATE TABLE public.program_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.ngo_programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  applicant_name TEXT NOT NULL,
  applicant_role TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (program_id, user_id)
);

ALTER TABLE public.program_applications ENABLE ROW LEVEL SECURITY;

-- Applicants can view own applications
CREATE POLICY "Users can view own applications"
ON public.program_applications
FOR SELECT
USING (auth.uid() = user_id);

-- Applicants can insert own applications
CREATE POLICY "Users can insert own applications"
ON public.program_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- NGOs can view applications for their programs
CREATE POLICY "NGOs can view applications for own programs"
ON public.program_applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ngo_programs np
    WHERE np.id = program_applications.program_id
    AND np.ngo_user_id = auth.uid()
  )
);

-- NGOs can update applications for their programs (approve/reject)
CREATE POLICY "NGOs can update applications for own programs"
ON public.program_applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.ngo_programs np
    WHERE np.id = program_applications.program_id
    AND np.ngo_user_id = auth.uid()
  )
);

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON public.program_applications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_program_applications_updated_at
BEFORE UPDATE ON public.program_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
