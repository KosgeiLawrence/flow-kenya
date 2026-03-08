-- Fix remaining cleanup insert RLS failure caused by SELECT policy function self-querying cleanup_exercises
-- The previous can_view_cleanup queried cleanup_exercises inside a STABLE function,
-- which can fail for RETURNING rows in the same statement snapshot.

CREATE OR REPLACE FUNCTION public.can_view_cleanup(
  _cleanup_id uuid,
  _cleanup_owner_id uuid,
  _user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- owner (uses row owner directly, no self-query)
    _cleanup_owner_id = _user_id
    OR
    -- admin
    public.has_role(_user_id, 'admin'::public.app_role)
    OR
    -- partner org member
    EXISTS (
      SELECT 1
      FROM public.cleanup_partners cp
      JOIN public.organizations o ON o.id = cp.organization_id
      JOIN public.profiles p ON p.organization_id = o.id
      WHERE cp.cleanup_id = _cleanup_id
        AND p.user_id = _user_id
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_cleanup(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_cleanup(uuid, uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "cleanup_exercises_select_access" ON public.cleanup_exercises;
CREATE POLICY "cleanup_exercises_select_access"
ON public.cleanup_exercises
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.can_view_cleanup(id, user_id, auth.uid()));