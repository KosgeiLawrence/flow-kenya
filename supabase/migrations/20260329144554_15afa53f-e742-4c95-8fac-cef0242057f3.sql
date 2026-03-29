
-- Community training logs with impact metrics
CREATE TABLE public.community_training_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  training_date DATE NOT NULL DEFAULT CURRENT_DATE,
  venue TEXT,
  community_name TEXT,
  county TEXT,
  duration_minutes INTEGER,
  num_participants INTEGER NOT NULL DEFAULT 0,
  num_women INTEGER NOT NULL DEFAULT 0,
  num_youth INTEGER NOT NULL DEFAULT 0,
  topics_covered TEXT,
  waste_collected_kg NUMERIC NOT NULL DEFAULT 0,
  trees_planted INTEGER NOT NULL DEFAULT 0,
  impact_notes TEXT,
  training_type TEXT NOT NULL DEFAULT 'awareness',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_training_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own training logs"
  ON public.community_training_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training logs"
  ON public.community_training_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training logs"
  ON public.community_training_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own training logs"
  ON public.community_training_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all training logs"
  ON public.community_training_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
