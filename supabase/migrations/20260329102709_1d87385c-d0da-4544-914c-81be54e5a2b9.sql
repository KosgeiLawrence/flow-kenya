
-- Table to track material transformations (waste → product conversions)
CREATE TABLE public.material_transformations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transformation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  transformation_type TEXT NOT NULL DEFAULT 'recycling',
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  yield_percentage NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Input materials used in transformation
CREATE TABLE public.transformation_inputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transformation_id UUID NOT NULL REFERENCES public.material_transformations(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  material_type_id UUID REFERENCES public.material_types(id),
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Output products from transformation
CREATE TABLE public.transformation_outputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transformation_id UUID NOT NULL REFERENCES public.material_transformations(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_id UUID REFERENCES public.recycler_products(id),
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.material_transformations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transformation_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transformation_outputs ENABLE ROW LEVEL SECURITY;

-- RLS for material_transformations
CREATE POLICY "Users can view own transformations" ON public.material_transformations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transformations" ON public.material_transformations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transformations" ON public.material_transformations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transformations" ON public.material_transformations FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all transformations" ON public.material_transformations FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for transformation_inputs (via parent ownership)
CREATE POLICY "Users can view own transformation inputs" ON public.transformation_inputs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.material_transformations mt WHERE mt.id = transformation_id AND mt.user_id = auth.uid()));
CREATE POLICY "Users can insert own transformation inputs" ON public.transformation_inputs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.material_transformations mt WHERE mt.id = transformation_id AND mt.user_id = auth.uid()));
CREATE POLICY "Users can delete own transformation inputs" ON public.transformation_inputs FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.material_transformations mt WHERE mt.id = transformation_id AND mt.user_id = auth.uid()));

-- RLS for transformation_outputs
CREATE POLICY "Users can view own transformation outputs" ON public.transformation_outputs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.material_transformations mt WHERE mt.id = transformation_id AND mt.user_id = auth.uid()));
CREATE POLICY "Users can insert own transformation outputs" ON public.transformation_outputs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.material_transformations mt WHERE mt.id = transformation_id AND mt.user_id = auth.uid()));
CREATE POLICY "Users can delete own transformation outputs" ON public.transformation_outputs FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.material_transformations mt WHERE mt.id = transformation_id AND mt.user_id = auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_material_transformations_updated_at BEFORE UPDATE ON public.material_transformations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
