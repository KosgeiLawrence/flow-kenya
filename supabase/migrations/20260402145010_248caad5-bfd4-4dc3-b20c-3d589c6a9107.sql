
-- Create trash_items table for soft-deleted items
CREATE TABLE public.trash_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_table TEXT NOT NULL,
  original_id TEXT NOT NULL,
  original_data JSONB NOT NULL,
  item_label TEXT NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  restored_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trash_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own trash items
CREATE POLICY "Users can view own trash items"
  ON public.trash_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert into their own trash
CREATE POLICY "Users can insert own trash items"
  ON public.trash_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update own trash items (for restore)
CREATE POLICY "Users can update own trash items"
  ON public.trash_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can permanently delete own trash items
CREATE POLICY "Users can delete own trash items"
  ON public.trash_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all trash items
CREATE POLICY "Admins can view all trash items"
  ON public.trash_items FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_trash_items_user_id ON public.trash_items(user_id);
CREATE INDEX idx_trash_items_expires_at ON public.trash_items(expires_at);
