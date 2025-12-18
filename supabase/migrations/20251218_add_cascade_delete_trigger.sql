-- Add cascade delete trigger to clean up hirer records when auth user is deleted
-- This prevents orphaned hirer records

-- Function to delete hirer when auth user is deleted
CREATE OR REPLACE FUNCTION delete_hirer_on_auth_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.hirers WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users DELETE
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION delete_hirer_on_auth_user_delete();

COMMENT ON FUNCTION delete_hirer_on_auth_user_delete IS 'Cascade delete hirer record when auth user is deleted';
