
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS team_permissions jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.team_members.team_permissions IS 'Array of delegated team admin permissions: can_invite, can_remove, can_assign_roles';
