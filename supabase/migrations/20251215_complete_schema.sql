-- Crew123 Complete Database Schema
-- Created: 2025-12-15
-- Description: Full schema with user-defined tags, jobs, cascade logic, and billing

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE ENTITIES
-- ============================================================================

-- Hirers (Department heads/production companies)
CREATE TABLE hirers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  role TEXT NOT NULL,

  -- Billing
  stripe_customer_id TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'tier1', 'tier2')),
  registration_date TIMESTAMPTZ DEFAULT NOW(),
  current_billing_period_start TIMESTAMPTZ DEFAULT NOW(),
  jobs_used_this_period INTEGER DEFAULT 0,
  hit_free_limit BOOLEAN DEFAULT FALSE,

  -- Terms
  agreed_to_terms BOOLEAN DEFAULT FALSE,
  agreed_to_contact_crew BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crew members (SMS-only, never log in)
CREATE TABLE crew_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,

  -- Consent tracking
  web_consent_given BOOLEAN DEFAULT FALSE,
  web_consent_at TIMESTAMPTZ,
  sms_consent_confirmed BOOLEAN DEFAULT FALSE,
  sms_consent_confirmed_at TIMESTAMPTZ,
  opted_out BOOLEAN DEFAULT FALSE,
  opted_out_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-defined tags per hirer
CREATE TABLE crew_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hirer_id UUID REFERENCES hirers(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(hirer_id, tag_name)
);

-- Many-to-many: crew members to tags (per hirer)
CREATE TABLE crew_member_tags (
  crew_member_id UUID REFERENCES crew_members(id) ON DELETE CASCADE,
  crew_tag_id UUID REFERENCES crew_tags(id) ON DELETE CASCADE,
  hirer_id UUID REFERENCES hirers(id) ON DELETE CASCADE,

  PRIMARY KEY (crew_member_id, crew_tag_id, hirer_id)
);

-- ============================================================================
-- CREW LISTS
-- ============================================================================

-- Priority lists per hirer
CREATE TABLE crew_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hirer_id UUID REFERENCES hirers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crew members in lists with priority order
CREATE TABLE crew_list_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crew_list_id UUID REFERENCES crew_lists(id) ON DELETE CASCADE,
  crew_member_id UUID REFERENCES crew_members(id) ON DELETE CASCADE,
  priority_order INTEGER NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(crew_list_id, crew_member_id),
  UNIQUE(crew_list_id, priority_order)
);

-- ============================================================================
-- JOBS & OFFERS
-- ============================================================================

-- Jobs posted by hirers
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hirer_id UUID REFERENCES hirers(id) ON DELETE CASCADE,

  -- Job details
  job_name TEXT NOT NULL,
  hold_start_date DATE,
  hold_end_date DATE,
  work_start_date DATE NOT NULL,
  work_end_date DATE NOT NULL,
  rate DECIMAL(10,2),
  location TEXT NOT NULL,

  -- Response deadline config
  response_deadline_type TEXT CHECK (response_deadline_type IN ('per_job', 'per_person')),
  response_deadline_minutes INTEGER NOT NULL,

  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'filled', 'pending_approval', 'forwarded', 'cancelled')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Positions/tags needed per job
CREATE TABLE job_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  crew_tag_id UUID REFERENCES crew_tags(id) ON DELETE CASCADE,
  crew_list_id UUID REFERENCES crew_lists(id),
  quantity_needed INTEGER NOT NULL DEFAULT 1,
  filled_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (filled_count <= quantity_needed)
);

