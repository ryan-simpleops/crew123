# Crew123 Application Design Document

**Version:** 1.0
**Last Updated:** December 14, 2025
**Status:** Design Phase

---

## Executive Summary

Crew123 is a TCPA-compliant SMS notification platform for film production crew hiring. The platform enables department heads and production companies (hirers) to send time-sensitive job opportunities to crew members via SMS using a priority-based cascade system.

**Key Differentiators:**
- In-network tool (not a job board - hirers contact their existing crews)
- Crew members never log in (SMS-only interaction)
- Automatic cascade to next person if no response
- Double opt-in TCPA compliance
- Freemium model with tiered pricing

---

## System Overview

### Core Functionality

1. **Hirer Dashboard (Web)**
   - Create and manage crew priority lists
   - Post jobs with configurable response deadlines
   - Track job status and crew responses in real-time
   - Approve and forward completed rosters to production coordinators
   - Manage billing and subscription

2. **Crew Member Experience (SMS-only)**
   - Receive job opportunity notifications via SMS
   - Accept/decline via SMS reply (1/2/3) or web link
   - No login required, no app to download
   - Opt-in/out management

3. **Automated Cascade System**
   - Configurable response deadlines (per-job or per-person)
   - Automatic progression to next person on priority list
   - Real-time notifications to hirers

---

## Architecture

### Technology Stack

**Frontend:**
- React (Vite)
- React Router
- Deployed on Vercel

**Backend:**
- Supabase (PostgreSQL + Edge Functions)
- Supabase Auth (hirer authentication only)
- Supabase Row Level Security (RLS)

**SMS Infrastructure:**
- AWS SNS (10DLC) - SMS transport layer only
- Cloudflare Turnstile - Bot protection on forms

**Scheduled Tasks:**
- AWS EventBridge - Triggers Supabase Edge Functions on schedule

**Payments:**
- Stripe - Subscription billing

**Hosting:**
- Vercel (frontend)
- Supabase (backend/database)
- crew123.io domain

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Hirer      │  │   Crew       │  │   Accept     │      │
│  │  Dashboard   │  │  Opt-in      │  │   Link       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              PostgreSQL Database                      │  │
│  │  (hirers, crew_members, jobs, queue, rosters, etc.)  │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Edge Functions (Deno)                    │  │
│  │  • send-sms           • handle-sms-webhook           │  │
│  │  • process-queue      • check-deadlines              │  │
│  │  • verify-turnstile   • send-hirer-welcome           │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                         ▲                          │
└─────────┼─────────────────────────┼──────────────────────────┘
          │                         │
          ▼                         │
┌─────────────────────────┐         │
│      AWS SNS (10DLC)    │─────────┘
│   SMS Send/Receive      │  (Webhook)
└─────────────────────────┘
          │
          ▼
┌─────────────────────────┐
│  AWS EventBridge        │
│  (Cron Triggers)        │
│  • Every 1 min: queue   │
│  • Every 1 min: deadlines│
└─────────────────────────┘
          │
          └──────────────────┐
                             ▼
┌─────────────────────────────────────┐
│            EXTERNAL SERVICES         │
│  ┌────────────┐  ┌────────────────┐ │
│  │   Stripe   │  │   Cloudflare   │ │
│  │  Payments  │  │   Turnstile    │ │
│  └────────────┘  └────────────────┘ │
└─────────────────────────────────────┘
```

---

## Database Schema

### Core Tables

#### `hirers`
Stores hirer (department head/production company) information and subscription status.

```sql
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
  hit_free_limit BOOLEAN DEFAULT FALSE, -- Marketing tracking

  -- Terms
  agreed_to_terms BOOLEAN DEFAULT FALSE,
  agreed_to_contact_crew BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Subscription Tiers:**
- `free`: 1 job per 30 days from registration
- `tier1`: 5 jobs/month at $9/month
- `tier2`: Unlimited jobs at $25/month

#### `positions`
Reference table for crew positions (Grip, Electric, Camera Operator, etc.)

