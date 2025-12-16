/**
 * crew123-send-sms
 * Sends SMS via AWS SNS
 */

const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-west-1' });
const SNS_PHONE_NUMBER = process.env.SNS_PHONE_NUMBER;

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const { phone, message } = event;

    if (!phone || !message) {
      throw new Error('Missing required fields: phone, message');
    }

    // Format phone to E.164 if needed
    const formattedPhone = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;

    // Send SMS via SNS
    const command = new PublishCommand({
      PhoneNumber: formattedPhone,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional'
        },
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: 'Crew123'
        }
      }
    });

    const response = await snsClient.send(command);

    console.log('SMS sent successfully:', response.MessageId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        messageId: response.MessageId,
        phone: formattedPhone
      })
    };
  } catch (error) {
    console.error('Error sending SMS:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
