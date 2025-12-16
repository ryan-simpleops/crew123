-- Move response deadline from jobs to job_positions
-- This allows different deadlines per position (e.g., Grip: 2 days, Camera: 1 day)

-- Remove deadline columns from jobs table
ALTER TABLE jobs DROP COLUMN IF EXISTS response_deadline_type;
ALTER TABLE jobs DROP COLUMN IF EXISTS response_deadline_minutes;

-- Add deadline to job_positions table
ALTER TABLE job_positions ADD COLUMN IF NOT EXISTS response_deadline_minutes INTEGER NOT NULL DEFAULT 120;

-- Comment for clarity
COMMENT ON COLUMN job_positions.response_deadline_minutes IS 'Minutes each crew member has to respond for this position (e.g., 120 = 2 hours, 2880 = 2 days)';