```sql
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO positions (name) VALUES
  ('Grip'), ('Electric'), ('Gaffer'), ('Best Boy Electric'),
  ('Camera Operator'), ('1st AC'), ('2nd AC'), ('DIT'),
  ('Production Assistant'), ('Script Supervisor'), ('Sound Mixer');
```

#### `crew_members`
Stores crew member contact info and opt-in status. Crew never log in.

```sql
CREATE TABLE crew_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL, -- E.164 format
  name TEXT NOT NULL,
  email TEXT,

  -- Position tags (many-to-many via junction table)

  -- Consent tracking
  web_consent_given BOOLEAN DEFAULT FALSE,
  web_consent_at TIMESTAMPTZ,
  sms_consent_confirmed BOOLEAN DEFAULT FALSE, -- True after replying YES
  sms_consent_confirmed_at TIMESTAMPTZ,
  opted_out BOOLEAN DEFAULT FALSE,
  opted_out_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(phone) -- One phone per crew member
);
```

#### `crew_member_positions`
Many-to-many relationship between crew members and positions.

```sql
CREATE TABLE crew_member_positions (
  crew_member_id UUID REFERENCES crew_members(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  PRIMARY KEY (crew_member_id, position_id)
);
```

#### `crew_lists`
Priority lists created by hirers (e.g., "Camera Team - A List", "Grips - Preferred").

```sql
CREATE TABLE crew_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hirer_id UUID REFERENCES hirers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `crew_list_members`
Maps crew members to lists with priority order.

```sql
CREATE TABLE crew_list_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crew_list_id UUID REFERENCES crew_lists(id) ON DELETE CASCADE,
  crew_member_id UUID REFERENCES crew_members(id) ON DELETE CASCADE,
  priority_order INTEGER NOT NULL, -- 1 = first to contact, 2 = second, etc.

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(crew_list_id, crew_member_id),
  UNIQUE(crew_list_id, priority_order) -- Each position in list is unique
);
```

#### `jobs`
Job postings created by hirers.

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hirer_id UUID REFERENCES hirers(id) ON DELETE CASCADE,

  -- Job details
  job_name TEXT NOT NULL,
  hold_start_date DATE, -- Optional hold dates
  hold_end_date DATE,
  work_start_date DATE NOT NULL,
  work_end_date DATE NOT NULL,
  rate DECIMAL(10,2),
  location TEXT NOT NULL,

  -- Response deadline config
  response_deadline_type TEXT CHECK (response_deadline_type IN ('per_job', 'per_person')),
  response_deadline_minutes INTEGER NOT NULL, -- e.g., 120 for 2 hours

  -- Status tracking
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'filled', 'pending_approval', 'forwarded', 'cancelled')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `job_positions`
Positions needed for a job (e.g., "Need 2 Grips, 1 Gaffer").

```sql
CREATE TABLE job_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  crew_list_id UUID REFERENCES crew_lists(id), -- Which list to pull from
  quantity_needed INTEGER NOT NULL DEFAULT 1,
  filled_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (filled_count <= quantity_needed)
);
```

#### `job_offers`
Tracks each SMS offer sent to crew members, including cascade state.

```sql
CREATE TABLE job_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  job_position_id UUID REFERENCES job_positions(id) ON DELETE CASCADE,
  crew_member_id UUID REFERENCES crew_members(id) ON DELETE CASCADE,

  -- Cascade tracking
  priority_order INTEGER NOT NULL, -- Their position in the cascade
  sent_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ, -- When offer expires

  -- Response tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'declined', 'expired')),
  response_at TIMESTAMPTZ,
  response_method TEXT CHECK (response_method IN ('sms', 'web')),

  -- Web accept token
  response_token UUID DEFAULT uuid_generate_v4(), -- For web accept links

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_offers_deadline ON job_offers(deadline_at) WHERE status = 'sent';
CREATE INDEX idx_job_offers_token ON job_offers(response_token);
```

#### `sms_queue`
Queue for outbound SMS messages.

```sql
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
  sns_message_id TEXT, -- AWS SNS message ID for tracking
  error_message TEXT,
  attempts INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sms_queue_pending ON sms_queue(scheduled_for) WHERE status = 'pending';
