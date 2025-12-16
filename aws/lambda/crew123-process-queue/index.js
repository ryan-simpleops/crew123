/**
 * crew123-process-queue
 * Triggered by EventBridge every 1 minute
 * Queries sms_queue for pending messages and sends them
 */

const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { Pool } = require('pg');

const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-west-1' });
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

const BATCH_SIZE = 50; // Process 50 messages per minute
const MAX_ATTEMPTS = 3;

exports.handler = async (event) => {
  console.log('Processing SMS queue...');

  const dbPool = await getPool();
  const client = await dbPool.connect();

  try {
    // Get pending messages
    const result = await client.query(`
      SELECT id, phone_number, message_body, job_offer_id, crew_member_id, attempts
      FROM sms_queue
      WHERE status = 'pending'
      AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC
      LIMIT $1
    `, [BATCH_SIZE]);

    console.log(`Found ${result.rows.length} messages to send`);

    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    // Process each message
    for (const msg of result.rows) {
      try {
        // Format phone to E.164
        const formattedPhone = msg.phone_number.startsWith('+')
          ? msg.phone_number
          : `+1${msg.phone_number.replace(/\D/g, '')}`;

        // Send SMS via SNS
        const command = new PublishCommand({
          PhoneNumber: formattedPhone,
          Message: msg.message_body,
          MessageAttributes: {
            'AWS.SNS.SMS.SMSType': {
              DataType: 'String',
              StringValue: 'Transactional'
            }
          }
        });

        const response = await snsClient.send(command);

        // Update queue record as sent
        await client.query(`
          UPDATE sms_queue
          SET status = 'sent',
              sent_at = NOW(),
              sns_message_id = $1
          WHERE id = $2
        `, [response.MessageId, msg.id]);

        console.log(`Sent message ${msg.id} to ${formattedPhone}`);
        results.sent++;

      } catch (error) {
        console.error(`Error sending message ${msg.id}:`, error);

        const newAttempts = msg.attempts + 1;
        const status = newAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';

        // Update with error and increment attempts
        await client.query(`
          UPDATE sms_queue
          SET attempts = $1,
              status = $2,
              error_message = $3,
              scheduled_for = CASE
                WHEN $2 = 'pending' THEN NOW() + ($1 * interval '2 minutes')
                ELSE scheduled_for
              END
          WHERE id = $4
        `, [newAttempts, status, error.message, msg.id]);

        if (status === 'failed') {
          results.failed++;
        }
        results.errors.push({ id: msg.id, error: error.message });
      }
    }

    console.log('Queue processing complete:', results);

    return {
      statusCode: 200,
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('Fatal error processing queue:', error);
    throw error;
  } finally {
    client.release();
  }
};
