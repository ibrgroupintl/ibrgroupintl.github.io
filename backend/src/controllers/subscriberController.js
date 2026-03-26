const crypto = require('crypto');
const db = require('../db/database');

function listSubscribers(req, res) {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = [];
  let params = [];

  if (status) { where.push('status = ?'); params.push(status); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const items = db.prepare(
    `SELECT id, email, name, status, subscription_source, subscribed_at, expires_at
     FROM subscribers ${whereClause} ORDER BY subscribed_at DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM subscribers ${whereClause}`).get(...params).count;

  return res.json({ items, total, page: parseInt(page), limit: parseInt(limit) });
}

function getSubscriber(req, res) {
  const { id } = req.params;
  const item = db.prepare('SELECT * FROM subscribers WHERE id = ? OR email = ?').get(id, id);
  if (!item) return res.status(404).json({ error: 'Subscriber not found' });
  try { item.metadata = JSON.parse(item.metadata || '{}'); } catch { item.metadata = {}; }
  return res.json(item);
}

function createSubscriber(req, res) {
  const { email, name, status = 'active', subscription_source = 'manual', expires_at } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  const existing = db.prepare('SELECT id FROM subscribers WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'Subscriber already exists' });
  }

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO subscribers (id, email, name, status, subscription_source, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, email.toLowerCase().trim(), name || null, status, subscription_source, expires_at || null);

  return res.status(201).json(db.prepare('SELECT * FROM subscribers WHERE id = ?').get(id));
}

function updateSubscriber(req, res) {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM subscribers WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Subscriber not found' });

  const { name, status, expires_at } = req.body;

  db.prepare(`
    UPDATE subscribers SET
      name = ?, status = ?, expires_at = ?
    WHERE id = ?
  `).run(
    name !== undefined ? name : existing.name,
    status !== undefined ? status : existing.status,
    expires_at !== undefined ? expires_at : existing.expires_at,
    id
  );

  return res.json(db.prepare('SELECT * FROM subscribers WHERE id = ?').get(id));
}

function deleteSubscriber(req, res) {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM subscribers WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Subscriber not found' });
  return res.status(204).send();
}

function substackWebhook(req, res) {
  const { type, email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  const normalizedEmail = email.toLowerCase().trim();
  const existing = db.prepare('SELECT * FROM subscribers WHERE email = ?').get(normalizedEmail);

  if (type === 'subscribe' || type === 'upgrade') {
    if (existing) {
      db.prepare("UPDATE subscribers SET status = 'active', subscription_source = 'substack' WHERE email = ?")
        .run(normalizedEmail);
    } else {
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO subscribers (id, email, name, status, subscription_source)
        VALUES (?, ?, ?, 'active', 'substack')
      `).run(id, normalizedEmail, name || null);
    }
  } else if (type === 'unsubscribe' || type === 'downgrade') {
    if (existing) {
      db.prepare("UPDATE subscribers SET status = 'inactive' WHERE email = ?").run(normalizedEmail);
    }
  }

  return res.json({ received: true });
}

function getStats(req, res) {
  const totalSubscribers = db.prepare("SELECT COUNT(*) as count FROM subscribers").get().count;
  const activeSubscribers = db.prepare("SELECT COUNT(*) as count FROM subscribers WHERE status = 'active'").get().count;
  const totalPeopleMoves = db.prepare("SELECT COUNT(*) as count FROM people_moves").get().count;
  const publishedPeopleMoves = db.prepare("SELECT COUNT(*) as count FROM people_moves WHERE status = 'published'").get().count;
  const totalInsights = db.prepare("SELECT COUNT(*) as count FROM insights").get().count;
  const publishedInsights = db.prepare("SELECT COUNT(*) as count FROM insights WHERE status = 'published'").get().count;
  const recentPeopleMoves = db.prepare(
    "SELECT id, title, slug, person_name, company_to, status, created_at FROM people_moves ORDER BY created_at DESC LIMIT 5"
  ).all();
  const recentInsights = db.prepare(
    "SELECT id, title, slug, category, status, created_at FROM insights ORDER BY created_at DESC LIMIT 5"
  ).all();

  return res.json({
    subscribers: { total: totalSubscribers, active: activeSubscribers },
    people_moves: { total: totalPeopleMoves, published: publishedPeopleMoves },
    insights: { total: totalInsights, published: publishedInsights },
    recent_people_moves: recentPeopleMoves,
    recent_insights: recentInsights,
  });
}

module.exports = {
  listSubscribers, getSubscriber, createSubscriber, updateSubscriber, deleteSubscriber,
  substackWebhook, getStats,
};