```

#### `crew_rosters`
Completed crew rosters awaiting hirer approval before forwarding.

```sql
CREATE TABLE crew_rosters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,

  -- Roster data (JSON array of crew assignments)
  roster_data JSONB NOT NULL, -- [{crew_member_id, position_id, name, phone, email}, ...]

  -- Production coordinator info
  coordinator_email TEXT NOT NULL,

  -- Approval tracking
  approved_by_hirer_at TIMESTAMPTZ,
  forwarded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## User Flows

### 1. Hirer Registration Flow

```
1. Hirer visits crew123.io/hirer-signup
2. Fills form: name, email, company, role
3. Checks consent boxes (contact crew, T&C, Privacy, SMS Terms)
4. Completes Cloudflare Turnstile
5. Submits → Supabase inserts into `hirers` table
6. Edge Function sends welcome email
7. Hirer receives email with login link (Supabase Auth magic link)
8. Hirer logs in → Dashboard
```

### 2. Crew Opt-In Flow (Double Opt-In)

```
1. Hirer sends email invitation to crew member with link:
   crew123.io/crew-opt-in?hirer_name=John&company=ABC+Productions

2. Crew visits link, sees web form:
   - Name, phone, email
   - Hirer info displayed
   - Explicit consent checkbox
   - Links to T&C, Privacy, SMS Terms
   - Cloudflare Turnstile

3. Crew submits form → Supabase inserts crew_member with web_consent_given=true

4. Edge Function immediately sends SMS confirmation:
   "Crew123: Reply YES to confirm you want to receive job offers via Crew123.
   Reply HELP for support or STOP to opt out. Msg&Data rates may apply."

5. Crew replies "YES" → AWS SNS webhook → Edge Function updates:
   - sms_consent_confirmed = true
   - sms_consent_confirmed_at = NOW()

6. Edge Function sends confirmation SMS:
   "Crew123: You're confirmed! You'll receive job opportunity alerts from
   department heads. Message frequency varies by job availability.
   Msg & data rates may apply. Reply HELP for help or STOP to opt out."

7. Crew member is now active and can receive job offers
```

### 3. Building Priority Lists

```
1. Hirer logs into dashboard
2. Navigates to "Crew Lists" → "Create New List"
3. Names list (e.g., "Camera Operators - A Team")
4. Imports crew members:
   Option A: Upload CSV/Google Sheet (name, phone, email, position)
   Option B: Upload Apple Contacts (.vcf file)
   Option C: Manually add one by one

5. System checks if crew members exist:
   - If exists and opted in → Add to list
   - If exists but not opted in → Show warning, offer to send invite
   - If doesn't exist → Create crew_member record, mark as "invited, pending opt-in"

6. Hirer drags/drops to set priority order
7. Saves list → Inserts into crew_lists and crew_list_members
```

### 4. Posting a Job

```
1. Hirer clicks "Post Job"
2. Fills job form:
   - Job name
   - Hold dates (optional)
   - Work dates (required)
   - Rate
   - Location
   - Positions needed: Select position + quantity + crew list
     Example: "2 Grips from 'Grip A-Team', 1 Gaffer from 'Gaffer List'"
   - Response deadline:
     Option A: "Per Job - Everyone gets 2 hours from first message"
     Option B: "Per Person - Each person gets 2 hours, then next in line"

3. System validates:
   - Check hirer's jobs_used_this_period vs subscription tier limit
   - If at limit: Show upgrade prompt
   - If under limit: Continue

4. Hirer submits → System:
   - Inserts into `jobs` table
   - Inserts into `job_positions` for each position needed
   - Creates job_offers for first crew member(s) in priority order
   - Inserts into sms_queue to send initial offers
   - Updates hirer's jobs_used_this_period += 1

5. Queue processor sends SMS within 1 minute
```

### 5. SMS Cascade Logic

