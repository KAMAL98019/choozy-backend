const twilio = require('twilio');
require('dotenv').config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

exports.sendSMS = async (to, message) => {
  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to, // example: +919876543210
    });
    console.log('✅ SMS sent:', result.sid);
    return true;
  } catch (err) {
    console.error('❌ SMS send failed:', err.message);
    return false;
  }
};
