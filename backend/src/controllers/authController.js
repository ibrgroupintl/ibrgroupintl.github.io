const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}

async function createAdmin(req, res) {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const hash = await bcrypt.hash(password, 12);
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)'
  ).run(id, email.toLowerCase().trim(), hash, 'admin', name);

  return res.status(201).json({ id, email: email.toLowerCase().trim(), name, role: 'admin' });
}

function getMe(req, res) {
  return res.json(req.user);
}

module.exports = { login, createAdmin, getMe };
