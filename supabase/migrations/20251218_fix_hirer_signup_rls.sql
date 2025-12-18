-- Fix RLS policy for hirer signup to allow setting id = auth.uid()
-- The issue: users can't insert a hirer row with their auth user ID

DROP POLICY IF EXISTS hirer_insert ON hirers;

-- Allow inserting hirer record during signup
-- Check that the id being inserted matches the authenticated user's uid
CREATE POLICY hirer_insert ON hirers
  FOR INSERT
  WITH CHECK (
    -- Allow if user is authenticated and id matches their uid
    (auth.uid()::text = id::text)
  );
