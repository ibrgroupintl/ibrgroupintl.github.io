// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {Storage} = require('@google-cloud/storage');

admin.initializeApp();
const storage = new Storage();
const BUCKET = 'wale-491803.firebasestorage.app'; // Exact bucket name

exports.getPostsCsv = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }
  // Optional: check custom claims e.g. isSubscriber
  // if (!context.auth.token.isSubscriber) throw new functions.https.HttpsError('permission-denied','Subscribers only');

  const file = storage.bucket(BUCKET).file('Default/posts.csv');
  const expiresMs = Date.now() + 5 * 60 * 1000; // 5 minutes
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: expiresMs,
  });
  return { url };
});