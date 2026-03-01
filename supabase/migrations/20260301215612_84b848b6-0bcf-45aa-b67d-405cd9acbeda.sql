
-- Plastic footprint declarations by corporates
CREATE TABLE public.plastic_declarations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly', -- monthly, quarterly, annual
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  material_type TEXT NOT NULL, -- PET, HDPE, LDPE, PP, PS, Other
  quantity_kg NUMERIC NOT NULL DEFAULT 0,
  recovery_obligation_kg NUMERIC NOT NULL DEFAULT 0, -- auto-calculated
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plastic_declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own declarations" ON public.plastic_declarations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own declarations" ON public.plastic_declarations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own declarations" ON public.plastic_declarations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all declarations" ON public.plastic_declarations FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_plastic_declarations_updated_at BEFORE UPDATE ON public.plastic_declarations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recovery commitments (funding)
CREATE TABLE public.recovery_commitments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_kg NUMERIC NOT NULL DEFAULT 0,
  funded_amount NUMERIC NOT NULL DEFAULT 0, -- KES
  target_county TEXT,
  target_aggregator_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
  recovered_kg NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recovery_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own commitments" ON public.recovery_commitments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own commitments" ON public.recovery_commitments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own commitments" ON public.recovery_commitments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all commitments" ON public.recovery_commitments FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_recovery_commitments_updated_at BEFORE UPDATE ON public.recovery_commitments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recovery tracking links commitments to collections
CREATE TABLE public.recovery_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commitment_id UUID NOT NULL REFERENCES public.recovery_commitments(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.collections(id),
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  recycled BOOLEAN NOT NULL DEFAULT false,
  recycled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recovery_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tracking for own commitments" ON public.recovery_tracking FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.recovery_commitments rc WHERE rc.id = commitment_id AND rc.user_id = auth.uid()));
CREATE POLICY "Users can insert tracking for own commitments" ON public.recovery_tracking FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.recovery_commitments rc WHERE rc.id = commitment_id AND rc.user_id = auth.uid()));
CREATE POLICY "Users can update tracking for own commitments" ON public.recovery_tracking FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.recovery_commitments rc WHERE rc.id = commitment_id AND rc.user_id = auth.uid()));
CREATE POLICY "Admins can view all tracking" ON public.recovery_tracking FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
