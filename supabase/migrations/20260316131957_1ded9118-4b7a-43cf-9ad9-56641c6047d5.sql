
CREATE OR REPLACE FUNCTION public.get_platform_stats()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
  _collections_kg NUMERIC;
  _delivered_orders_kg NUMERIC;
BEGIN
  -- Sum from collections
  SELECT COALESCE(SUM(quantity), 0) INTO _collections_kg FROM collections;
  
  -- Sum from delivered recycler orders
  SELECT COALESCE(SUM(quantity), 0) INTO _delivered_orders_kg FROM recycler_orders WHERE status = 'delivered';

  SELECT json_build_object(
    'total_kg', _collections_kg + _delivered_orders_kg,
    'total_collections', COALESCE((SELECT COUNT(*) FROM collections), 0),
    'total_delivered_orders', COALESCE((SELECT COUNT(*) FROM recycler_orders WHERE status = 'delivered'), 0),
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
        SELECT name, SUM(kg) as kg, price_per_unit FROM (
          -- From collections
          SELECT mt.name, SUM(c.quantity) as kg, mt.price_per_unit
          FROM collections c
          JOIN material_types mt ON c.material_type_id = mt.id
          GROUP BY mt.name, mt.price_per_unit
          UNION ALL
          -- From delivered orders
          SELECT ro.material_type as name, SUM(ro.quantity) as kg, ro.unit_price as price_per_unit
          FROM recycler_orders ro
          WHERE ro.status = 'delivered'
          GROUP BY ro.material_type, ro.unit_price
        ) combined
        GROUP BY name, price_per_unit
        ORDER BY SUM(kg) DESC
      ) t),
      '[]'::json
    ),
    'monthly_trend', COALESCE(
      (SELECT json_agg(row_to_json(t)) FROM (
        SELECT month, SUM(kg) as kg, SUM(count) as count FROM (
          SELECT to_char(collected_at, 'YYYY-MM') as month,
                 SUM(quantity) as kg,
                 COUNT(*) as count
          FROM collections
          WHERE collected_at >= (now() - interval '12 months')
          GROUP BY to_char(collected_at, 'YYYY-MM')
          UNION ALL
          SELECT to_char(created_at, 'YYYY-MM') as month,
                 SUM(quantity) as kg,
                 COUNT(*) as count
          FROM recycler_orders
          WHERE status = 'delivered' AND created_at >= (now() - interval '12 months')
          GROUP BY to_char(created_at, 'YYYY-MM')
        ) combined
        GROUP BY month
        ORDER BY month
      ) t),
      '[]'::json
    )
  ) INTO result;
  
  RETURN result;
END;
$function$;
