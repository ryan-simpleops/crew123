-- Auto-create hirer row when user confirms email
-- This ensures hirer records are only created for verified users
-- and that auth.uid() is available when the row is created (RLS works naturally)

CREATE OR REPLACE FUNCTION create_hirer_on_email_confirm()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when email_confirmed_at changes from NULL to a timestamp
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Create hirer record with data from user metadata
    INSERT INTO public.hirers (
      id,
      email,
      name,
      company,
      role,
      agreed_to_terms,
      agreed_to_contact_crew
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      COALESCE(NEW.raw_user_meta_data->>'company', ''),
      COALESCE(NEW.raw_user_meta_data->>'role', ''),
      COALESCE((NEW.raw_user_meta_data->>'agreed_to_terms')::boolean, false),
      COALESCE((NEW.raw_user_meta_data->>'agreed_to_contact_crew')::boolean, false)
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users UPDATE
DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users;
CREATE TRIGGER on_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_hirer_on_email_confirm();

COMMENT ON FUNCTION create_hirer_on_email_confirm IS 'Auto-create hirer record when user confirms email';
