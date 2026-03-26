require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const db = require('../src/db/database');

async function seed() {
  console.log('Seeding database...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@ibrecruitment.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const adminName = process.env.ADMIN_NAME || 'IBR Admin';

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existing) {
    const hash = await bcrypt.hash(adminPassword, 12);
    db.prepare('INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), adminEmail, hash, 'admin', adminName);
    console.log(`Admin user created: ${adminEmail}`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  const pmCount = db.prepare('SELECT COUNT(*) as count FROM people_moves').get().count;
  if (pmCount === 0) {
    const adminUser = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
    const peopleMoves = [
      {
        title: 'Jane Smith Joins GlobalTech as Chief People Officer',
        person_name: 'Jane Smith',
        person_title: 'Chief People Officer',
        company_from: 'HR Dynamics Ltd',
        company_to: 'GlobalTech',
        sector: 'Technology',
        region: 'EMEA',
        summary: 'GlobalTech announces the appointment of Jane Smith as its new Chief People Officer.',
        content: 'GlobalTech has appointed Jane Smith as Chief People Officer, effective immediately. Smith brings over 15 years of HR leadership experience from her previous role at HR Dynamics Ltd. She will be responsible for talent acquisition, employee development, and people strategy across all global operations.',
        status: 'published',
      },
      {
        title: 'Michael Chen Appointed MD at Apex Financial',
        person_name: 'Michael Chen',
        person_title: 'Managing Director',
        company_from: 'Meridian Capital',
        company_to: 'Apex Financial',
        sector: 'Financial Services',
        region: 'Asia Pacific',
        summary: 'Apex Financial welcomes Michael Chen as its new Managing Director for Asia Pacific.',
        content: 'Apex Financial has named Michael Chen as Managing Director for its Asia Pacific division. Chen joins from Meridian Capital where he served as a senior portfolio manager for seven years. His appointment signals Apex\'s commitment to expanding its presence across the Asia Pacific region.',
        status: 'published',
      },
    ];

    for (const pm of peopleMoves) {
      const slug = pm.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      db.prepare(`
        INSERT INTO people_moves (id, title, slug, summary, content, person_name, person_title,
          company_from, company_to, sector, region, status, published_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
      `).run(crypto.randomUUID(), pm.title, slug, pm.summary, pm.content, pm.person_name,
             pm.person_title, pm.company_from, pm.company_to, pm.sector, pm.region,
             pm.status, adminUser.id);
    }
    console.log(`Seeded ${peopleMoves.length} people moves`);
  }

  const insightCount = db.prepare('SELECT COUNT(*) as count FROM insights').get().count;
  if (insightCount === 0) {
    const adminUser = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
    const insights = [
      {
        title: 'Executive Talent Trends Q1 2025',
        category: 'Market Trends',
        tags: JSON.stringify(['talent', 'executive', 'trends', 'Q1 2025']),
        summary: 'A comprehensive analysis of executive hiring trends in the first quarter of 2025.',
        content: 'The first quarter of 2025 saw significant shifts in executive hiring across financial services and technology sectors. Demand for Chief Digital Officers surged by 34% year-over-year, while CHRO appointments in financial services reached a five-year high. Companies continue to prioritise diversity in the C-suite, with 42% of all senior appointments going to women — up from 38% in 2024.',
        status: 'published',
      },
      {
        title: 'The Rise of Fractional C-Suite Leadership',
        category: 'Leadership',
        tags: JSON.stringify(['fractional', 'leadership', 'strategy']),
        summary: 'More organisations are turning to fractional executives to bridge leadership gaps.',
        content: 'Fractional C-suite leadership is no longer a stopgap measure — it has become a strategic choice for organisations seeking agility. Our data shows a 60% increase in fractional CFO and CHRO engagements across EMEA in the past twelve months. Organisations cite cost efficiency, specialist expertise, and speed-to-value as the primary drivers of this trend.',
        status: 'published',
      },
    ];

    for (const insight of insights) {
      const slug = insight.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      db.prepare(`
        INSERT INTO insights (id, title, slug, summary, content, category, tags, status, published_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
      `).run(crypto.randomUUID(), insight.title, slug, insight.summary, insight.content,
             insight.category, insight.tags, insight.status, adminUser.id);
    }
    console.log(`Seeded ${insights.length} insights`);
  }

  console.log('Seeding complete.');
}

seed().catch(console.error);