**Scenario: Per-Person Deadline (Sequential)**

```
Job needs 1 Grip, response deadline = 2 hours per person
Priority list: [Alice, Bob, Charlie]

Timeline:
T+0:00  → SMS sent to Alice
         "Crew123: John Smith has a Grip position for 'Feature Film XYZ'
         Jan 15-20. Rate: $450/day. Location: LA. Reply 1 for YES,
         2 for NO, or visit crew123.io/accept/abc123. You have 2 hours."

         job_offers: {crew: Alice, status: 'sent', deadline_at: T+2:00}

T+0:30  → Alice replies "2" (NO)
         job_offers: {crew: Alice, status: 'declined', response_at: T+0:30}

         System immediately:
         - Creates job_offer for Bob
         - Inserts SMS to queue for Bob
         - Sets Bob's deadline_at = T+2:30

T+0:31  → SMS sent to Bob (same message format)

T+1:00  → Bob replies "1" (YES)
         job_offers: {crew: Bob, status: 'accepted', response_at: T+1:00}

         System:
         - Updates job_positions.filled_count = 1
         - Checks if job fully filled → YES
         - Updates job.status = 'filled'
         - Sends confirmation SMS to Bob
         - Notifies hirer via email/dashboard
         - Creates crew_roster record
```

**Scenario: Per-Job Deadline (Parallel)**

```
Job needs 2 Grips, response deadline = 2 hours for job
Priority list: [Alice, Bob, Charlie, Dave]

Timeline:
T+0:00  → SMS sent to Alice AND Bob simultaneously
         Both have until T+2:00 to respond

T+0:30  → Alice replies "1" (YES)
         filled_count = 1/2
         Job still open

T+1:00  → Bob replies "2" (NO)
         Bob declined, SMS sent to Charlie immediately
         Charlie has until T+2:00 (same job deadline)

T+1:15  → Charlie replies "1" (YES)
         filled_count = 2/2
         Job status = 'filled'
         Dave never gets contacted
```

### 6. Crew Response via Web Link

```
1. Crew receives SMS with link: crew123.io/accept/abc123
2. Crew clicks link on phone
3. System validates token:
   - Check if job_offer exists
   - Check if status = 'sent' (not already accepted/declined/expired)
   - Check if deadline_at > NOW() (not expired)

4. If valid: Show accept page
   - Job name: "Feature Film XYZ"
   - Position: Grip
   - Dates: Jan 15-20 (Hold: Jan 10-20)
   - Rate: $450/day
   - Location: Los Angeles
   - Hirer: John Smith (ABC Productions)
   - [Accept] [Decline] buttons

5. Crew clicks [Accept]:
   - Update job_offer: status='accepted', response_method='web', response_at=NOW()
   - Update job_positions.filled_count += 1
   - Check if job filled → update job.status
   - Send confirmation SMS
   - Add to crew roster

6. Crew clicks [Decline]:
   - Update job_offer: status='declined'
   - Trigger cascade to next person in priority order

7. Show confirmation page
```

### 7. Roster Approval & Forwarding

```
1. Job status changes to 'filled'
2. Hirer receives notification: "Your job 'Feature Film XYZ' is fully booked!"
3. Hirer logs into dashboard → sees roster:

   Position      | Name           | Phone         | Email
   --------------|----------------|---------------|-------------------
   Grip          | Bob Smith      | 555-123-4567  | bob@example.com
   Grip          | Charlie Jones  | 555-234-5678  | charlie@ex.com
   Gaffer        | Alice Lee      | 555-345-6789  | alice@example.com

4. Hirer reviews roster, enters production coordinator email
5. Clicks "Approve & Forward to Production Coordinator"
6. System:
   - Updates crew_rosters: approved_by_hirer_at = NOW()
   - Sends email to coordinator with full crew details
   - Updates crew_rosters: forwarded_at = NOW()
   - Updates job.status = 'forwarded'

7. Coordinator receives formatted email with all crew contact info
```

---

## Edge Functions

