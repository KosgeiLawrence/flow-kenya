
CREATE OR REPLACE FUNCTION public.get_team_user_ids(_user_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT uid), ARRAY[_user_id])
  FROM (
    SELECT _user_id AS uid
    UNION
    SELECT user_id AS uid FROM team_members WHERE invited_by = _user_id AND is_active = true
    UNION
    SELECT invited_by AS uid FROM team_members WHERE user_id = _user_id AND is_active = true
    UNION
    SELECT tm2.user_id AS uid
    FROM team_members tm1
    JOIN team_members tm2 ON tm2.invited_by = tm1.invited_by AND tm2.is_active = true
    WHERE tm1.user_id = _user_id AND tm1.is_active = true
  ) sub;
$$;

CREATE POLICY "Team members can view team collections"
ON public.collections FOR SELECT TO authenticated
USING (user_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team client collections"
ON public.client_collections FOR SELECT TO authenticated
USING (waste_picker_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team schedules"
ON public.pickup_schedules FOR SELECT TO authenticated
USING (user_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team pickup requests"
ON public.pickup_requests FOR SELECT TO authenticated
USING (waste_picker_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team transactions"
ON public.financial_transactions FOR SELECT TO authenticated
USING (user_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team budgets"
ON public.financial_budgets FOR SELECT TO authenticated
USING (user_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team customers"
ON public.customers FOR SELECT TO authenticated
USING (user_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team suppliers"
ON public.suppliers FOR SELECT TO authenticated
USING (user_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team purchase orders"
ON public.aggregator_purchase_orders FOR SELECT TO authenticated
USING (user_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team recycler orders"
ON public.recycler_orders FOR SELECT TO authenticated
USING (user_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team products"
ON public.recycler_products FOR SELECT TO authenticated
USING (user_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team transformations"
ON public.material_transformations FOR SELECT TO authenticated
USING (user_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team compliance docs"
ON public.compliance_documents FOR SELECT TO authenticated
USING (user_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team training logs"
ON public.community_training_logs FOR SELECT TO authenticated
USING (user_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team cleanups"
ON public.cleanup_exercises FOR SELECT TO authenticated
USING (user_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team balance sheet"
ON public.balance_sheet_items FOR SELECT TO authenticated
USING (user_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team programs"
ON public.ngo_programs FOR SELECT TO authenticated
USING (ngo_user_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team sponsorships"
ON public.ngo_sponsorships FOR SELECT TO authenticated
USING (ngo_user_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team declarations"
ON public.plastic_declarations FOR SELECT TO authenticated
USING (user_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view team commitments"
ON public.recovery_commitments FOR SELECT TO authenticated
USING (user_id = ANY(get_team_user_ids(auth.uid())));

CREATE POLICY "Team members can view their team"
ON public.team_members FOR SELECT TO authenticated
USING (
  invited_by = auth.uid()
  OR user_id = auth.uid()
  OR invited_by IN (SELECT invited_by FROM team_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Team members can view team invitations"
ON public.team_invitations FOR SELECT TO authenticated
USING (
  invited_by = auth.uid()
  OR invited_by IN (SELECT invited_by FROM team_members WHERE user_id = auth.uid() AND is_active = true)
);
