-- Add position_name column to crew_lists table
-- This is used in SMS templates to specify the role being hired for
-- e.g., "We are in need of a 1st AC" or "We are in need of a Best Boy Grip"

ALTER TABLE crew_lists
ADD COLUMN position_name TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN crew_lists.position_name IS 'Position title used in SMS template (e.g., "1st AC", "Best Boy Grip")';
