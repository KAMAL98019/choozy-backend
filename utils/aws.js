const AWS = require('aws-sdk');
require('dotenv').config();

console.log(process.env.AWS_REGION)

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// ---------- Send SMS via SNS ----------
const sendSMS = async (mobile, message) => {
  const sns = new AWS.SNS({ region: process.env.AWS_REGION });

  // Ensure phone number has +91 or proper country code
  const formattedMobile = mobile.startsWith('+') ? mobile : `+91${mobile}`;

  const params = {
    Message: message,
    PhoneNumber: formattedMobile,
    MessageAttributes: {
      'AWS.SNS.SMS.SMSType': {
        DataType: 'String',
        StringValue: 'Promotional'
      }
    }
  };

  try {
    const result = await sns.publish(params).promise();
    console.log('✅ SMS sent:', result.MessageId);
    return true;
  } catch (err) {
    console.error('❌ SMS Send Failed:', err);
    return false;
  }
};




module.exports = { sendSMS };
