
-- Create a SECURITY DEFINER function that returns aggregated platform stats
-- Accessible to both authenticated and anonymous users for the landing page
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_kg', COALESCE((SELECT SUM(quantity) FROM collections), 0),
    'total_collections', COALESCE((SELECT COUNT(*) FROM collections), 0),
    'total_waste_pickers', COALESCE((SELECT COUNT(*) FROM user_roles WHERE role = 'waste_picker'), 0),
    'total_aggregators', COALESCE((SELECT COUNT(*) FROM user_roles WHERE role = 'aggregator'), 0),
    'total_recyclers', COALESCE((SELECT COUNT(*) FROM user_roles WHERE role = 'recycler'), 0),
    'total_ngos', COALESCE((SELECT COUNT(*) FROM user_roles WHERE role = 'ngo'), 0),
    'total_corporates', COALESCE((SELECT COUNT(*) FROM user_roles WHERE role = 'corporate'), 0),
    'total_county_gov', COALESCE((SELECT COUNT(*) FROM user_roles WHERE role = 'county_government'), 0),
    'total_users', COALESCE((SELECT COUNT(*) FROM user_roles), 0),
    'total_payments_kes', COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed'), 0),
    'total_women', COALESCE((SELECT COUNT(*) FROM profiles WHERE gender = 'female'), 0),
    'total_youth', COALESCE((SELECT COUNT(*) FROM profiles WHERE date_of_birth IS NOT NULL AND (EXTRACT(YEAR FROM age(date_of_birth)) < 35)), 0),
    'total_profiles', COALESCE((SELECT COUNT(*) FROM profiles), 0),
    'total_collection_sites', COALESCE((SELECT COUNT(DISTINCT location_name) FROM collections WHERE location_name IS NOT NULL), 0),
    'material_breakdown', COALESCE(
      (SELECT json_agg(row_to_json(t)) FROM (
        SELECT mt.name, SUM(c.quantity) as kg, mt.price_per_unit
        FROM collections c
        JOIN material_types mt ON c.material_type_id = mt.id
        GROUP BY mt.name, mt.price_per_unit
        ORDER BY SUM(c.quantity) DESC
      ) t),
      '[]'::json
    ),
    'monthly_trend', COALESCE(
      (SELECT json_agg(row_to_json(t)) FROM (
        SELECT to_char(collected_at, 'YYYY-MM') as month,
               SUM(quantity) as kg,
               COUNT(*) as count
        FROM collections
        WHERE collected_at >= (now() - interval '12 months')
        GROUP BY to_char(collected_at, 'YYYY-MM')
        ORDER BY month
      ) t),
      '[]'::json
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute to anon and authenticated so landing page works without login
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO authenticated;
