
-- Create cleanup_exercises table
CREATE TABLE public.cleanup_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  cleanup_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location_name TEXT NOT NULL,
  location_lat NUMERIC,
  location_lng NUMERIC,
  location_type TEXT NOT NULL DEFAULT 'community',
  lead_organizer TEXT NOT NULL,
  num_volunteers INTEGER NOT NULL DEFAULT 0,
  num_waste_pickers INTEGER NOT NULL DEFAULT 0,
  num_partner_orgs INTEGER NOT NULL DEFAULT 0,
  total_waste_kg NUMERIC NOT NULL DEFAULT 0,
  plastic_waste_kg NUMERIC NOT NULL DEFAULT 0,
  recyclable_waste_kg NUMERIC NOT NULL DEFAULT 0,
  non_recyclable_waste_kg NUMERIC NOT NULL DEFAULT 0,
  num_bags INTEGER NOT NULL DEFAULT 0,
  pet_bottles_kg NUMERIC DEFAULT 0,
  hdpe_kg NUMERIC DEFAULT 0,
  fishing_nets_kg NUMERIC DEFAULT 0,
  sachets_kg NUMERIC DEFAULT 0,
  glass_kg NUMERIC DEFAULT 0,
  metal_kg NUMERIC DEFAULT 0,
  other_materials_kg NUMERIC DEFAULT 0,
  waste_destination TEXT,
  transport_method TEXT,
  waste_sorted BOOLEAN DEFAULT false,
  before_photos TEXT[] DEFAULT '{}',
  during_photos TEXT[] DEFAULT '{}',
  after_photos TEXT[] DEFAULT '{}',
  observations TEXT,
  environmental_issues TEXT,
  recommendations TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cleanup_partners junction table
CREATE TABLE public.cleanup_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cleanup_id UUID NOT NULL REFERENCES public.cleanup_exercises(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cleanup_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.cleanup_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleanup_partners ENABLE ROW LEVEL SECURITY;

-- RLS for cleanup_exercises
CREATE POLICY "Users can insert own cleanups"
  ON public.cleanup_exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own cleanups"
  ON public.cleanup_exercises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own cleanups"
  ON public.cleanup_exercises FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cleanups"
  ON public.cleanup_exercises FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all cleanups"
  ON public.cleanup_exercises FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Partner orgs can view shared cleanups
CREATE POLICY "Partners can view shared cleanups"
  ON public.cleanup_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM cleanup_partners cp
    JOIN organizations o ON o.id = cp.organization_id
    JOIN profiles p ON p.organization_id = o.id
    WHERE cp.cleanup_id = cleanup_exercises.id
    AND p.user_id = auth.uid()
  ));

-- RLS for cleanup_partners
CREATE POLICY "Cleanup owners can manage partners"
  ON public.cleanup_partners FOR ALL
  USING (EXISTS (
    SELECT 1 FROM cleanup_exercises ce
    WHERE ce.id = cleanup_partners.cleanup_id
    AND ce.user_id = auth.uid()
  ));

CREATE POLICY "Partners can view own partnerships"
  ON public.cleanup_partners FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM organizations o
    JOIN profiles p ON p.organization_id = o.id
    WHERE o.id = cleanup_partners.organization_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all partners"
  ON public.cleanup_partners FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_cleanup_exercises_updated_at
  BEFORE UPDATE ON public.cleanup_exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for cleanup photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('cleanup-photos', 'cleanup-photos', true);

-- Storage RLS for cleanup-photos
CREATE POLICY "Authenticated users can upload cleanup photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'cleanup-photos');

CREATE POLICY "Anyone can view cleanup photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cleanup-photos');

CREATE POLICY "Users can delete own cleanup photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'cleanup-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