### 1. `send-sms`
**Purpose:** Send SMS via AWS SNS API
**Trigger:** Called by other Edge Functions
**Input:** `{ phone, message }`
**Logic:**
```typescript
1. Format phone number to E.164
2. Call AWS SNS publishMessage API
3. Return message ID or throw error
```

### 2. `process-queue`
**Purpose:** Process pending messages in sms_queue
**Trigger:** AWS EventBridge every 1 minute
**Logic:**
```typescript
1. Query sms_queue WHERE status='pending' AND scheduled_for <= NOW()
2. For each message:
   - Call send-sms function
   - Update status='sent', sent_at=NOW(), sns_message_id
   - On error: increment attempts, set error_message
   - If attempts > 3: status='failed'
```

### 3. `check-deadlines`
**Purpose:** Check for expired job offers and trigger cascade
**Trigger:** AWS EventBridge every 1 minute
**Logic:**
```typescript
1. Query job_offers WHERE status='sent' AND deadline_at <= NOW()
2. For each expired offer:
   - Update status='expired'
   - Get job_position and check if still needs crew
   - If yes: Get next crew member in priority order
   - Create new job_offer for next person
   - Insert into sms_queue
   - Update deadline based on response_deadline_type
```

### 4. `handle-sms-webhook`
**Purpose:** Process incoming SMS responses from crew
**Trigger:** AWS SNS webhook
**Input:** SNS message payload
**Logic:**
```typescript
1. Parse SNS webhook payload (from_phone, message_body)
2. Lookup crew_member by phone
3. Check message_body:

   If "YES" (case-insensitive):
     - Check if crew_member has pending SMS confirmation
     - Update sms_consent_confirmed=true
     - Send confirmation SMS

   If "STOP":
     - Update crew_member: opted_out=true, opted_out_at=NOW()
     - Send opt-out confirmation SMS

   If "HELP":
     - Send help message SMS

   If "1" (Accept):
     - Find most recent job_offer for this crew_member WHERE status='sent'
     - Update job_offer: status='accepted', response_method='sms'
     - Update job_positions.filled_count
     - Check if job filled
     - Send confirmation SMS

   If "2" (Decline):
     - Find most recent job_offer WHERE status='sent'
     - Update job_offer: status='declined'
     - Trigger cascade to next person

   If "3" (More info):
     - Send SMS with web link to job details
```

### 5. `verify-turnstile`
**Purpose:** Verify Cloudflare Turnstile tokens
**Status:** Already implemented
**Used by:** Hirer signup, Crew opt-in forms

### 6. `send-hirer-welcome`
**Purpose:** Send welcome email to new hirers
**Status:** Already implemented
**Trigger:** After hirer registration

---

## Third-Party Services

### AWS SNS (10DLC)
**Purpose:** SMS send/receive transport layer
**Configuration:**
- Phone number: +1 (217) 582-3786
- Campaign: Pending approval (registration-8e9db505384646c0a003f3abdc330102)
- Brand: BBH45JJ (Approved)
- Spending limit: Pending increase to $100/month

**Webhook Setup:**
- AWS SNS → POST to Supabase Edge Function `/handle-sms-webhook`
- Authentication: Verify SNS signature

### AWS EventBridge
**Purpose:** Scheduled triggers for queue processing
**Rules:**
1. `crew123-process-queue`: Every 1 minute → POST to Supabase `/process-queue`
2. `crew123-check-deadlines`: Every 1 minute → POST to Supabase `/check-deadlines`

**Authentication:** Include secret token in request, validate in Edge Function

### Stripe
**Purpose:** Subscription billing
**Products:**
- Free tier: $0/month (1 job per 30 days)
- Tier 1: $9/month (5 jobs/month)
- Tier 2: $25/month (unlimited jobs)

**Webhooks:**
- `subscription.created` → Update hirer subscription_tier
- `subscription.updated` → Update subscription_tier
- `subscription.deleted` → Downgrade to free tier
- `invoice.payment_failed` → Suspend account, notify hirer

