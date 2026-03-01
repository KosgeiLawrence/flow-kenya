
-- Create a function to handle new user signup
-- This runs as security definer so it bypasses RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID;
  _role app_role;
  _meta JSONB;
BEGIN
  _meta := NEW.raw_user_meta_data;
  
  -- Get role
  _role := (_meta->>'role')::app_role;
  
  -- Create organization if not independent
  IF (_meta->>'is_independent')::boolean IS NOT TRUE AND _meta->>'org_name' IS NOT NULL AND _meta->>'org_name' != '' THEN
    INSERT INTO public.organizations (name, type, description)
    VALUES (
      _meta->>'org_name',
      COALESCE(_meta->>'org_type', 'private_company'),
      _meta->>'org_description'
    )
    RETURNING id INTO _org_id;
  END IF;
  
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, phone_number, email, national_id, company_registration, organization_id, is_independent, approval_status)
  VALUES (
    NEW.id,
    COALESCE(_meta->>'full_name', ''),
    _meta->>'phone_number',
    NEW.email,
    _meta->>'national_id',
    _meta->>'company_registration',
    _org_id,
    COALESCE((_meta->>'is_independent')::boolean, false),
    'pending'
  );
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
