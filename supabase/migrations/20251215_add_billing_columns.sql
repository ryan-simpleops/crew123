-- Add billing columns to hirers table

ALTER TABLE hirers ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE hirers ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'tier1', 'tier2'));
ALTER TABLE hirers ADD COLUMN IF NOT EXISTS registration_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE hirers ADD COLUMN IF NOT EXISTS current_billing_period_start TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE hirers ADD COLUMN IF NOT EXISTS jobs_used_this_period INTEGER DEFAULT 0;
ALTER TABLE hirers ADD COLUMN IF NOT EXISTS hit_free_limit BOOLEAN DEFAULT FALSE;

-- Update existing hirers to have registration_date set
UPDATE hirers SET registration_date = created_at WHERE registration_date IS NULL;
UPDATE hirers SET current_billing_period_start = created_at WHERE current_billing_period_start IS NULL;
