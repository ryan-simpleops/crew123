-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Hirers table (Department heads/Production companies)
CREATE TABLE hirers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    agreed_to_terms BOOLEAN NOT NULL DEFAULT false,
    agreed_to_contact_crew BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crew members table
CREATE TABLE crew_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    hirer_id UUID REFERENCES hirers(id) ON DELETE CASCADE,
    web_consent_given BOOLEAN NOT NULL DEFAULT false,
    web_consent_at TIMESTAMPTZ,
    sms_confirmed BOOLEAN NOT NULL DEFAULT false,
    sms_confirmed_at TIMESTAMPTZ,
    opted_out BOOLEAN NOT NULL DEFAULT false,
    opted_out_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(phone, hirer_id)
);

-- Consent logs table (TCPA compliance - keep detailed records)
CREATE TABLE consent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crew_member_id UUID REFERENCES crew_members(id) ON DELETE CASCADE,
    hirer_id UUID REFERENCES hirers(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL, -- 'web_form', 'sms_confirmation', 'opt_out'
    consent_given BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email invitations table (track emails sent to crew)
CREATE TABLE email_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hirer_id UUID REFERENCES hirers(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    token TEXT NOT NULL UNIQUE,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SMS confirmations table (track SMS opt-in confirmations)
CREATE TABLE sms_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crew_member_id UUID REFERENCES crew_members(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    confirmation_code TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jobs table (for future use when building full app)
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hirer_id UUID REFERENCES hirers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    position TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    response_window_hours INTEGER NOT NULL DEFAULT 24,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'filled', 'cancelled'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_crew_members_phone ON crew_members(phone);
CREATE INDEX idx_crew_members_hirer_id ON crew_members(hirer_id);
CREATE INDEX idx_consent_logs_crew_member ON consent_logs(crew_member_id);
CREATE INDEX idx_consent_logs_created_at ON consent_logs(created_at);
CREATE INDEX idx_email_invitations_token ON email_invitations(token);
CREATE INDEX idx_sms_confirmations_phone ON sms_confirmations(phone);

-- Enable Row Level Security (RLS)
ALTER TABLE hirers ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow public insert for forms, but restrict reads)

-- Hirers: Allow public insert (signup), own data read
CREATE POLICY "Allow public hirer signup" ON hirers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow hirers to read own data" ON hirers
    FOR SELECT USING (auth.uid()::text = id::text);

-- Crew members: Allow public insert (opt-in), hirer can read their crew
CREATE POLICY "Allow public crew opt-in" ON crew_members
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow hirers to read their crew" ON crew_members
    FOR SELECT USING (hirer_id::text = auth.uid()::text);

-- Consent logs: Allow public insert, admin read only
CREATE POLICY "Allow public consent logging" ON consent_logs
    FOR INSERT WITH CHECK (true);

-- Email invitations: Hirer can manage their own
CREATE POLICY "Allow hirers to manage invitations" ON email_invitations
    FOR ALL USING (hirer_id::text = auth.uid()::text);

-- SMS confirmations: Allow public insert and read by phone
CREATE POLICY "Allow public SMS confirmation" ON sms_confirmations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read by phone" ON sms_confirmations
    FOR SELECT USING (true);

-- Jobs: Hirers can manage their own jobs
CREATE POLICY "Allow hirers to manage jobs" ON jobs
    FOR ALL USING (hirer_id::text = auth.uid()::text);

-- Functions for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_hirers_updated_at BEFORE UPDATE ON hirers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crew_members_updated_at BEFORE UPDATE ON crew_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
