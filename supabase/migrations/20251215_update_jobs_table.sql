-- Update jobs table to match design

-- Drop old columns
ALTER TABLE jobs DROP COLUMN IF EXISTS title;
ALTER TABLE jobs DROP COLUMN IF EXISTS description;
ALTER TABLE jobs DROP COLUMN IF EXISTS position;
ALTER TABLE jobs DROP COLUMN IF EXISTS start_date;
ALTER TABLE jobs DROP COLUMN IF EXISTS end_date;
ALTER TABLE jobs DROP COLUMN IF EXISTS response_window_hours;

-- Add new columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_name TEXT NOT NULL DEFAULT 'Untitled Job';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hold_start_date DATE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hold_end_date DATE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_start_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_end_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rate DECIMAL(10,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS response_deadline_type TEXT CHECK (response_deadline_type IN ('per_job', 'per_person'));
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS response_deadline_minutes INTEGER NOT NULL DEFAULT 120;

-- Update status column constraint
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN ('open', 'filled', 'pending_approval', 'forwarded', 'cancelled'));

-- Update default status for new jobs
ALTER TABLE jobs ALTER COLUMN status SET DEFAULT 'open';
