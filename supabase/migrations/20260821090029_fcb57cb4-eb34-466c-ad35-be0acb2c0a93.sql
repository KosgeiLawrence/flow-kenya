INSERT INTO public.material_types (name, unit, price_per_unit, icon)
SELECT 'Textile Waste', 'kg', 20.00, 'shirt'
WHERE NOT EXISTS (
  SELECT 1 FROM public.material_types WHERE name = 'Textile Waste'
);
