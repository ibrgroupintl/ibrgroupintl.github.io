const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const Parser = require('rss-parser');
const postmark = require('postmark');
const { defineSecret } = require('firebase-functions/params');

admin.initializeApp();
const storage = new Storage();
const BUCKET = 'wale-491803.firebasestorage.app'; // Exact bucket name
const postmarkToken = defineSecret('POSTMARK_BROADCAST_TOKEN');

// Existing function
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

// --- Begin adminFetchAndRelayRss and dependencies ---
const parser = new Parser();
const SUBSTACK_RSS_URL = 'https://substack.ibrecruitment.com/feed'; // <-- Replace with your feed






exports.adminFetchAndRelayRss = functions
  .runWith({ secrets: [postmarkToken] })
  .firestore
  .document('insightsFeed/{postId}')
  .onCreate(async (snap, context) => {
    const post = snap.data();
    const postRef = snap.ref;
    const postmarkClient = new postmark.ServerClient(postmarkToken.value());

    // 1. Idempotency: Check if already notified
    if (post.notified) return null;

    // 2 & 4. Time limit and test/old data filtering
    const now = Date.now();
    const postTime = post.timestamp || now;
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
    if ((now - postTime) > maxAgeMs) return null;
    if (post.test) return null;


    // 6. Unsubscribe/Opt-Out Logic
    let usersSnap;
    try {
      usersSnap = await admin.firestore().collection('publicProfiles').get();
    } catch (err) {
      console.error('Error fetching users:', err);
      return null;
    }
    const emails = [];
    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.email && !data.unsubscribed) emails.push(data.email);
    });
    if (emails.length === 0) return null;

    // Postmark HTML email template (baseload snippet)
    const htmlBody = `
      <html>
        <body style="font-family: 'Open Sans', Arial, sans-serif; color: #0f172a; background: #f5f9ff;">
          <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(2,6,23,0.08);padding:32px;">
            <h1 style="color:#0284c7;">${post.title || 'New Premium Content'}</h1>
            <p style="color:#475569;font-size:1.1rem;">${post.snippet || ''}</p>
            <a href="${post.link || '#'}" style="display:inline-block;margin:18px 0 0 0;padding:12px 24px;background:#0284c7;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;">Read More</a>
            <hr style="margin:32px 0 16px 0;border:none;border-top:1px solid #e5e7eb;">
            <div style="font-size:0.95rem;color:#475569;text-align:center;">
              You are receiving this email because you are a member of Impact in Business Recruitment.<br>
              <a href="https://www.ibrecruitment.com/unsubscribe?email={{email}}" style="color:#0284c7;text-decoration:underline;">Unsubscribe</a>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      for (let i = 0; i < emails.length; i += 50) {
        const batch = emails.slice(i, i + 50).map(email => ({
          From: 'admin-messages@ibrecruitment.com',
          To: email,
          Subject: `New Insight: ${post.title || 'Update from Impact in Business Recruitment'}`,
          HtmlBody: htmlBody.replace('{{email}}', encodeURIComponent(email)),
          TextBody: `${post.title || 'New Insight'}\n\n${post.snippet || ''}\n\nRead more: ${post.link || ''}\n\nUnsubscribe: https://www.ibrecruitment.com/unsubscribe?email=${encodeURIComponent(email)}`,
          MessageStream: 'broadcast'
        }));
        await postmarkClient.sendEmailBatch(batch);
      }
      // 1. Mark as notified
      await postRef.update({ notified: true });
    } catch (err) {
      console.error('Error sending emails or updating document:', err);
    }
    return null;
  });
// --- End adminFetchAndRelayRss and dependencies ---
