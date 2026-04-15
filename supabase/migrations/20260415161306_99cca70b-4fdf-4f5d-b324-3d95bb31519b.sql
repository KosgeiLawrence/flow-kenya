
-- Create marketplace_listings table
CREATE TABLE public.marketplace_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_user_id UUID NOT NULL,
  seller_role TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'raw_material',
  material_type TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  price_per_unit NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  images TEXT[] DEFAULT '{}'::TEXT[],
  location TEXT,
  county TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  condition TEXT NOT NULL DEFAULT 'bulk',
  status TEXT NOT NULL DEFAULT 'active',
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Public read for active listings (anyone, including anonymous)
CREATE POLICY "Anyone can view active listings"
ON public.marketplace_listings
FOR SELECT
TO anon, authenticated
USING (status = 'active');

-- Sellers can view all their own listings (including paused/sold)
CREATE POLICY "Sellers can view own listings"
ON public.marketplace_listings
FOR SELECT
TO authenticated
USING (auth.uid() = seller_user_id);

-- Admins can view all listings
CREATE POLICY "Admins can view all listings"
ON public.marketplace_listings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only waste_picker, aggregator, recycler can create listings
CREATE POLICY "Sellers can create listings"
ON public.marketplace_listings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = seller_user_id
  AND (
    has_role(auth.uid(), 'waste_picker'::app_role)
    OR has_role(auth.uid(), 'aggregator'::app_role)
    OR has_role(auth.uid(), 'recycler'::app_role)
  )
);

-- Sellers can update own listings
CREATE POLICY "Sellers can update own listings"
ON public.marketplace_listings
FOR UPDATE
TO authenticated
USING (auth.uid() = seller_user_id);

-- Sellers can delete own listings
CREATE POLICY "Sellers can delete own listings"
ON public.marketplace_listings
FOR DELETE
TO authenticated
USING (auth.uid() = seller_user_id);

-- Admins can manage all listings
CREATE POLICY "Admins can manage all listings"
ON public.marketplace_listings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Team members can view team listings
CREATE POLICY "Team members can view team listings"
ON public.marketplace_listings
FOR SELECT
TO authenticated
USING (seller_user_id = ANY(get_team_user_ids(auth.uid())));

-- Create updated_at trigger
CREATE TRIGGER update_marketplace_listings_updated_at
BEFORE UPDATE ON public.marketplace_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_marketplace_listings_status ON public.marketplace_listings(status);
CREATE INDEX idx_marketplace_listings_category ON public.marketplace_listings(category);
CREATE INDEX idx_marketplace_listings_seller ON public.marketplace_listings(seller_user_id);
CREATE INDEX idx_marketplace_listings_county ON public.marketplace_listings(county);

-- Create storage bucket for marketplace images
INSERT INTO storage.buckets (id, name, public) VALUES ('marketplace-images', 'marketplace-images', true);

-- Public read for marketplace images
CREATE POLICY "Marketplace images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'marketplace-images');

-- Authenticated users can upload marketplace images
CREATE POLICY "Users can upload marketplace images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'marketplace-images');

-- Users can delete their own marketplace images
CREATE POLICY "Users can delete own marketplace images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'marketplace-images' AND auth.uid()::text = (storage.foldername(name))[1]);
