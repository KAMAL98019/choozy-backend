const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
require("dotenv").config();

// Initialize SES Client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Send OTP via Email using AWS SES
 * @param {string} email - Recipient email address
 * @param {string} otp - OTP code to send
 * @param {string} purpose - Purpose of OTP (e.g., "login", "registration", "password-reset")
 * @param {string} userName - Optional user name for personalization
 * @returns {Promise<Object>} - Response from AWS SES
 */
const sendOTPViaEmail = async (email, otp, purpose = "verification", userName = null) => {
  try {
    // Customize subject and message based on purpose
    let subject, htmlBody, textBody;
    
    const appName = process.env.APP_NAME || "Food Delivery App";
    const greeting = userName ? `Hi ${userName},` : "Hello,";
    
    switch (purpose) {
      case "registration":
        subject = `Welcome to ${appName} - Verify Your Email`;
        htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
              .otp-box { background: #fff; border: 2px dashed #4CAF50; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
              .otp-code { font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 5px; }
              .footer { background: #333; color: #fff; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 5px 5px; }
              .warning { color: #ff6b6b; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to ${appName}!</h1>
              </div>
              <div class="content">
                <p>${greeting}</p>
                <p>Thank you for registering with ${appName}. To complete your registration, please verify your email address using the OTP below:</p>
                
                <div class="otp-box">
                  <p style="margin: 0; color: #666;">Your Verification Code</p>
                  <p class="otp-code">${otp}</p>
                  <p style="margin: 0; color: #999; font-size: 14px;">Valid for 5 minutes</p>
                </div>
                
                <p>If you didn't request this code, please ignore this email.</p>
                <p class="warning">⚠️ Never share this code with anyone.</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        textBody = `${greeting}\n\nYour verification code is: ${otp}\n\nThis code is valid for 5 minutes.\n\nIf you didn't request this, please ignore this email.\n\n${appName}`;
        break;

      case "login":
        subject = `${appName} - Login Verification Code`;
        htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
              .otp-box { background: #fff; border: 2px dashed #2196F3; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
              .otp-code { font-size: 32px; font-weight: bold; color: #2196F3; letter-spacing: 5px; }
              .footer { background: #333; color: #fff; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 5px 5px; }
              .warning { color: #ff6b6b; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Login Verification</h1>
              </div>
              <div class="content">
                <p>${greeting}</p>
                <p>Someone is trying to login to your ${appName} account. Use the code below to complete your login:</p>
                
                <div class="otp-box">
                  <p style="margin: 0; color: #666;">Your Login Code</p>
                  <p class="otp-code">${otp}</p>
                  <p style="margin: 0; color: #999; font-size: 14px;">Valid for 5 minutes</p>
                </div>
                
                <p>If you didn't try to login, please secure your account immediately.</p>
                <p class="warning">⚠️ Never share this code with anyone.</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        textBody = `${greeting}\n\nYour login code is: ${otp}\n\nThis code is valid for 5 minutes.\n\nIf you didn't try to login, please secure your account.\n\n${appName}`;
        break;

      case "password-reset":
        subject = `${appName} - Password Reset Code`;
        htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
              .otp-box { background: #fff; border: 2px dashed #FF9800; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
              .otp-code { font-size: 32px; font-weight: bold; color: #FF9800; letter-spacing: 5px; }
              .footer { background: #333; color: #fff; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 5px 5px; }
              .warning { color: #ff6b6b; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>${greeting}</p>
                <p>You requested to reset your password for your ${appName} account. Use the code below to proceed:</p>
                
                <div class="otp-box">
                  <p style="margin: 0; color: #666;">Your Reset Code</p>
                  <p class="otp-code">${otp}</p>
                  <p style="margin: 0; color: #999; font-size: 14px;">Valid for 5 minutes</p>
                </div>
                
                <p class="warning">⚠️ If you didn't request a password reset, please ignore this email and secure your account.</p>
                <p>Never share this code with anyone, including ${appName} staff.</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        textBody = `${greeting}\n\nYour password reset code is: ${otp}\n\nThis code is valid for 5 minutes.\n\nIf you didn't request this, please ignore this email.\n\n${appName}`;
        break;

      default:
        subject = `${appName} - Verification Code`;
        htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #673AB7; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
              .otp-box { background: #fff; border: 2px dashed #673AB7; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
              .otp-code { font-size: 32px; font-weight: bold; color: #673AB7; letter-spacing: 5px; }
              .footer { background: #333; color: #fff; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 5px 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Verification Code</h1>
              </div>
              <div class="content">
                <p>${greeting}</p>
                <p>Your verification code is:</p>
                
                <div class="otp-box">
                  <p class="otp-code">${otp}</p>
                  <p style="margin: 0; color: #999; font-size: 14px;">Valid for 5 minutes</p>
                </div>
                
                <p>If you didn't request this code, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        textBody = `${greeting}\n\nYour verification code is: ${otp}\n\nThis code is valid for 5 minutes.\n\n${appName}`;
    }

    const params = {
      Source: process.env.SES_SENDER_EMAIL || "noreply@yourdomain.com", // Must be verified in SES
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: "UTF-8",
          },
          Text: {
            Data: textBody,
            Charset: "UTF-8",
          },
        },
      },
    };

    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);

    console.log(`✅ Email OTP sent successfully to ${email}`);
    console.log(`📧 MessageId: ${response.MessageId}`);

    return {
      success: true,
      messageId: response.MessageId,
      email: email,
    };
  } catch (error) {
    console.error("❌ AWS SES Error:", error);

    // Log detailed error for debugging
    if (error.name === "MessageRejected") {
      console.error("Message rejected - Check email address and SES configuration");
    } else if (error.name === "MailFromDomainNotVerifiedException") {
      console.error("Domain not verified - Verify domain in AWS SES");
    } else if (error.name === "ConfigurationSetDoesNotExistException") {
      console.error("Configuration set not found");
    }

    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send custom email (for notifications, alerts, etc.)
 * @param {string} email - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML body content
 * @param {string} textBody - Plain text body content
 * @returns {Promise<Object>} - Response from AWS SES
 */
const sendCustomEmail = async (email, subject, htmlBody, textBody = null) => {
  try {
    const params = {
      Source: process.env.SES_SENDER_EMAIL || "noreply@yourdomain.com",
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: "UTF-8",
          },
          ...(textBody && {
            Text: {
              Data: textBody,
              Charset: "UTF-8",
            },
          }),
        },
      },
    };

    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);

    console.log(`✅ Custom email sent successfully to ${email}`);

    return {
      success: true,
      messageId: response.MessageId,
      email: email,
    };
  } catch (error) {
    console.error("❌ AWS SES Error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = {
  sendOTPViaEmail,
  sendCustomEmail,
};