-- Fix RLS policies to allow true anonymous signups
-- Issue: Anonymous users during signup have no auth.uid(), so WITH CHECK (true) is needed

-- Hirers table policies
DROP POLICY IF EXISTS "Allow public hirer signup" ON hirers;
DROP POLICY IF EXISTS "Allow anonymous hirer signup" ON hirers;
DROP POLICY IF EXISTS "Allow authenticated hirer signup" ON hirers;
DROP POLICY IF EXISTS "Allow hirers to read own data" ON hirers;

CREATE POLICY "Allow anonymous hirer signup" ON hirers
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow authenticated hirer signup" ON hirers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow hirers to read own data" ON hirers
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Crew members table policies
DROP POLICY IF EXISTS "Allow public crew signup" ON crew_members;
DROP POLICY IF EXISTS "Allow anonymous crew signup" ON crew_members;
DROP POLICY IF EXISTS "Allow authenticated crew signup" ON crew_members;
DROP POLICY IF EXISTS "Allow crew to read own data" ON crew_members;
DROP POLICY IF EXISTS "Allow hirers to read their crew" ON crew_members;

CREATE POLICY "Allow anonymous crew signup" ON crew_members
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow authenticated crew signup" ON crew_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow crew to read own data" ON crew_members
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);
