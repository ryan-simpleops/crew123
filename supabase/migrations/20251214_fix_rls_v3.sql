-- Fix RLS policies to explicitly allow anon role for inserts

-- Drop and recreate hirer policies with explicit anon role
DROP POLICY IF EXISTS "Allow public hirer signup" ON hirers;
DROP POLICY IF EXISTS "Allow hirers to read own data" ON hirers;

CREATE POLICY "Allow public hirer signup" ON hirers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow hirers to read own data" ON hirers
  FOR SELECT
  TO anon, authenticated
  USING (auth.uid()::text = id::text);

-- Drop and recreate crew policies with explicit anon role
DROP POLICY IF EXISTS "Allow public crew signup" ON crew_members;
DROP POLICY IF EXISTS "Allow public crew opt-in" ON crew_members;
DROP POLICY IF EXISTS "Allow crew to read own data" ON crew_members;
DROP POLICY IF EXISTS "Allow hirers to read their crew" ON crew_members;

CREATE POLICY "Allow public crew signup" ON crew_members
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow crew to read own data" ON crew_members
  FOR SELECT
  TO anon, authenticated
  USING (auth.uid()::text = id::text);
