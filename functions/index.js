const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const Stripe = require('stripe');

admin.initializeApp();
const storage = new Storage();
const BUCKET = 'wale-491803.firebasestorage.app';
const db = admin.firestore();
const AUTHORIZED_ADMIN_EMAIL = 'developers@ibrecruitment.com';
const POSTMARK_FROM_EMAIL = 'admin-messages@ibrecruitment.com';
const POSTMARK_SERVER_TOKEN = normalizeText(process.env.POSTMARK_SERVER_TOKEN);

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function getStripeSecretKey() {
  return normalizeText(process.env.STRIPE_SECRET_KEY);
}

function isSubscriptionActiveLike(status) {
  return ['active', 'trialing', 'past_due', 'unpaid'].includes(normalizeText(status).toLowerCase());
}

function inferSubscriberType(subscription) {
  const candidates = [];
  const items = subscription && subscription.items && Array.isArray(subscription.items.data)
    ? subscription.items.data
    : [];

  items.forEach((item) => {
    const price = item && item.price ? item.price : {};
    const product = price && typeof price.product === 'object' && price.product ? price.product : null;
    candidates.push(
      normalizeText(price.nickname),
      normalizeText(price.lookup_key),
      normalizeText(product && product.name),
      normalizeText(product && product.description),
      normalizeText(product && product.metadata && product.metadata.subscriber_type),
      normalizeText(price && price.metadata && price.metadata.subscriber_type)
    );
  });

  const haystack = candidates.join(' ').toLowerCase();

  if (haystack.includes('comp')) return 'comp';
  if (haystack.includes('founding')) return 'founding';
  if (isSubscriptionActiveLike(subscription && subscription.status)) return 'paid';
  return 'none';
}

function pickPayloadField(body, keys) {
  for (const key of keys) {
    if (body && body[key] !== undefined && body[key] !== null && String(body[key]).trim() !== '') {
      return body[key];
    }
  }
  return '';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createSubstackNotificationSubject(postTitle) {
  const safeTitle = normalizeText(postTitle) || 'New Substack insight';
  return 'New Substack Insight: ' + safeTitle;
}

function createSubstackNotificationHtml(post) {
  const title = escapeHtml(post && post.title ? post.title : 'New Substack insight');
  const link = escapeHtml(post && post.link ? post.link : 'https://substack.ibrecruitment.com');
  const date = escapeHtml(post && post.date ? post.date : 'Date unavailable');
  const snippet = escapeHtml(post && post.snippet ? post.snippet : 'A new insight has been published.');

  return '<!doctype html>' +
    '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>New Substack Insight</title></head><body style="margin:0;padding:0;background:#f3f7fb;font-family:Open Sans,Arial,sans-serif;color:#0f172a;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#f3f7fb;"><tr><td align="center">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dbe3ee;border-radius:12px;overflow:hidden;">' +
    '<tr><td style="padding:18px 20px;background:linear-gradient(135deg,#0f4fa8,#22c1f1);color:#ffffff;font-weight:700;font-size:18px;">Impact in Business Recruitment</td></tr>' +
    '<tr><td style="padding:20px;">' +
    '<h1 style="margin:0 0 10px;font-size:22px;line-height:1.3;color:#092a4b;">' + title + '</h1>' +
    '<p style="margin:0 0 8px;color:#475569;font-size:14px;"><strong>Published:</strong> ' + date + '</p>' +
    '<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.55;">' + snippet + '</p>' +
    '<p style="margin:0 0 16px;"><a href="' + link + '" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#0f4fa8;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:700;">Read on Substack</a></p>' +
    '<p style="margin:0;color:#64748b;font-size:13px;">You are receiving this notification because you have an active account with Impact in Business Recruitment.</p>' +
    '</td></tr></table></td></tr></table></body></html>';
}

async function runPostmarkRawEmail(toEmail, subject, htmlBody) {
  const to = normalizeEmail(toEmail);
  if (!to) return { ok: false, error: 'Missing recipient email' };
  if (!POSTMARK_SERVER_TOKEN) return { ok: false, error: 'POSTMARK_SERVER_TOKEN is not configured' };

  try {
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': POSTMARK_SERVER_TOKEN,
      },
      body: JSON.stringify({
        From: POSTMARK_FROM_EMAIL,
        To: to,
        Subject: subject,
        HtmlBody: htmlBody,
        MessageStream: 'outbound',
      }),
    });

    const bodyText = await response.text();
    if (!response.ok) {
      return { ok: false, error: ('Postmark API error: ' + response.status + ' ' + bodyText).slice(0, 1500) };
    }

    return {
      ok: true,
      stdout: normalizeText(bodyText),
      stderr: '',
    };
  } catch (err) {
    return {
      ok: false,
      error: err && err.message ? String(err.message) : 'Unknown Postmark API error',
    };
  }
}

