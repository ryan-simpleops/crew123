/**
 * crew123-handle-sms-webhook
 * Handles incoming SMS responses from crew members
 * Triggered by AWS SNS webhook
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

// SMS message templates
const MESSAGES = {
  OPT_IN_CONFIRMED: "Crew123: You're confirmed! You'll receive job opportunity alerts from department heads. Message frequency varies by job availability. Msg & data rates may apply. Reply HELP for help or STOP to opt out.",
  OPTED_OUT: "Crew123: You've unsubscribed and will no longer receive job alerts. To opt back in, visit the opt-in link from your department head. Contact info@crew123.io with questions.",
  HELP: "Crew123 Help: For support contact info@crew123.io or visit https://crew123.io/sms-terms. You receive job alerts from dept heads. Msg & data rates may apply. Reply STOP to cancel.",
  JOB_ACCEPTED: "Crew123: Confirmed! You've accepted the position. You'll receive details via email. Reply STOP to opt out.",
  JOB_DECLINED: "Crew123: Thanks for letting us know. We'll reach out about future opportunities. Reply STOP to opt out."
};

exports.handler = async (event) => {
  console.log('SMS Webhook received:', JSON.stringify(event, null, 2));

  const dbPool = await getPool();
  const client = await dbPool.connect();

  try {
    // Parse SNS message
    const snsMessage = JSON.parse(event.Records[0].Sns.Message);
    const fromPhone = snsMessage.originationNumber;
    const messageBody = snsMessage.messageBody.trim().toUpperCase();

    console.log(`SMS from ${fromPhone}: "${messageBody}"`);

    // Find crew member by phone
    const crewResult = await client.query(`
      SELECT id, name, sms_consent_confirmed, opted_out
      FROM crew_members
      WHERE phone = $1
    `, [fromPhone]);

    if (crewResult.rows.length === 0) {
      console.log('Unknown phone number, ignoring');
      return { statusCode: 200, body: 'Unknown number' };
    }

    const crewMember = crewResult.rows[0];

    // Handle different message types
    if (messageBody === 'YES') {
      await handleYesResponse(client, crewMember, fromPhone);
    } else if (messageBody === 'STOP') {
      await handleStopResponse(client, crewMember.id, fromPhone);
    } else if (messageBody === 'HELP') {
      await handleHelpResponse(client, fromPhone);
    } else if (messageBody === '1') {
      await handleAcceptResponse(client, crewMember.id, fromPhone);
    } else if (messageBody === '2') {
      await handleDeclineResponse(client, crewMember.id, fromPhone);
    } else if (messageBody === '3') {
      await handleMoreInfoResponse(client, crewMember.id, fromPhone);
    } else {
      console.log(`Unrecognized command: "${messageBody}"`);

      // Send helpful error message
      const errorMessage = "Crew123: Invalid response. Reply 1 for YES, 2 for NO, or 3 for MORE INFO. Reply HELP for support or STOP to opt out.";
      await queueMessage(client, crewMember.id, fromPhone, errorMessage, 'confirmation');
    }

    return { statusCode: 200, body: 'Processed' };

  } catch (error) {
    console.error('Error handling SMS webhook:', error);
    throw error;
  } finally {
    client.release();
  }
};

async function handleYesResponse(client, crewMember, phone) {
  if (crewMember.sms_consent_confirmed) {
    console.log('Already confirmed, ignoring');
    return;
  }

  // Update consent
  await client.query(`
    UPDATE crew_members
    SET sms_consent_confirmed = true,
        sms_consent_confirmed_at = NOW()
    WHERE id = $1
  `, [crewMember.id]);

  // Queue confirmation message
  await queueMessage(client, crewMember.id, phone, MESSAGES.OPT_IN_CONFIRMED, 'opt_in_confirm');

  console.log(`Crew member ${crewMember.id} confirmed opt-in`);
}

async function handleStopResponse(client, crewMemberId, phone) {
  // Mark as opted out
  await client.query(`
    UPDATE crew_members
    SET opted_out = true,
        opted_out_at = NOW()
    WHERE id = $1
  `, [crewMemberId]);

  // Queue opt-out confirmation
  await queueMessage(client, crewMemberId, phone, MESSAGES.OPTED_OUT, 'confirmation');

  console.log(`Crew member ${crewMemberId} opted out`);
}

async function handleHelpResponse(client, crewMemberId, phone) {
  // Queue help message
  await queueMessage(client, crewMemberId, phone, MESSAGES.HELP, 'confirmation');

  console.log(`Sent help message to ${crewMemberId}`);
}

async function handleAcceptResponse(client, crewMemberId, phone) {
  // Find most recent sent job offer
  const offerResult = await client.query(`
    SELECT jo.id, jo.job_id, jo.job_position_id, j.job_name, j.hirer_id
    FROM job_offers jo
    JOIN jobs j ON j.id = jo.job_id
    WHERE jo.crew_member_id = $1
    AND jo.status = 'sent'
    ORDER BY jo.sent_at DESC
    LIMIT 1
  `, [crewMemberId]);

  if (offerResult.rows.length === 0) {
    console.log('No active job offer found');
    return;
  }

  const offer = offerResult.rows[0];

  // Update offer as accepted
  await client.query(`
    UPDATE job_offers
    SET status = 'accepted',
        response_at = NOW(),
        response_method = 'sms'
    WHERE id = $1
  `, [offer.id]);

  // Increment filled count
  await client.query(`
    UPDATE job_positions
    SET filled_count = filled_count + 1
    WHERE id = $1
  `, [offer.job_position_id]);

  // Check if job is fully filled
  const jobCheck = await client.query(`
    SELECT jp.job_id,
           SUM(jp.quantity_needed) as total_needed,
           SUM(jp.filled_count) as total_filled
    FROM job_positions jp
    WHERE jp.job_id = $1
    GROUP BY jp.job_id
  `, [offer.job_id]);

  if (jobCheck.rows[0].total_filled >= jobCheck.rows[0].total_needed) {
    await client.query(`
      UPDATE jobs SET status = 'filled' WHERE id = $1
    `, [offer.job_id]);
    console.log(`Job ${offer.job_id} is now filled`);
  }

  // Queue confirmation message
  await queueMessage(client, crewMemberId, phone, MESSAGES.JOB_ACCEPTED, 'confirmation');

  console.log(`Crew member ${crewMemberId} accepted offer ${offer.id}`);
}

async function handleDeclineResponse(client, crewMemberId, phone) {
  // Find most recent sent job offer
  const offerResult = await client.query(`
    SELECT jo.id, jo.job_id, jo.job_position_id, jo.priority_order
    FROM job_offers jo
    WHERE jo.crew_member_id = $1
    AND jo.status = 'sent'
    ORDER BY jo.sent_at DESC
    LIMIT 1
  `, [crewMemberId]);

  if (offerResult.rows.length === 0) {
    console.log('No active job offer found');
    return;
  }

  const offer = offerResult.rows[0];

  // Update offer as declined
  await client.query(`
    UPDATE job_offers
    SET status = 'declined',
        response_at = NOW(),
        response_method = 'sms'
    WHERE id = $1
  `, [offer.id]);

  // Trigger cascade to next person
  await cascadeToNextPerson(client, offer.job_id, offer.job_position_id, offer.priority_order);

  // Queue confirmation message
  await queueMessage(client, crewMemberId, phone, MESSAGES.JOB_DECLINED, 'confirmation');

  console.log(`Crew member ${crewMemberId} declined offer ${offer.id}`);
}

async function handleMoreInfoResponse(client, crewMemberId, phone) {
  // Find most recent sent job offer
  const offerResult = await client.query(`
    SELECT jo.response_token
    FROM job_offers jo
    WHERE jo.crew_member_id = $1
    AND jo.status = 'sent'
    ORDER BY jo.sent_at DESC
    LIMIT 1
  `, [crewMemberId]);

  if (offerResult.rows.length === 0) {
    console.log('No active job offer found');
    return;
  }

  const token = offerResult.rows[0].response_token;
  const infoMessage = `Crew123: View full job details and respond here: https://crew123.io/accept/${token}`;

  await queueMessage(client, crewMemberId, phone, infoMessage, 'confirmation');

  console.log(`Sent job details link to ${crewMemberId}`);
}

async function cascadeToNextPerson(client, jobId, jobPositionId, currentPriority) {
  // Find next person in priority order
  const nextOffer = await client.query(`
    SELECT id, crew_member_id, response_token
    FROM job_offers
    WHERE job_id = $1
    AND job_position_id = $2
    AND priority_order > $3
    AND status = 'pending'
    ORDER BY priority_order ASC
    LIMIT 1
  `, [jobId, jobPositionId, currentPriority]);

  if (nextOffer.rows.length === 0) {
    console.log('No more crew members in cascade');
    return;
  }

  const offer = nextOffer.rows[0];

  // Get job details for message
  const jobDetails = await client.query(`
    SELECT j.job_name, j.work_start_date, j.work_end_date, j.rate, j.location,
           jp.response_deadline_minutes,
           h.name as hirer_name,
           ct.tag_name,
           cm.phone, cm.name as crew_name
    FROM job_offers jo
    JOIN jobs j ON j.id = jo.job_id
    JOIN hirers h ON h.id = j.hirer_id
    JOIN job_positions jp ON jp.id = jo.job_position_id
    JOIN crew_tags ct ON ct.id = jp.crew_tag_id
    JOIN crew_members cm ON cm.id = jo.crew_member_id
    WHERE jo.id = $1
  `, [offer.id]);

  const job = jobDetails.rows[0];

  // Build SMS message
  const message = `Crew123: ${job.hirer_name} has a ${job.tag_name} position for "${job.job_name}" ` +
    `${formatDate(job.work_start_date)} - ${formatDate(job.work_end_date)}. ` +
    `Rate: $${job.rate}/day. Location: ${job.location}. ` +
    `Reply 1 for YES, 2 for NO, or visit crew123.io/accept/${offer.response_token}. ` +
    `You have ${Math.floor(job.response_deadline_minutes / 60)} hours to respond.`;

  // Queue the message
  await client.query(`
    INSERT INTO sms_queue (job_offer_id, crew_member_id, message_type, message_body, phone_number, scheduled_for)
    VALUES ($1, $2, 'job_offer', $3, $4, NOW())
  `, [offer.id, offer.crew_member_id, message, job.phone]);

  // Update offer deadline
  const deadline = new Date(Date.now() + job.response_deadline_minutes * 60 * 1000);
  await client.query(`
    UPDATE job_offers
    SET status = 'pending'
    WHERE id = $1
  `, [offer.id]);

  console.log(`Cascaded to next person for job ${jobId}`);
}

async function queueMessage(client, crewMemberId, phone, message, messageType) {
  await client.query(`
    INSERT INTO sms_queue (crew_member_id, message_type, message_body, phone_number, scheduled_for)
    VALUES ($1, $2, $3, $4, NOW())
  `, [crewMemberId, messageType, message, phone]);
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
