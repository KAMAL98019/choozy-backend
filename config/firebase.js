// const admin = require("firebase-admin");

// const path = require("path");
// require("dotenv").config();

// let serviceAccount;

// try {
//   // If you are using a JSON file (recommended)
//   serviceAccount = require(path.join(__dirname, "serviceAccount.json"));
// } catch (err) {
//   // OR you can use .env variables instead
//   serviceAccount = {
//     project_id: process.env.FIREBASE_PROJECT_ID,
//     client_email: process.env.FIREBASE_CLIENT_EMAIL,
//     private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
//   };
// }

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// module.exports = admin;