### Cloudflare Turnstile
**Purpose:** Bot protection on forms
**Implementation:** Already complete
**Site key:** Stored in `VITE_TURNSTILE_SITE_KEY`

### Supabase Auth
**Purpose:** Hirer authentication only (crew never log in)
**Method:** Magic link (passwordless email login)
**Flow:**
1. Hirer enters email on login page
2. Supabase sends magic link
3. Hirer clicks link → authenticated session
4. Dashboard access via RLS policies

---

## Security & Compliance

### TCPA Compliance
**Requirement:** Telephone Consumer Protection Act - explicit consent for automated SMS
**Implementation:**
- Double opt-in process (web form + SMS confirmation)
- Consent records stored for 4 years (Privacy Policy requirement)
- Opt-out via STOP keyword honored immediately
- 10DLC campaign registration with carrier approval

### Data Retention
- **Consent records:** 4 years (TCPA requirement)
- **Message logs:** 2 years
- **Opt-out records:** Indefinite (must honor forever)
- **Account data:** While account active + 30 days after deletion

### Row Level Security (RLS)
**Hirers table:**
```sql
-- Hirers can read their own data
CREATE POLICY hirer_read_own ON hirers
  FOR SELECT USING (auth.uid()::text = id::text);

-- Hirers can update their own data
CREATE POLICY hirer_update_own ON hirers
  FOR UPDATE USING (auth.uid()::text = id::text);
```

**Jobs table:**
```sql
-- Hirers can only see/edit their own jobs
CREATE POLICY hirer_jobs ON jobs
  FOR ALL USING (hirer_id::text = auth.uid()::text);
```

**Crew members table:**
```sql
-- Anonymous can insert (opt-in form)
CREATE POLICY crew_insert ON crew_members
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Hirers can read crew in their lists
CREATE POLICY hirer_read_crew ON crew_members
  FOR SELECT USING (
    id IN (
      SELECT crew_member_id FROM crew_list_members
      WHERE crew_list_id IN (
        SELECT id FROM crew_lists WHERE hirer_id::text = auth.uid()::text
      )
    )
  );
```

### Environment Variables
**Frontend (.env):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_TURNSTILE_SITE_KEY`

**Supabase Secrets:**
- `TURNSTILE_SECRET_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION=us-west-1`
- `AWS_SNS_PHONE_NUMBER=+12175823786`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `EVENTBRIDGE_SECRET_TOKEN` (for authenticating scheduled triggers)

---

## Billing & Subscriptions

### Subscription Tiers

| Tier   | Price    | Jobs/Month | Features                              |
|--------|----------|------------|---------------------------------------|
| Free   | $0       | 1 per 30d  | All core features, limited usage      |
| Tier 1 | $9/mo    | 5/month    | All features, small production teams  |
| Tier 2 | $25/mo   | Unlimited  | All features, high-volume productions |

### Billing Logic

**Job Counting:**
- Jobs counted per rolling 30-day period from registration date
- `current_billing_period_start` = registration_date + (N * 30 days)
- `jobs_used_this_period` resets to 0 when new billing period starts

**Limit Enforcement:**
```typescript
// When hirer posts job
if (hirer.jobs_used_this_period >= getTierLimit(hirer.subscription_tier)) {
  // Show upgrade modal
  if (hirer.subscription_tier === 'free' && !hirer.hit_free_limit) {
    // First time hitting limit - mark for marketing
    await updateHirer({ hit_free_limit: true });
  }
  throw new Error('Job limit reached. Please upgrade.');
}
```

**Marketing Opportunities:**
- 30 days after free user hits limit → Email discount offer
- 60 days after registration → Email feature highlights
- Abandoned cart: Started job post but didn't complete → Email nudge

### Stripe Integration

**Customer Creation:**
```typescript
// When hirer upgrades
const customer = await stripe.customers.create({
  email: hirer.email,
  metadata: { hirer_id: hirer.id }
});

