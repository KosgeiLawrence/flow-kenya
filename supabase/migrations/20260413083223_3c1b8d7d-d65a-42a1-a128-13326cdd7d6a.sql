
DROP POLICY "Service role can insert team members" ON public.team_members;

CREATE POLICY "Users can insert team members they invited"
ON public.team_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = invited_by OR auth.uid() = user_id);
