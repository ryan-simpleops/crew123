-- Add position_name column to crew_lists for SMS template injection
ALTER TABLE crew_lists
ADD COLUMN IF NOT EXISTS position_name TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN crew_lists.position_name IS 'Position title used in SMS template (e.g., "1st AC", "Best Boy Grip")';