async function listAllAuthUsers() {
  const users = [];
  let pageToken;

  do {
    const result = await admin.auth().listUsers(1000, pageToken);
    (result.users || []).forEach((u) => {
      const email = normalizeEmail(u && u.email);
      if (u && u.uid && email) {
        users.push({ uid: u.uid, email });
      }
    });
    pageToken = result.pageToken;
  } while (pageToken);

  return users;
}

function safeNotificationDocId(postId, uid) {
  return ('sys_substack_' + normalizeText(postId) + '_' + normalizeText(uid)).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 140);
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

exports.getSubscriberType = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const email = normalizeEmail(context.auth.token && context.auth.token.email);
  if (!email) {
    throw new functions.https.HttpsError('failed-precondition', 'Authenticated email is required');
  }

  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Stripe secret key is not configured');
  }

  try {
    const stripe = new Stripe(secretKey);
    const customers = await stripe.customers.list({ email, limit: 10 });

    if (!customers || !Array.isArray(customers.data) || customers.data.length === 0) {
      return { subscriberType: 'none', status: 'no_customer' };
    }

    let resolvedType = 'none';

    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 20,
        expand: ['data.items.data.price.product'],
      });

      if (!subscriptions || !Array.isArray(subscriptions.data)) continue;

      for (const subscription of subscriptions.data) {
        if (!isSubscriptionActiveLike(subscription && subscription.status)) continue;

        const inferredType = inferSubscriberType(subscription);
        if (inferredType === 'comp') {
          return { subscriberType: 'comp', status: subscription.status };
        }
        if (inferredType === 'founding') {
          resolvedType = 'founding';
        } else if (inferredType === 'paid' && resolvedType === 'none') {
          resolvedType = 'paid';
        }
      }
    }

    return { subscriberType: resolvedType, status: resolvedType === 'none' ? 'no_active_subscription' : 'active' };
  } catch (err) {
    console.error('getSubscriberType failed', { email, error: err && err.stack ? err.stack : err });
    throw new functions.https.HttpsError('internal', 'Could not resolve subscriber type');
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

exports.notifyUsersOnNewInsightsFeedPost = functions.firestore.document('insightsFeed/{postId}').onCreate(async (snap, context) => {
  const postId = context.params && context.params.postId ? String(context.params.postId) : '';
  const data = snap && typeof snap.data === 'function' ? (snap.data() || {}) : {};

  const post = {
    title: normalizeText(data.title) || 'New Substack insight',
    link: normalizeText(data.link),
    date: normalizeText(data.date) || 'Date unavailable',
    snippet: normalizeText(data.snippet) || 'A new Substack insight has been published.',
  };

  if (!post.link) {
    console.warn('notifyUsersOnNewInsightsFeedPost skipped: missing post link', { postId });
    return null;
  }

  const users = await listAllAuthUsers();
  if (!users.length) return null;

  const subject = createSubstackNotificationSubject(post.title);
  const htmlBody = createSubstackNotificationHtml(post);
  const plainBody = 'A new Substack post is available.\n\n' +
    'Title: ' + post.title + '\n' +
    'Published: ' + post.date + '\n' +
    'Read: ' + post.link;

  for (const user of users) {
    const messageId = safeNotificationDocId(postId, user.uid);
    const messageRef = db.collection('messages').doc(messageId);

    try {
      await messageRef.create({
        recipientUid: user.uid,
        recipientLoginEmail: user.email,
        recipientEmail: user.email,
        senderEmail: POSTMARK_FROM_EMAIL,
        subject,
        body: plainBody,
        htmlBody,
        source: 'system-substack-rss',
        originalMessageId: postId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        messageState: 'available',
        isOpened: false,
        openedAt: null,
        openedByUid: null,
      });
    } catch (err) {
      if (err && err.code === 6) {
        continue;
      }
      console.error('Failed to create system message', { postId, uid: user.uid, error: err && err.message ? err.message : err });
      continue;
    }

    const sendResult = await runPostmarkRawEmail(user.email, subject, htmlBody);
    if (sendResult.ok) {
      await messageRef.set({
        emailForwarded: true,
        emailForwardedAt: admin.firestore.FieldValue.serverTimestamp(),
        emailProvider: 'postmark-api',
        emailProviderResponse: sendResult.stdout || '',
        emailForwardError: admin.firestore.FieldValue.delete(),
      }, { merge: true });
    } else {
      await messageRef.set({
        emailForwarded: false,
        emailProvider: 'postmark-api',
        emailForwardError: normalizeText(sendResult.error).slice(0, 1500),
      }, { merge: true });
    }
  }

  return null;
});
