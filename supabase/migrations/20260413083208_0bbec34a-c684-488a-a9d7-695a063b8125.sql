
-- Team invitations table
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invited_by UUID NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invite_token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  feature_permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_team_invitations_token ON public.team_invitations(invite_token);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);

CREATE POLICY "Users can view own sent invitations"
ON public.team_invitations FOR SELECT
TO authenticated
USING (auth.uid() = invited_by);

CREATE POLICY "Users can insert own invitations"
ON public.team_invitations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Users can update own invitations"
ON public.team_invitations FOR UPDATE
TO authenticated
USING (auth.uid() = invited_by);

CREATE POLICY "Users can delete own invitations"
ON public.team_invitations FOR DELETE
TO authenticated
USING (auth.uid() = invited_by);

CREATE POLICY "Admins can view all invitations"
ON public.team_invitations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Team members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  invited_by UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  role app_role NOT NULL,
  feature_permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_team_members_invited_by ON public.team_members(invited_by);
CREATE INDEX idx_team_members_org ON public.team_members(organization_id);

CREATE POLICY "Inviters can view their team members"
ON public.team_members FOR SELECT
TO authenticated
USING (auth.uid() = invited_by);

CREATE POLICY "Team members can view own record"
ON public.team_members FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Inviters can update their team members"
ON public.team_members FOR UPDATE
TO authenticated
USING (auth.uid() = invited_by);

CREATE POLICY "Inviters can delete their team members"
ON public.team_members FOR DELETE
TO authenticated
USING (auth.uid() = invited_by);

CREATE POLICY "Admins can view all team members"
ON public.team_members FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert team members"
ON public.team_members FOR INSERT
TO authenticated
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
