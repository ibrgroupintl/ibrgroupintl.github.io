const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Parser = require('rss-parser');
admin.initializeApp();

const parser = new Parser();
const SUBSTACK_RSS_URL = 'https://substack.ibrecruitment.com/feed'; // <-- Replace with your feed

exports.fetchSubstackRssToFirestore = functions.pubsub.schedule('every 60 minutes').onRun(async (context) => {
  const feed = await parser.parseURL(SUBSTACK_RSS_URL);
  const db = admin.firestore();

  for (const item of feed.items) {
    // Use the RSS post GUID or link as a unique identifier
    const docId = item.guid || item.link;
    const docRef = db.collection('insightsFeed').doc(docId.replace(/[^\w-]/g, ''));

    const doc = await docRef.get();
    if (!doc.exists) {
      await docRef.set({
        title: item.title || '',
        link: item.link || '',
        date: item.pubDate || '',
        snippet: item.contentSnippet || '',
        source: feed.title || 'Substack',
        tags: [], // Optionally parse tags from item.categories
        timestamp: item.isoDate ? new Date(item.isoDate).getTime() : Date.now()
      });
    }
  }
  return null;
});


const functions = require('firebase-functions');
const admin = require('firebase-admin');
const postmark = require('postmark');
admin.initializeApp();

const postmarkToken = functions.config().postmark.broadcast_token;
const postmarkClient = new postmark.ServerClient(postmarkToken);

exports.adminFetchAndRelayRss = functions.firestore
  .document('insightsFeed/{postId}')
  .onCreate(async (snap, context) => {
    const post = snap.data();
    if (!post) return null;

    // 1. Fetch all user emails from publicProfiles
    const usersSnap = await admin.firestore().collection('publicProfiles').get();
    const emails = [];
    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.email) emails.push(data.email);
    });

    if (emails.length === 0) return null;

    // 2. Prepare the HTML5 email template
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

    // 3. Send in batches of 50 (Postmark batch limit)
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
    return null;
  });