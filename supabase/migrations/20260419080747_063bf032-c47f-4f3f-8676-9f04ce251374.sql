CREATE TABLE IF NOT EXISTS public.image_migration_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.image_migration_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view image migration runs"
  ON public.image_migration_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));