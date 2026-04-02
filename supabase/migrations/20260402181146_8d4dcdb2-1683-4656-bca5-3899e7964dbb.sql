
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_globally_visible boolean NOT NULL DEFAULT true;

-- Drop existing RLS policies on profiles that control cross-role visibility
-- and recreate them with visibility check

-- Drop the policies that allow cross-role viewing
DROP POLICY IF EXISTS "Aggregators can view approved waste pickers" ON public.profiles;
DROP POLICY IF EXISTS "Aggregators can view approved recyclers" ON public.profiles;
DROP POLICY IF EXISTS "Recyclers can view approved waste pickers" ON public.profiles;
DROP POLICY IF EXISTS "Recyclers can view approved aggregators" ON public.profiles;
DROP POLICY IF EXISTS "Waste pickers can view approved aggregators" ON public.profiles;
DROP POLICY IF EXISTS "Waste pickers can view approved recyclers" ON public.profiles;
DROP POLICY IF EXISTS "NGOs can view participant profiles" ON public.profiles;
DROP POLICY IF EXISTS "County gov can view all profiles" ON public.profiles;

-- Recreate with visibility filter
CREATE POLICY "Aggregators can view approved waste pickers" ON public.profiles
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'aggregator'::app_role)
  AND approval_status = 'approved'
  AND is_globally_visible = true
  AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = profiles.user_id AND ur.role = 'waste_picker')
);

CREATE POLICY "Aggregators can view approved recyclers" ON public.profiles
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'aggregator'::app_role)
  AND approval_status = 'approved'
  AND is_globally_visible = true
  AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = profiles.user_id AND ur.role = 'recycler')
);

CREATE POLICY "Recyclers can view approved waste pickers" ON public.profiles
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'recycler'::app_role)
  AND approval_status = 'approved'
  AND is_globally_visible = true
  AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = profiles.user_id AND ur.role = 'waste_picker')
);

CREATE POLICY "Recyclers can view approved aggregators" ON public.profiles
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'recycler'::app_role)
  AND approval_status = 'approved'
  AND is_globally_visible = true
  AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = profiles.user_id AND ur.role = 'aggregator')
);

CREATE POLICY "Waste pickers can view approved aggregators" ON public.profiles
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'waste_picker'::app_role)
  AND approval_status = 'approved'
  AND is_globally_visible = true
  AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = profiles.user_id AND ur.role = 'aggregator')
);

CREATE POLICY "Waste pickers can view approved recyclers" ON public.profiles
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'waste_picker'::app_role)
  AND approval_status = 'approved'
  AND is_globally_visible = true
  AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = profiles.user_id AND ur.role = 'recycler')
);

CREATE POLICY "NGOs can view participant profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'ngo'::app_role)
  AND approval_status = 'approved'
  AND is_globally_visible = true
);

CREATE POLICY "County gov can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'county_government'::app_role)
);
