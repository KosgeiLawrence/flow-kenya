
-- Fix overly permissive INSERT policy on organizations
DROP POLICY "Users can create organizations" ON public.organizations;
CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix overly permissive UPDATE policy on organizations
DROP POLICY "Organization members can update" ON public.organizations;
CREATE POLICY "Admins can update organizations"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
