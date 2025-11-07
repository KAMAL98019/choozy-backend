const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
require("dotenv").config();

// Initialize SNS Client
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Send OTP via AWS SNS
 * @param {string} mobile - Mobile number with country code (e.g., +919876543210)
 * @param {string} otp - OTP code to send
 * @param {string} purpose - Purpose of OTP (e.g., "login", "registration", "password-reset")
 * @returns {Promise<Object>} - Response from AWS SNS
 */
const sendOTPViaSMS = async (mobile, otp, purpose = "verification") => {
  try {
    // Ensure mobile has country code
    let formattedMobile = mobile;
    if (!mobile.startsWith('+')) {
      // Default to India country code if not provided
      formattedMobile = `+91${mobile}`;
    }

    // Customize message based on purpose
    let message;
    switch (purpose) {
      case "login":
      case "registration":
        message = `Your verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
        break;
      case "password-reset":
        message = `Your password reset code is: ${otp}. Valid for 5 minutes. If you didn't request this, please ignore.`;
        break;
      default:
        message = `Your OTP is: ${otp}. Valid for 5 minutes.`;
    }

    const params = {
      Message: message,
      PhoneNumber: formattedMobile,
      MessageAttributes: {
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Transactional", // Use "Transactional" for OTPs (higher priority)
        },
        "AWS.SNS.SMS.SenderID": {
          DataType: "String",
          StringValue: process.env.SMS_SENDER_ID || "YOURAPP", // Your sender ID (max 6 chars for India)
        },
      },
    };

    const command = new PublishCommand(params);
    const response = await snsClient.send(command);

    console.log(`✅ OTP sent successfully to ${formattedMobile}`);
    console.log(`📱 MessageId: ${response.MessageId}`);

    return {
      success: true,
      messageId: response.MessageId,
      mobile: formattedMobile,
    };
  } catch (error) {
    console.error("❌ AWS SNS Error:", error);
    
    // Log detailed error for debugging
    if (error.name === "InvalidParameterException") {
      console.error("Invalid parameter - Check phone number format or AWS configuration");
    } else if (error.name === "AuthorizationErrorException") {
      console.error("Authorization failed - Check AWS credentials");
    }

    throw new Error(`Failed to send SMS: ${error.message}`);
  }
};

/**
 * Send custom SMS message (for notifications, alerts, etc.)
 * @param {string} mobile - Mobile number with country code
 * @param {string} message - Custom message to send
 * @returns {Promise<Object>} - Response from AWS SNS
 */
const sendCustomSMS = async (mobile, message) => {
  try {
    let formattedMobile = mobile;
    if (!mobile.startsWith('+')) {
      formattedMobile = `+91${mobile}`;
    }

    const params = {
      Message: message,
      PhoneNumber: formattedMobile,
      MessageAttributes: {
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Promotional", // Use "Promotional" for marketing messages
        },
        "AWS.SNS.SMS.SenderID": {
          DataType: "String",
          StringValue: process.env.SMS_SENDER_ID || "YOURAPP",
        },
      },
    };

    const command = new PublishCommand(params);
    const response = await snsClient.send(command);

    console.log(`✅ SMS sent successfully to ${formattedMobile}`);
    
    return {
      success: true,
      messageId: response.MessageId,
      mobile: formattedMobile,
    };
  } catch (error) {
    console.error("❌ AWS SNS Error:", error);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
};

module.exports = {
  sendOTPViaSMS,
  sendCustomSMS,
};