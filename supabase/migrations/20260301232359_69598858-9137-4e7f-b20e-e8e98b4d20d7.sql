-- Allow county_government to view all collections
CREATE POLICY "County gov can view all collections"
ON public.collections
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'county_government'::app_role));

-- Allow county_government to view all profiles
CREATE POLICY "County gov can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'county_government'::app_role));

-- Allow county_government to view all payments
CREATE POLICY "County gov can view all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'county_government'::app_role));

-- Allow county_government to view user roles
CREATE POLICY "County gov can view user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'county_government'::app_role));
