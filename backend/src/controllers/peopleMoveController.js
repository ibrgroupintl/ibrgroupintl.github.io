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
      ? db.prepare('SELECT id FROM people_moves WHERE slug = ? AND id != ?').get(slug, excludeId)
      : db.prepare('SELECT id FROM people_moves WHERE slug = ?').get(slug);
    if (!query) break;
    slug = `${baseSlug}-${counter++}`;
  }
  return slug;
}

function listPeopleMoves(req, res) {
  const { status, page = 1, limit = 20, sector, region } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = [];
  let params = [];

  if (status) { where.push('status = ?'); params.push(status); }
  if (sector) { where.push('sector = ?'); params.push(sector); }
  if (region) { where.push('region = ?'); params.push(region); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const items = db.prepare(
    `SELECT id, title, slug, summary, person_name, person_title, company_from, company_to,
            sector, region, image_url, status, published_at, created_at, updated_at
     FROM people_moves ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM people_moves ${whereClause}`).get(...params).count;

  return res.json({ items, total, page: parseInt(page), limit: parseInt(limit) });
}

function getPeopleMove(req, res) {
  const { id } = req.params;
  const item = db.prepare('SELECT * FROM people_moves WHERE id = ? OR slug = ?').get(id, id);
  if (!item) return res.status(404).json({ error: 'People move not found' });
  return res.json(item);
}

function createPeopleMove(req, res) {
  const {
    title, summary, content, person_name, person_title,
    company_from, company_to, sector, region, image_url, status = 'draft',
  } = req.body;

  if (!title || !content || !person_name || !company_to) {
    return res.status(400).json({ error: 'title, content, person_name, and company_to are required' });
  }

  const baseSlug = slugify(title);
  const slug = ensureUniqueSlug(baseSlug);
  const id = crypto.randomUUID();
  const published_at = status === 'published' ? new Date().toISOString() : null;

  db.prepare(`
    INSERT INTO people_moves
      (id, title, slug, summary, content, person_name, person_title, company_from, company_to,
       sector, region, image_url, status, published_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, slug, summary || null, content, person_name, person_title || null,
         company_from || null, company_to, sector || null, region || null,
         image_url || null, status, published_at, req.user.id);

  const created = db.prepare('SELECT * FROM people_moves WHERE id = ?').get(id);
  return res.status(201).json(created);
}

function updatePeopleMove(req, res) {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM people_moves WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'People move not found' });

  const {
    title, summary, content, person_name, person_title,
    company_from, company_to, sector, region, image_url, status,
  } = req.body;

  const newTitle = title !== undefined ? title : existing.title;
  const newSlug = title ? ensureUniqueSlug(slugify(title), id) : existing.slug;
  const newStatus = status !== undefined ? status : existing.status;
  const published_at =
    newStatus === 'published' && existing.status !== 'published'
      ? new Date().toISOString()
      : existing.published_at;

  db.prepare(`
    UPDATE people_moves SET
      title = ?, slug = ?, summary = ?, content = ?, person_name = ?, person_title = ?,
      company_from = ?, company_to = ?, sector = ?, region = ?, image_url = ?,
      status = ?, published_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    newTitle, newSlug,
    summary !== undefined ? summary : existing.summary,
    content !== undefined ? content : existing.content,
    person_name !== undefined ? person_name : existing.person_name,
    person_title !== undefined ? person_title : existing.person_title,
    company_from !== undefined ? company_from : existing.company_from,
    company_to !== undefined ? company_to : existing.company_to,
    sector !== undefined ? sector : existing.sector,
    region !== undefined ? region : existing.region,
    image_url !== undefined ? image_url : existing.image_url,
    newStatus, published_at, id
  );

  return res.json(db.prepare('SELECT * FROM people_moves WHERE id = ?').get(id));
}

function deletePeopleMove(req, res) {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM people_moves WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'People move not found' });
  return res.status(204).send();
}

module.exports = { listPeopleMoves, getPeopleMove, createPeopleMove, updatePeopleMove, deletePeopleMove };