await updateHirer({ stripe_customer_id: customer.id });
```

**Subscription Creation:**
```typescript
const subscription = await stripe.subscriptions.create({
  customer: stripe_customer_id,
  items: [{ price: TIER_PRICE_IDS[tier] }],
  payment_behavior: 'default_incomplete',
  expand: ['latest_invoice.payment_intent']
});

// Return client_secret for frontend to confirm payment
```

**Webhook Handling:**
```typescript
// Edge Function: handle-stripe-webhook
switch (event.type) {
  case 'customer.subscription.created':
  case 'customer.subscription.updated':
    await updateHirer({
      subscription_tier: gettierFromPriceId(subscription.plan.id),
      current_billing_period_start: new Date(subscription.current_period_start * 1000)
    });
    break;

  case 'customer.subscription.deleted':
    await updateHirer({ subscription_tier: 'free' });
    break;

  case 'invoice.payment_failed':
    // Notify hirer, potentially suspend account
    await sendPaymentFailedEmail(hirer);
    break;
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
**Goal:** Database, auth, basic Edge Functions

**Tasks:**
1. Set up database schema (all tables)
2. Configure RLS policies
3. Implement Supabase Auth for hirers
4. Create base Edge Functions:
   - `send-sms` (AWS SNS integration)
   - `handle-sms-webhook` (basic SMS response handling)
5. Configure AWS EventBridge triggers
6. Test SMS send/receive flow

**Deliverables:**
- ✅ Database fully migrated
- ✅ SMS can be sent via Edge Function
- ✅ Incoming SMS triggers webhook
- ✅ Hirer can log in

---

### Phase 2: Hirer Dashboard MVP (Week 2)
**Goal:** Hirers can create lists and post jobs

**Tasks:**
1. Build hirer dashboard UI:
   - Login page (magic link)
   - Dashboard home (stats overview)
   - Crew lists management (CRUD)
   - Import crew (CSV/Google Sheets)
2. Build job posting form
3. Implement basic cascade logic (per-person deadline only)
4. Create `process-queue` and `check-deadlines` Edge Functions
5. Add job status tracking to dashboard

**Deliverables:**
- ✅ Hirer can log in and see dashboard
- ✅ Hirer can create crew list
- ✅ Hirer can import CSV of crew
- ✅ Hirer can post job (free tier only)
- ✅ System sends SMS to first crew member
- ✅ If no response, cascades to next person

---

### Phase 3: Crew Response & Job Completion (Week 3)
**Goal:** Crew can accept/decline, jobs can be filled

**Tasks:**
1. Build crew accept page (web link)
2. Implement SMS response handling (1/2/3 replies)
3. Build job acceptance logic:
   - Update filled_count
   - Close job when all positions filled
   - Send confirmation SMS
4. Build roster approval UI
5. Implement email forwarding to production coordinator
6. Add real-time notifications to hirer dashboard

**Deliverables:**
- ✅ Crew can accept via web link or SMS
- ✅ Jobs close when filled
- ✅ Hirer sees roster and can approve
- ✅ Coordinator receives crew roster email

---

### Phase 4: Billing & Subscriptions (Week 4)
**Goal:** Monetization, upgrade flow, limit enforcement

**Tasks:**
1. Integrate Stripe:
   - Create products/prices in Stripe dashboard
   - Build checkout flow
   - Implement webhook handler
2. Add subscription management to dashboard
3. Implement job limit enforcement
4. Build upgrade prompts/modals
5. Add billing period tracking
6. Implement marketing flags (hit_free_limit)

**Deliverables:**
- ✅ Free users limited to 1 job/30 days
- ✅ Paid tiers can post more jobs
- ✅ Upgrade flow works end-to-end
- ✅ Stripe webhooks update subscription status
- ✅ Marketing tracking in place

---

### Phase 5: Polish & Production Readiness (Week 5)
**Goal:** Production launch

**Tasks:**
1. Add position tags and filtering
2. Implement per-job deadline (parallel cascade)
3. Add Apple Contacts import (.vcf)
4. Build crew member management (edit, remove from lists)
5. Add analytics dashboard for hirers
6. Implement email notifications (job filled, roster ready, etc.)
7. Performance optimization
8. Error handling and logging
9. Write user documentation
10. Final QA and bug fixes

**Deliverables:**
- ✅ All features complete
- ✅ Production-ready codebase
- ✅ Documentation for users
- ✅ Monitoring and error tracking
- ✅ Ready to launch

---

### Future Enhancements (Post-Launch)

**Phase 6: Advanced Features**
- Recurring jobs (weekly shows, ongoing productions)
- Multi-position cascade optimization (smart ordering)
- Crew member profiles (availability calendar, rate history)
- Integration with production management tools
- Mobile app for hirers (iOS/Android)
- Analytics and reporting (fill rates, response times, etc.)
- Automated reminders (day-before shoot notifications)
- Crew referrals and recommendations
- Rate negotiation via SMS
- Multi-language support

**Phase 7: Enterprise Features**
- White-label for production companies
- API access for integrations
- Custom branding
- Dedicated account managers
- SLA guarantees
- Advanced analytics and reporting

---

## Appendix

### SMS Message Templates

**Job Offer (per-person deadline):**
```
Crew123: John Smith has a Grip position for "Feature Film XYZ" Jan 15-20.
Rate: $450/day. Location: Los Angeles. Reply 1 for YES, 2 for NO, or visit
crew123.io/accept/abc123. You have 2 hours to respond.
```

**Job Offer (per-job deadline):**
```
Crew123: John Smith has a Grip position for "Feature Film XYZ" Jan 15-20.
Rate: $450/day. Location: Los Angeles. Reply 1 for YES, 2 for NO, or visit
crew123.io/accept/abc123. Offer expires at 3:30 PM today.
```

**Acceptance Confirmation:**
```
Crew123: Confirmed! You've accepted the Grip position with John Smith for
"Feature Film XYZ" starting Jan 15. You'll receive details via email.
Reply STOP to opt out.
```

**Opt-In Confirmation (after YES reply):**
```
Crew123: You're confirmed! You'll receive job opportunity alerts from
department heads. Message frequency varies by job availability.
Msg & data rates may apply. Reply HELP for help or STOP to opt out.
```

**Help Message:**
```
Crew123 Help: For support contact info@crew123.io or visit
https://crew123.io/sms-terms. You receive job alerts from dept heads.
Msg & data rates may apply. Reply STOP to cancel.
```

**Stop Message:**
```
Crew123: You've unsubscribed and will no longer receive job alerts.
To opt back in, visit the opt-in link from your department head.
Contact info@crew123.io with questions.
```

### API Endpoints (Supabase Edge Functions)

| Endpoint                  | Method | Purpose                          | Auth Required |
|---------------------------|--------|----------------------------------|---------------|
| `/send-sms`               | POST   | Send SMS via AWS SNS             | Service       |
| `/process-queue`          | POST   | Process pending SMS queue        | EventBridge   |
| `/check-deadlines`        | POST   | Check expired offers, cascade    | EventBridge   |
| `/handle-sms-webhook`     | POST   | Process incoming SMS             | AWS SNS       |
| `/verify-turnstile`       | POST   | Verify bot protection            | Anonymous     |
| `/send-hirer-welcome`     | POST   | Send welcome email               | Service       |
| `/handle-stripe-webhook`  | POST   | Process Stripe events            | Stripe        |

### Environment Setup Checklist

- [ ] Supabase project created
- [ ] Database schema migrated
- [ ] RLS policies configured
- [ ] Supabase Auth enabled (magic link)
- [ ] AWS SNS phone number verified
- [ ] AWS 10DLC campaign approved
- [ ] AWS EventBridge rules created
- [ ] Stripe account created
- [ ] Stripe products/prices configured
- [ ] Cloudflare Turnstile site key
- [ ] Environment variables set (frontend & backend)
- [ ] Domain DNS configured (crew123.io)
- [ ] SSL certificates installed
- [ ] Vercel deployment configured

---

**End of Design Document**
