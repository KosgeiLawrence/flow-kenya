-- Already SET search_path on the functions, but linter is flagging — recreate explicitly safe
ALTER FUNCTION public.generate_catalogue_slug(TEXT) SET search_path = public;
ALTER FUNCTION public.get_public_catalogue(TEXT) SET search_path = public;
ALTER FUNCTION public.increment_catalogue_view(TEXT) SET search_path = public;

-- Sync trigger: when a marketplace listing changes, mirror to its linked catalogue item(s)
CREATE OR REPLACE FUNCTION public.sync_listing_to_catalogue_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.product_catalogue_items
  SET
    title = NEW.title,
    description = NEW.description,
    category = NEW.category,
    material_type = NEW.material_type,
    price_per_unit = NEW.price_per_unit,
    unit = NEW.unit,
    currency = NEW.currency,
    quantity = NEW.quantity,
    images = NEW.images,
    is_visible = (NEW.status = 'active'),
    updated_at = now()
  WHERE marketplace_listing_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_listing_to_catalogue
  AFTER UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.sync_listing_to_catalogue_item();