-- Individual job offers sent to crew members
CREATE TABLE job_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  job_position_id UUID REFERENCES job_positions(id) ON DELETE CASCADE,
  crew_member_id UUID REFERENCES crew_members(id) ON DELETE CASCADE,

  -- Cascade tracking
  priority_order INTEGER NOT NULL,
  sent_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ,

  -- Response tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'declined', 'expired')),
  response_at TIMESTAMPTZ,
  response_method TEXT CHECK (response_method IN ('sms', 'web')),

  -- Web accept token
  response_token UUID DEFAULT uuid_generate_v4(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_offers_deadline ON job_offers(deadline_at) WHERE status = 'sent';
CREATE INDEX idx_job_offers_token ON job_offers(response_token);

-- ============================================================================
-- SMS QUEUE
-- ============================================================================

-- SMS queue for outbound messages
CREATE TABLE sms_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_offer_id UUID REFERENCES job_offers(id) ON DELETE CASCADE,
  crew_member_id UUID REFERENCES crew_members(id) ON DELETE CASCADE,

  -- Message details
  message_type TEXT NOT NULL CHECK (message_type IN ('job_offer', 'confirmation', 'opt_in_confirm', 'reminder')),
  message_body TEXT NOT NULL,
  phone_number TEXT NOT NULL,

  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  sns_message_id TEXT,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sms_queue_pending ON sms_queue(scheduled_for) WHERE status = 'pending';

-- ============================================================================
-- ROSTERS
-- ============================================================================

-- Completed crew rosters
CREATE TABLE crew_rosters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,

  -- Roster snapshot (JSON)
  roster_data JSONB NOT NULL,

  -- Production coordinator
  coordinator_email TEXT NOT NULL,

  -- Approval tracking
  approved_by_hirer_at TIMESTAMPTZ,
  forwarded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE hirers ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_member_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_rosters ENABLE ROW LEVEL SECURITY;

-- Hirers: Can read/update their own data
CREATE POLICY hirer_read_own ON hirers
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY hirer_update_own ON hirers
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Hirers: Anonymous can insert (signup)
CREATE POLICY hirer_insert ON hirers
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Crew members: Anonymous can insert (opt-in)
CREATE POLICY crew_insert ON crew_members
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Crew members: Hirers can read crew in their lists
CREATE POLICY hirer_read_crew ON crew_members
  FOR SELECT USING (
    id IN (
      SELECT crew_member_id FROM crew_list_members
      WHERE crew_list_id IN (
        SELECT id FROM crew_lists WHERE hirer_id::text = auth.uid()::text
      )
    )
  );

-- Crew members: Service role can update (for SMS confirmations)
CREATE POLICY service_update_crew ON crew_members
  FOR UPDATE TO service_role USING (true);

-- Crew tags: Hirers can manage their own tags
CREATE POLICY hirer_crew_tags ON crew_tags
  FOR ALL USING (hirer_id::text = auth.uid()::text);

-- Crew member tags: Hirers can manage tags for their crew
CREATE POLICY hirer_crew_member_tags ON crew_member_tags
  FOR ALL USING (hirer_id::text = auth.uid()::text);

-- Crew lists: Hirers can manage their own lists
CREATE POLICY hirer_crew_lists ON crew_lists
  FOR ALL USING (hirer_id::text = auth.uid()::text);

-- Crew list members: Hirers can manage members in their lists
CREATE POLICY hirer_crew_list_members ON crew_list_members
  FOR ALL USING (
    crew_list_id IN (
      SELECT id FROM crew_lists WHERE hirer_id::text = auth.uid()::text
    )
  );

-- Jobs: Hirers can manage their own jobs
CREATE POLICY hirer_jobs ON jobs
  FOR ALL USING (hirer_id::text = auth.uid()::text);

-- Job positions: Hirers can manage positions for their jobs
CREATE POLICY hirer_job_positions ON job_positions
  FOR ALL USING (
    job_id IN (
      SELECT id FROM jobs WHERE hirer_id::text = auth.uid()::text
    )
  );

-- Job offers: Hirers can read offers for their jobs
CREATE POLICY hirer_job_offers ON job_offers
  FOR SELECT USING (
    job_id IN (
      SELECT id FROM jobs WHERE hirer_id::text = auth.uid()::text
    )
  );

-- Job offers: Service role can manage (for cascade logic)
CREATE POLICY service_job_offers ON job_offers
  FOR ALL TO service_role USING (true);

-- Job offers: Anonymous can read by token (for web accept)
CREATE POLICY anon_read_offer_by_token ON job_offers
  FOR SELECT TO anon USING (true);

-- Job offers: Anonymous can update by token (for web accept)
CREATE POLICY anon_update_offer_by_token ON job_offers
  FOR UPDATE TO anon USING (true);

-- SMS queue: Service role only
CREATE POLICY service_sms_queue ON sms_queue
  FOR ALL TO service_role USING (true);

-- Crew rosters: Hirers can manage rosters for their jobs
CREATE POLICY hirer_crew_rosters ON crew_rosters
  FOR ALL USING (
    job_id IN (
      SELECT id FROM jobs WHERE hirer_id::text = auth.uid()::text
    )
  );

-- Crew rosters: Service role can create
CREATE POLICY service_crew_rosters ON crew_rosters
  FOR INSERT TO service_role WITH CHECK (true);
