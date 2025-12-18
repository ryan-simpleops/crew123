-- Allow UPDATE during signup for upsert to work
-- The issue: upsert tries UPDATE first, which fails RLS even though INSERT would work

DROP POLICY IF EXISTS hirer_update_own ON hirers;

-- Allow updates during signup (anon) and for authenticated users updating own record
CREATE POLICY hirer_update_own ON hirers
  FOR UPDATE
  TO anon, authenticated
  USING (
    -- Authenticated users can only see their own record
    auth.uid()::text = id::text
    -- Anon (during signup) can see any record
    OR auth.uid() IS NULL
  )
  WITH CHECK (
    -- Authenticated users can only update their own record
    auth.uid()::text = id::text
    -- Anon (during signup) can update any record
    OR auth.uid() IS NULL
  );
