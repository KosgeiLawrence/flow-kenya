
-- Drop all existing restrictive policies on cleanup_exercises
DROP POLICY IF EXISTS "Admins can view all cleanups" ON public.cleanup_exercises;
DROP POLICY IF EXISTS "Partners can view shared cleanups" ON public.cleanup_exercises;
DROP POLICY IF EXISTS "Users can delete own cleanups" ON public.cleanup_exercises;
DROP POLICY IF EXISTS "Users can insert own cleanups" ON public.cleanup_exercises;
DROP POLICY IF EXISTS "Users can update own cleanups" ON public.cleanup_exercises;
DROP POLICY IF EXISTS "Users can view own cleanups" ON public.cleanup_exercises;

-- Drop all existing restrictive policies on cleanup_partners
DROP POLICY IF EXISTS "Admins can view all partners" ON public.cleanup_partners;
DROP POLICY IF EXISTS "Cleanup owners can manage partners" ON public.cleanup_partners;
DROP POLICY IF EXISTS "Partners can view own partnerships" ON public.cleanup_partners;

-- Recreate cleanup_exercises policies as PERMISSIVE
CREATE POLICY "Users can view own cleanups"
ON public.cleanup_exercises FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all cleanups"
ON public.cleanup_exercises FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can view shared cleanups"
ON public.cleanup_exercises FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM cleanup_partners cp
  JOIN organizations o ON o.id = cp.organization_id
  JOIN profiles p ON p.organization_id = o.id
  WHERE cp.cleanup_id = cleanup_exercises.id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can insert own cleanups"
ON public.cleanup_exercises FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cleanups"
ON public.cleanup_exercises FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cleanups"
ON public.cleanup_exercises FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Recreate cleanup_partners policies as PERMISSIVE
CREATE POLICY "Cleanup owners can manage partners"
ON public.cleanup_partners FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM cleanup_exercises ce
  WHERE ce.id = cleanup_partners.cleanup_id AND ce.user_id = auth.uid()
));

CREATE POLICY "Admins can view all partners"
ON public.cleanup_partners FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can view own partnerships"
ON public.cleanup_partners FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM organizations o
  JOIN profiles p ON p.organization_id = o.id
  WHERE o.id = cleanup_partners.organization_id AND p.user_id = auth.uid()
));
