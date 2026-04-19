-- =========================================
-- PRODUCT CATALOGUE TABLES
-- =========================================

CREATE TABLE public.product_catalogues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  tagline TEXT,
  about TEXT,
  banner_url TEXT,
  theme_color TEXT DEFAULT '#2b5e3f',
  contact_phone TEXT,
  contact_email TEXT,
  contact_whatsapp TEXT,
  website TEXT,
  physical_address TEXT,
  county TEXT,
  sub_county TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_catalogues_slug ON public.product_catalogues(slug);
CREATE INDEX idx_product_catalogues_user ON public.product_catalogues(user_id);

CREATE TABLE public.product_catalogue_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  catalogue_id UUID NOT NULL REFERENCES public.product_catalogues(id) ON DELETE CASCADE,
  marketplace_listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'recycled_product',
  material_type TEXT,
  price_per_unit NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  currency TEXT NOT NULL DEFAULT 'KES',
  quantity NUMERIC DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_catalogue_items_catalogue ON public.product_catalogue_items(catalogue_id);
CREATE INDEX idx_catalogue_items_marketplace ON public.product_catalogue_items(marketplace_listing_id);

-- =========================================
-- RLS
-- =========================================

ALTER TABLE public.product_catalogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_catalogue_items ENABLE ROW LEVEL SECURITY;

-- Catalogues: owner full access; public can view published
CREATE POLICY "Owners manage own catalogue"
  ON public.product_catalogues FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view published catalogues"
  ON public.product_catalogues FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "Admins can view all catalogues"
  ON public.product_catalogues FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Items: owner full access; public can view items of published catalogues
CREATE POLICY "Owners manage own catalogue items"
  ON public.product_catalogue_items FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.product_catalogues c
    WHERE c.id = catalogue_id AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.product_catalogues c
    WHERE c.id = catalogue_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Public can view items of published catalogues"
  ON public.product_catalogue_items FOR SELECT
  TO anon, authenticated
  USING (
    is_visible = true AND EXISTS (
      SELECT 1 FROM public.product_catalogues c
      WHERE c.id = catalogue_id AND c.is_published = true
    )
  );

-- =========================================
-- TIMESTAMPS
-- =========================================

CREATE TRIGGER update_product_catalogues_updated_at
  BEFORE UPDATE ON public.product_catalogues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_catalogue_items_updated_at
  BEFORE UPDATE ON public.product_catalogue_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- SLUG GENERATION
-- =========================================

CREATE OR REPLACE FUNCTION public.generate_catalogue_slug(_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- Lowercase, strip non-alphanumeric, replace spaces with -
  base_slug := lower(regexp_replace(coalesce(_name, 'business'), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'business';
  END IF;
  base_slug := substring(base_slug from 1 for 50);

  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.product_catalogues WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter::text;
  END LOOP;

  RETURN final_slug;
END;
$$;

-- =========================================
-- PUBLIC FETCH HELPER (one round-trip, no PII leak)
-- =========================================

CREATE OR REPLACE FUNCTION public.get_public_catalogue(_slug TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'catalogue', row_to_json(c),
    'items', COALESCE(
      (SELECT json_agg(row_to_json(i) ORDER BY i.display_order, i.created_at)
       FROM public.product_catalogue_items i
       WHERE i.catalogue_id = c.id AND i.is_visible = true),
      '[]'::json
    ),
    'seller', json_build_object(
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'role', (SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = c.user_id LIMIT 1)
    ),
    'organization', (
      SELECT json_build_object('name', o.name, 'logo_url', o.logo_url, 'description', o.description)
      FROM public.organizations o
      WHERE o.id = p.organization_id
    )
  ) INTO result
  FROM public.product_catalogues c
  JOIN public.profiles p ON p.user_id = c.user_id
  WHERE c.slug = _slug AND c.is_published = true;

  RETURN result;
END;
$$;

-- View counter (anyone can call to bump views on a published catalogue)
CREATE OR REPLACE FUNCTION public.increment_catalogue_view(_slug TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.product_catalogues
  SET view_count = view_count + 1
  WHERE slug = _slug AND is_published = true;
END;
$$;