const crypto = require('crypto');
const db = require('../db/database');

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureUniqueSlug(baseSlug, excludeId = null) {
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const query = excludeId
      ? db.prepare('SELECT id FROM insights WHERE slug = ? AND id != ?').get(slug, excludeId)
      : db.prepare('SELECT id FROM insights WHERE slug = ?').get(slug);
    if (!query) break;
    slug = `${baseSlug}-${counter++}`;
  }
  return slug;
}

function listInsights(req, res) {
  const { status, category, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = [];
  let params = [];

  if (status) { where.push('status = ?'); params.push(status); }
  if (category) { where.push('category = ?'); params.push(category); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const items = db.prepare(
    `SELECT id, title, slug, summary, category, tags, image_url, status, published_at, created_at, updated_at
     FROM insights ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM insights ${whereClause}`).get(...params).count;

  return res.json({ items, total, page: parseInt(page), limit: parseInt(limit) });
}

function getInsight(req, res) {
  const { id } = req.params;
  const item = db.prepare('SELECT * FROM insights WHERE id = ? OR slug = ?').get(id, id);
  if (!item) return res.status(404).json({ error: 'Insight not found' });

  try {
    item.tags = JSON.parse(item.tags || '[]');
  } catch {
    item.tags = [];
  }
  return res.json(item);
}

function createInsight(req, res) {
  const { title, summary, content, category, tags = [], image_url, status = 'draft' } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required' });
  }

  const baseSlug = slugify(title);
  const slug = ensureUniqueSlug(baseSlug);
  const id = crypto.randomUUID();
  const published_at = status === 'published' ? new Date().toISOString() : null;
  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);

  db.prepare(`
    INSERT INTO insights (id, title, slug, summary, content, category, tags, image_url, status, published_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, slug, summary || null, content, category || null, tagsJson,
         image_url || null, status, published_at, req.user.id);

  const created = db.prepare('SELECT * FROM insights WHERE id = ?').get(id);
  try { created.tags = JSON.parse(created.tags || '[]'); } catch { created.tags = []; }
  return res.status(201).json(created);
}

function updateInsight(req, res) {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM insights WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Insight not found' });

  const { title, summary, content, category, tags, image_url, status } = req.body;

  const newTitle = title !== undefined ? title : existing.title;
  const newSlug = title ? ensureUniqueSlug(slugify(title), id) : existing.slug;
  const newStatus = status !== undefined ? status : existing.status;
  const published_at =
    newStatus === 'published' && existing.status !== 'published'
      ? new Date().toISOString()
      : existing.published_at;
  const tagsJson = tags !== undefined ? JSON.stringify(Array.isArray(tags) ? tags : []) : existing.tags;

  db.prepare(`
    UPDATE insights SET
      title = ?, slug = ?, summary = ?, content = ?, category = ?, tags = ?,
      image_url = ?, status = ?, published_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    newTitle, newSlug,
    summary !== undefined ? summary : existing.summary,
    content !== undefined ? content : existing.content,
    category !== undefined ? category : existing.category,
    tagsJson,
    image_url !== undefined ? image_url : existing.image_url,
    newStatus, published_at, id
  );

  const updated = db.prepare('SELECT * FROM insights WHERE id = ?').get(id);
  try { updated.tags = JSON.parse(updated.tags || '[]'); } catch { updated.tags = []; }
  return res.json(updated);
}

function deleteInsight(req, res) {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM insights WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Insight not found' });
  return res.status(204).send();
}

module.exports = { listInsights, getInsight, createInsight, updateInsight, deleteInsight };
