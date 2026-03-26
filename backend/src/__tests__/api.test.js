process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Use an in-memory database for tests
jest.mock('../db/database', () => {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS subscribers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      subscription_source TEXT DEFAULT 'manual',
      subscribed_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      metadata TEXT DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS people_moves (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      summary TEXT,
      content TEXT NOT NULL,
      person_name TEXT NOT NULL,
      person_title TEXT,
      company_from TEXT,
      company_to TEXT NOT NULL,
      sector TEXT,
      region TEXT,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      summary TEXT,
      content TEXT NOT NULL,
      category TEXT,
      tags TEXT DEFAULT '[]',
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
});

const app = require('../app');
const db = require('../db/database');

let adminToken;
let adminId;

beforeAll(async () => {
  const hash = await bcrypt.hash('TestPass123!', 12);
  adminId = crypto.randomUUID();
  db.prepare('INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)')
    .run(adminId, 'admin@test.com', hash, 'admin', 'Test Admin');
});

beforeEach(async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: 'admin@test.com',
    password: 'TestPass123!',
  });
  adminToken = res.body.token;
});

describe('Health check', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Auth', () => {
  test('POST /api/auth/login - success', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'TestPass123!',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('admin@test.com');
  });

  test('POST /api/auth/login - wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me - authenticated', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('admin@test.com');
  });

  test('GET /api/auth/me - unauthenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('People Moves', () => {
  let pmId;

  test('POST /api/people-moves - create', async () => {
    const res = await request(app)
      .post('/api/people-moves')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Alice Jones Joins Acme Corp as CTO',
        content: 'Full details about Alice Jones joining Acme Corp.',
        person_name: 'Alice Jones',
        person_title: 'CTO',
        company_from: 'TechCo',
        company_to: 'Acme Corp',
        sector: 'Technology',
        region: 'EMEA',
        status: 'published',
      });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Alice Jones Joins Acme Corp as CTO');
    expect(res.body.slug).toBeDefined();
    pmId = res.body.id;
  });

  test('GET /api/people-moves - list', async () => {
    const res = await request(app)
      .get('/api/people-moves')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/people-moves/:id - get single', async () => {
    const res = await request(app)
      .get(`/api/people-moves/${pmId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(pmId);
  });

  test('PATCH /api/people-moves/:id - update', async () => {
    const res = await request(app)
      .patch(`/api/people-moves/${pmId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'draft' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('draft');
  });

  test('DELETE /api/people-moves/:id - delete', async () => {
    const res = await request(app)
      .delete(`/api/people-moves/${pmId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  test('POST /api/people-moves - missing required fields', async () => {
    const res = await request(app)
      .post('/api/people-moves')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Incomplete' });
    expect(res.status).toBe(400);
  });
});

describe('Insights', () => {
  let insightId;

  test('POST /api/insights - create', async () => {
    const res = await request(app)
      .post('/api/insights')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Future of Executive Search 2025',
        content: 'Detailed analysis of executive search trends.',
        category: 'Market Trends',
        tags: ['executive', 'search', '2025'],
        status: 'published',
      });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Future of Executive Search 2025');
    expect(Array.isArray(res.body.tags)).toBe(true);
    insightId = res.body.id;
  });

  test('GET /api/insights - list', async () => {
    const res = await request(app)
      .get('/api/insights')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  test('GET /api/insights/:id - get single', async () => {
    const res = await request(app)
      .get(`/api/insights/${insightId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(insightId);
  });

  test('PATCH /api/insights/:id - update', async () => {
    const res = await request(app)
      .patch(`/api/insights/${insightId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category: 'Leadership' });
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('Leadership');
  });

  test('DELETE /api/insights/:id - delete', async () => {
    const res = await request(app)
      .delete(`/api/insights/${insightId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });
});

describe('Subscribers', () => {
  let subscriberId;

  test('POST /api/subscribers - create', async () => {
    const res = await request(app)
      .post('/api/subscribers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'subscriber@example.com', name: 'Test Subscriber' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('subscriber@example.com');
    subscriberId = res.body.id;
  });

  test('POST /api/subscribers - duplicate email', async () => {
    const res = await request(app)
      .post('/api/subscribers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'subscriber@example.com' });
    expect(res.status).toBe(409);
  });

  test('GET /api/subscribers - list', async () => {
    const res = await request(app)
      .get('/api/subscribers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  test('PATCH /api/subscribers/:id - update status', async () => {
    const res = await request(app)
      .patch(`/api/subscribers/${subscriberId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'inactive' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('inactive');
  });

  test('POST /api/subscribers/webhook/substack - subscribe', async () => {
    const res = await request(app)
      .post('/api/subscribers/webhook/substack')
      .send({ type: 'subscribe', email: 'newsubscriber@substack.com', name: 'Substack User' });
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  test('GET /api/subscribers/stats - dashboard stats', async () => {
    const res = await request(app)
      .get('/api/subscribers/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.subscribers).toBeDefined();
    expect(res.body.people_moves).toBeDefined();
    expect(res.body.insights).toBeDefined();
  });

  test('DELETE /api/subscribers/:id - delete', async () => {
    const res = await request(app)
      .delete(`/api/subscribers/${subscriberId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });
});
