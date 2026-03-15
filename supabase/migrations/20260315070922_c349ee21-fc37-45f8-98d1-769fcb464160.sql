
CREATE TABLE public.cleanup_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleanup_id uuid NOT NULL REFERENCES public.cleanup_exercises(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone_number text,
  organization_name text,
  role_title text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cleanup_participants ENABLE ROW LEVEL SECURITY;

-- Public insert (via edge function with service role)
-- Authenticated users who own the cleanup can view participants
CREATE POLICY "Cleanup owners can view participants"
  ON public.cleanup_participants
  FOR SELECT
  TO authenticated
  USING (
    public.is_cleanup_owner(cleanup_id, auth.uid())
  );

CREATE POLICY "Admins can view all participants"
  ON public.cleanup_participants
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Cleanup owners can delete participants"
  ON public.cleanup_participants
  FOR DELETE
  TO authenticated
  USING (
    public.is_cleanup_owner(cleanup_id, auth.uid())
  );
