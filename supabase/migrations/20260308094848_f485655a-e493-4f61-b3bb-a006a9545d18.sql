-- Fix cleanup RLS: replace restrictive policies with permissive ones
-- Restrictive-only policy sets block INSERT/SELECT unless a permissive policy also grants access.

-- cleanup_exercises
DROP POLICY IF EXISTS "cleanup_exercises_select_access" ON public.cleanup_exercises;
DROP POLICY IF EXISTS "cleanup_exercises_insert_own" ON public.cleanup_exercises;
DROP POLICY IF EXISTS "cleanup_exercises_update_own" ON public.cleanup_exercises;
DROP POLICY IF EXISTS "cleanup_exercises_delete_own" ON public.cleanup_exercises;

CREATE POLICY "cleanup_exercises_select_access"
ON public.cleanup_exercises
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.can_view_cleanup(id, auth.uid()));

CREATE POLICY "cleanup_exercises_insert_own"
ON public.cleanup_exercises
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cleanup_exercises_update_own"
ON public.cleanup_exercises
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cleanup_exercises_delete_own"
ON public.cleanup_exercises
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- cleanup_partners
DROP POLICY IF EXISTS "cleanup_partners_select_access" ON public.cleanup_partners;
DROP POLICY IF EXISTS "cleanup_partners_insert_owner" ON public.cleanup_partners;
DROP POLICY IF EXISTS "cleanup_partners_update_owner" ON public.cleanup_partners;
DROP POLICY IF EXISTS "cleanup_partners_delete_owner" ON public.cleanup_partners;

CREATE POLICY "cleanup_partners_select_access"
ON public.cleanup_partners
AS PERMISSIVE
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
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (public.is_cleanup_owner(cleanup_id, auth.uid()));

CREATE POLICY "cleanup_partners_update_owner"
ON public.cleanup_partners
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.is_cleanup_owner(cleanup_id, auth.uid()))
WITH CHECK (public.is_cleanup_owner(cleanup_id, auth.uid()));

CREATE POLICY "cleanup_partners_delete_owner"
ON public.cleanup_partners
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (public.is_cleanup_owner(cleanup_id, auth.uid()));