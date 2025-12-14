-- Fix RLS policies for public signup

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public hirer signup" ON hirers;
DROP POLICY IF EXISTS "Allow hirers to read own data" ON hirers;
DROP POLICY IF EXISTS "Allow public crew signup" ON crew_members;
DROP POLICY IF EXISTS "Allow crew to read own data" ON crew_members;

-- Hirers table policies
CREATE POLICY "Allow public hirer signup" ON hirers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow hirers to read own data" ON hirers
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Crew members table policies
CREATE POLICY "Allow public crew signup" ON crew_members
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow crew to read own data" ON crew_members
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);
