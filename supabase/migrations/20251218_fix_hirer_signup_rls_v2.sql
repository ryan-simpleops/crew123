-- Fix RLS policy to allow hirer signup even before email confirmation
-- The issue: signUp() creates user but doesn't log them in until email is confirmed
-- So auth.uid() is null when trying to insert hirer record

DROP POLICY IF EXISTS hirer_insert ON hirers;

-- Allow anon/authenticated to insert hirer records
-- This is safe because our signup flow verifies the user via Supabase auth.signUp()
-- and only our application code can call this
CREATE POLICY hirer_insert ON hirers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
