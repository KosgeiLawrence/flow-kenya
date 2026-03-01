-- Add demographic fields for impact measurement
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Allow authenticated users to read aggregate profile data for impact metrics
-- (admins already have full access via existing policy)
