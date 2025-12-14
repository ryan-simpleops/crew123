-- Allow anonymous users to SELECT data after insert
-- This is needed because the insert code does .insert().select()

CREATE POLICY "Allow anon to read inserted data" ON hirers
  FOR SELECT
  TO anon
  USING (true);
