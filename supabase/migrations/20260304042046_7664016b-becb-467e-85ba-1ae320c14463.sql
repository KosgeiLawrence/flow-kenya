
ALTER TABLE public.training_resources
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS creator_role text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS target_roles text[] NOT NULL DEFAULT '{waste_picker,aggregator,recycler}',
  ADD COLUMN IF NOT EXISTS training_date date,
  ADD COLUMN IF NOT EXISTS training_time time,
  ADD COLUMN IF NOT EXISTS venue text,
  ADD COLUMN IF NOT EXISTS training_type text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'upcoming',
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Update RLS: allow NGO, Corporate, County Gov to insert/update/delete their own training resources
CREATE POLICY "NGOs can insert training resources"
  ON public.training_resources FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'ngo'::app_role) AND created_by_user_id = auth.uid());

CREATE POLICY "Corporates can insert training resources"
  ON public.training_resources FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'corporate'::app_role) AND created_by_user_id = auth.uid());

CREATE POLICY "County gov can insert training resources"
  ON public.training_resources FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'county_government'::app_role) AND created_by_user_id = auth.uid());

CREATE POLICY "Creators can update own training resources"
  ON public.training_resources FOR UPDATE
  TO authenticated
  USING (created_by_user_id = auth.uid());

CREATE POLICY "Creators can delete own training resources"
  ON public.training_resources FOR DELETE
  TO authenticated
  USING (created_by_user_id = auth.uid());
