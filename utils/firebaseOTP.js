// const admin = require("../config/firebase");

// async function sendFirebaseOTP(fcmToken, otp) {
//   try {
//     const message = {
//       notification: {
//         title: "OTP Verification",
//         body: `Your verification code is ${otp}`
//       },
//       token: fcmToken, // FCM token of the device
//     };

//     const response = await admin.messaging().send(message);
//     return response;
//   } catch (err) {
//     console.error("Firebase send OTP error:", err);
//     return null;
//   }
// }

// module.exports = { sendFirebaseOTP };
