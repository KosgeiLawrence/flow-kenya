-- Non-recursive access helpers
CREATE OR REPLACE FUNCTION public.is_cleanup_owner(_cleanup_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cleanup_exercises ce
    WHERE ce.id = _cleanup_id
      AND ce.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_cleanup(_cleanup_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- owner
    EXISTS (
      SELECT 1
      FROM public.cleanup_exercises ce
      WHERE ce.id = _cleanup_id
        AND ce.user_id = _user_id
    )
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

REVOKE EXECUTE ON FUNCTION public.is_cleanup_owner(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_view_cleanup(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_cleanup_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_cleanup(uuid, uuid) TO authenticated;

-- Drop potentially recursive cleanup policies
DROP POLICY IF EXISTS "Users can view own cleanups" ON public.cleanup_exercises;
DROP POLICY IF EXISTS "Admins can view all cleanups" ON public.cleanup_exercises;
DROP POLICY IF EXISTS "Partners can view shared cleanups" ON public.cleanup_exercises;
DROP POLICY IF EXISTS "Users can insert own cleanups" ON public.cleanup_exercises;
DROP POLICY IF EXISTS "Users can update own cleanups" ON public.cleanup_exercises;
DROP POLICY IF EXISTS "Users can delete own cleanups" ON public.cleanup_exercises;

DROP POLICY IF EXISTS "Cleanup owners can manage partners" ON public.cleanup_partners;
DROP POLICY IF EXISTS "Admins can view all partners" ON public.cleanup_partners;
DROP POLICY IF EXISTS "Partners can view own partnerships" ON public.cleanup_partners;

-- Recreate cleanup_exercises policies using helper function
CREATE POLICY "cleanup_exercises_select_access"
ON public.cleanup_exercises
FOR SELECT
TO authenticated
USING (public.can_view_cleanup(id, auth.uid()));

CREATE POLICY "cleanup_exercises_insert_own"
ON public.cleanup_exercises
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cleanup_exercises_update_own"
ON public.cleanup_exercises
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cleanup_exercises_delete_own"
ON public.cleanup_exercises
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Recreate cleanup_partners policies without recursive table self-dependency
CREATE POLICY "cleanup_partners_select_access"
ON public.cleanup_partners
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_cleanup_owner(cleanup_id, auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.organizations o
    JOIN public.profiles p ON p.organization_id = o.id
    WHERE o.id = cleanup_partners.organization_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "cleanup_partners_insert_owner"
ON public.cleanup_partners
FOR INSERT
TO authenticated
WITH CHECK (public.is_cleanup_owner(cleanup_id, auth.uid()));

CREATE POLICY "cleanup_partners_update_owner"
ON public.cleanup_partners
FOR UPDATE
TO authenticated
USING (public.is_cleanup_owner(cleanup_id, auth.uid()))
WITH CHECK (public.is_cleanup_owner(cleanup_id, auth.uid()));

CREATE POLICY "cleanup_partners_delete_owner"
ON public.cleanup_partners
FOR DELETE
TO authenticated
USING (public.is_cleanup_owner(cleanup_id, auth.uid()));