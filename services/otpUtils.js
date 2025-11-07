const { sendOTPViaSMS } = require('./smsUtils');
const { sendOTPViaEmail } = require('./emailUtils');
require("dotenv").config();

const ENABLE_SMS = process.env.ENABLE_SMS === 'true';
const ENABLE_EMAIL = process.env.ENABLE_EMAIL === 'true';

// ✅ Load rate-limit config from .env
const OTP_RESEND_INTERVAL_SECONDS = parseInt(process.env.OTP_RESEND_INTERVAL_SECONDS || "60", 10);
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10);

/**
 * Send OTP via SMS, Email, or Both based on input
 */
const sendOTP = async ({ mobile, email, otp, purpose = "verification", userName = null }) => {
  const results = {
    sms: { sent: false, success: false, error: null },
    email: { sent: false, success: false, error: null },
  };

  // ========== Send SMS ==========
  if (mobile) {
    results.sms.sent = true;

    if (ENABLE_SMS) {
      try {
        await sendOTPViaSMS(mobile, otp, purpose);
        results.sms.success = true;
        console.log(`✅ SMS OTP sent to ${mobile}`);
      } catch (error) {
        results.sms.error = error.message;
        console.error(`❌ SMS OTP failed for ${mobile}:`, error.message);
      }
    } else {
      console.log(`🔥 [DEV MODE] SMS OTP for ${mobile}: ${otp}`);
      results.sms.success = true;
    }
  }

  // ========== Send Email ==========
  if (email) {
    results.email.sent = true;

    if (ENABLE_EMAIL) {
      try {
        await sendOTPViaEmail(email, otp, purpose, userName);
        results.email.success = true;
        console.log(`✅ Email OTP sent to ${email}`);
      } catch (error) {
        results.email.error = error.message;
        console.error(`❌ Email OTP failed for ${email}:`, error.message);
      }
    } else {
      console.log(`🔥 [DEV MODE] Email OTP for ${email}: ${otp}`);
      results.email.success = true;
    }
  }

  const overallSuccess = results.sms.success || results.email.success;

  return {
    success: overallSuccess,
    results,
    expiryMinutes: OTP_EXPIRY_MINUTES, // ⏳ include expiry info
    resendIntervalSeconds: OTP_RESEND_INTERVAL_SECONDS, // 🔄 include resend info
    message: overallSuccess
      ? `OTP sent successfully. Valid for ${OTP_EXPIRY_MINUTES} minutes.`
      : "Failed to send OTP via any method",
  };
};

// ========== Helper Functions ==========
const parseIdentifier = (identifier) => {
  const isEmail = identifier.includes('@');
  return {
    mobile: isEmail ? null : identifier,
    email: isEmail ? identifier : null,
  };
};

const sendOTPToIdentifier = async (identifier, otp, purpose = "verification", userName = null) => {
  const { mobile, email } = parseIdentifier(identifier);
  return await sendOTP({ mobile, email, otp, purpose, userName });
};

const sendOTPToBoth = async (mobile, email, otp, purpose = "verification", userName = null) => {
  return await sendOTP({ mobile, email, otp, purpose, userName });
};

module.exports = {
  sendOTP,
  sendOTPToIdentifier,
  sendOTPToBoth,
  parseIdentifier,
};
