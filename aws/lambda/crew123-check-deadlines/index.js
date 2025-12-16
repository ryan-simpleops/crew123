/**
 * crew123-check-deadlines
 * Triggered by EventBridge every 1 minute
 * Checks for expired job offers and triggers cascade to next person
 */

const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { Pool } = require('pg');

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'us-west-1' });

let pool;

// Fetch DATABASE_URL from Parameter Store on cold start
async function getPool() {
  if (!pool) {
    const command = new GetParameterCommand({
      Name: '/crew123/database-url',
      WithDecryption: true
    });
    const response = await ssmClient.send(command);
    pool = new Pool({ connectionString: response.Parameter.Value });
  }
  return pool;
}

exports.handler = async (event) => {
  console.log('Checking for expired deadlines...');

  const dbPool = await getPool();
  const client = await dbPool.connect();

  try {
    // Find all expired offers
    const expiredResult = await client.query(`
      SELECT id, job_id, job_position_id, crew_member_id, priority_order
      FROM job_offers
      WHERE status = 'sent'
      AND deadline_at <= NOW()
      ORDER BY deadline_at ASC
    `);

    console.log(`Found ${expiredResult.rows.length} expired offers`);

    const results = {
      expired: 0,
      cascaded: 0,
      errors: []
    };

    // Process each expired offer
    for (const offer of expiredResult.rows) {
      try {
        // Mark as expired
        await client.query(`
          UPDATE job_offers
          SET status = 'expired'
          WHERE id = $1
        `, [offer.id]);

        results.expired++;
        console.log(`Marked offer ${offer.id} as expired`);

        // Check if position still needs crew
        const positionCheck = await client.query(`
          SELECT quantity_needed, filled_count
          FROM job_positions
          WHERE id = $1
        `, [offer.job_position_id]);

        if (positionCheck.rows.length === 0) {
          console.log('Position not found, skipping cascade');
          continue;
        }

        const position = positionCheck.rows[0];

        if (position.filled_count >= position.quantity_needed) {
          console.log('Position already filled, skipping cascade');
          continue;
        }

        // Cascade to next person
        const cascaded = await cascadeToNextPerson(
          client,
          offer.job_id,
          offer.job_position_id,
          offer.priority_order
        );

        if (cascaded) {
          results.cascaded++;
        }

      } catch (error) {
        console.error(`Error processing expired offer ${offer.id}:`, error);
        results.errors.push({ offerId: offer.id, error: error.message });
      }
    }

    console.log('Deadline check complete:', results);

    return {
      statusCode: 200,
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('Fatal error checking deadlines:', error);
    throw error;
  } finally {
    client.release();
  }
};

async function cascadeToNextPerson(client, jobId, jobPositionId, currentPriority) {
  // Find next person in priority order
  const nextOffer = await client.query(`
    SELECT jo.id, jo.crew_member_id, jo.response_token,
           cm.phone, cm.name as crew_name
    FROM job_offers jo
    JOIN crew_members cm ON cm.id = jo.crew_member_id
    WHERE jo.job_id = $1
    AND jo.job_position_id = $2
    AND jo.priority_order > $3
    AND jo.status = 'pending'
    AND cm.opted_out = false
    AND cm.sms_consent_confirmed = true
    ORDER BY jo.priority_order ASC
    LIMIT 1
  `, [jobId, jobPositionId, currentPriority]);

  if (nextOffer.rows.length === 0) {
    console.log(`No more crew members available for cascade (job: ${jobId}, position: ${jobPositionId})`);
    return false;
  }

  const offer = nextOffer.rows[0];

  // Get job details for message
  const jobDetails = await client.query(`
    SELECT j.job_name, j.work_start_date, j.work_end_date, j.rate, j.location,
           jp.response_deadline_minutes,
           h.name as hirer_name,
           ct.tag_name
    FROM jobs j
    JOIN hirers h ON h.id = j.hirer_id
    JOIN job_positions jp ON jp.job_id = j.id AND jp.id = $2
    JOIN crew_tags ct ON ct.id = jp.crew_tag_id
    WHERE j.id = $1
  `, [jobId, jobPositionId]);

  if (jobDetails.rows.length === 0) {
    console.log('Job not found');
    return false;
  }

  const job = jobDetails.rows[0];

  // Calculate deadline based on type
  const deadlineMinutes = job.response_deadline_minutes;
  const deadline = new Date(Date.now() + deadlineMinutes * 60 * 1000);

  // Build SMS message
  const message = buildJobOfferMessage(job, offer.response_token, deadlineMinutes);

  // Queue the message
  await client.query(`
    INSERT INTO sms_queue (job_offer_id, crew_member_id, message_type, message_body, phone_number, scheduled_for)
    VALUES ($1, $2, 'job_offer', $3, $4, NOW())
  `, [offer.id, offer.crew_member_id, message, offer.phone]);

  // Update offer status and deadline
  await client.query(`
    UPDATE job_offers
    SET status = 'sent',
        sent_at = NOW(),
        deadline_at = $1
    WHERE id = $2
  `, [deadline, offer.id]);

  console.log(`Cascaded to crew member ${offer.crew_member_id} for job ${jobId}`);
  return true;
}

function buildJobOfferMessage(job, responseToken, deadlineMinutes) {
  const hours = Math.floor(deadlineMinutes / 60);
  const hoursText = hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''}` : `${deadlineMinutes} minutes`;

  return `Crew123: ${job.hirer_name} has a ${job.tag_name} position for "${job.job_name}" ` +
    `${formatDate(job.work_start_date)}-${formatDate(job.work_end_date)}. ` +
    `Rate: $${job.rate}/day. Location: ${job.location}. ` +
    `Reply 1 for YES, 2 for NO, or visit crew123.io/accept/${responseToken}. ` +
    `You have ${hoursText} to respond.`;
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}
