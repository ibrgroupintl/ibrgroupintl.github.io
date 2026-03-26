require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const peopleMoveRoutes = require('./routes/peopleMoves');
const insightRoutes = require('./routes/insights');
const subscriberRoutes = require('./routes/subscribers');

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'https://premium.ibrecruitment.com'];

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(morgan('combined'));
app.use(express.json());

const isTest = process.env.NODE_ENV === 'test';

const authLimiter = isTest ? (_req, _res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const apiLimiter = isTest ? (_req, _res, next) => next() : rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const webhookLimiter = isTest ? (_req, _res, next) => next() : rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'premium-api' }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/people-moves', apiLimiter, peopleMoveRoutes);
app.use('/api/insights', apiLimiter, insightRoutes);
app.use('/api/subscribers/webhook', webhookLimiter);
app.use('/api/subscribers', apiLimiter, subscriberRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
