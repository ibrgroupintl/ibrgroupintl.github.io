const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');

admin.initializeApp();
const storage = new Storage();
const BUCKET = 'wale-491803.firebasestorage.app';
const db = admin.firestore();
const AUTHORIZED_ADMIN_EMAIL = 'developers@ibrecruitment.com';

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function pickPayloadField(body, keys) {
  for (const key of keys) {
    if (body && body[key] !== undefined && body[key] !== null && String(body[key]).trim() !== '') {
      return body[key];
    }
  }
  return '';
}

exports.getPostsCsv = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const file = storage.bucket(BUCKET).file('Default/posts.csv');
  try {
    const expiresMs = Date.now() + 5 * 60 * 1000;
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: expiresMs,
    });
    return { url };
  } catch (err) {
    console.error('getPostsCsv: failed to create signed URL', { error: err && err.stack ? err.stack : err });
    throw new functions.https.HttpsError('internal', 'Could not create signed URL');
  }
});

exports.adminMessageWebhook = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD, DELETE, PUT');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, service: 'adminMessageWebhook' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = normalizeText(req.get('authorization'));
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = normalizeText(authHeader.slice(7));
    if (!idToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (verifyErr) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tokenEmail = normalizeEmail(decodedToken && decodedToken.email);
    if (tokenEmail !== AUTHORIZED_ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const recipientUidInput = normalizeText(pickPayloadField(req.body, ['recipientUid', 'userUid', 'uid']));
    const recipientLoginEmailInput = normalizeEmail(pickPayloadField(req.body, ['recipientLoginEmail', 'recipientAccountEmail', 'loginEmail', 'userEmail']));

    let recipientUid = recipientUidInput;
    let recipientLoginEmail = recipientLoginEmailInput;

    if (!recipientUid && recipientLoginEmail) {
      try {
        const userRecord = await admin.auth().getUserByEmail(recipientLoginEmail);
        recipientUid = userRecord.uid;
        recipientLoginEmail = normalizeEmail(userRecord.email || recipientLoginEmail);
      } catch (lookupErr) {
        return res.status(400).json({ error: 'recipientLoginEmail does not match an existing user' });
      }
    }

    if (recipientUid && !recipientLoginEmail) {
      try {
        const userRecord = await admin.auth().getUser(recipientUid);
        recipientLoginEmail = normalizeEmail(userRecord.email || '');
      } catch (lookupErr) {
        recipientLoginEmail = '';
      }
    }

    if (!recipientUid) {
      return res.status(400).json({ error: 'recipientUid or recipientLoginEmail is required' });
    }

    const senderEmail = normalizeEmail(pickPayloadField(req.body, ['senderEmail', 'fromEmail', 'from'])) || tokenEmail || AUTHORIZED_ADMIN_EMAIL;
    const subject = normalizeText(pickPayloadField(req.body, ['subject', 'title'])) || 'New message from admin';
    const body = normalizeText(pickPayloadField(req.body, ['body', 'text', 'message']));
    const htmlBody = normalizeText(pickPayloadField(req.body, ['html', 'htmlBody']));
    const originalMessageId = normalizeText(pickPayloadField(req.body, ['messageId', 'emailId', 'id']));

    const messageRecord = {
      recipientUid,
      recipientLoginEmail,
      recipientEmail: recipientLoginEmail,
      senderEmail,
      subject,
      body,
      htmlBody,
      originalMessageId,
      source: AUTHORIZED_ADMIN_EMAIL,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      messageState: 'available',
      isOpened: false,
      openedAt: null,
      openedByUid: null
    };

    const docRef = await db.collection('messages').add(messageRecord);

    return res.status(200).json({
      ok: true,
      messageId: docRef.id,
      recipientUid,
      recipientLoginEmail,
      messageState: 'available'
    });
  } catch (err) {
    console.error('adminMessageWebhook failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

exports.notifyMessageRecipient = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD, DELETE, PUT');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }

  return res.status(410).json({
    ok: false,
    message: 'This endpoint is retired. Messages are handled in-app only.'
  });
});
