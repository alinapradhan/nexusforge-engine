/**
 * NexusForge Engine — Main Server
 * ================================
 * API-first digital product, catalog, subscription & analytics platform.
 *
 * Start: node src/server.js
 * Dashboard: http://localhost:3000
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const store = require('../database/store');
const identityService = require('../services/identity');
const productService = require('../services/product');
const subscriptionService = require('../services/subscription');
const recommendationService = require('../services/recommendation');
const paymentService = require('../services/payment');
const analyticsService = require('../services/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ──────────────────────────────────────── */

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logger
app.use((req, _res, next) => {
  if (process.env.LOG_LEVEL !== 'silent') {
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`  ${ts} │ ${req.method.padEnd(7)} ${req.path}`);
  }
  next();
});

// Serve web dashboard
app.use(express.static(path.join(__dirname, '..', 'apps', 'web')));

/* ── Seed database ──────────────────────────────────── */

store.seed();

/* ── Health ──────────────────────────────────────────── */

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    engine: 'NexusForge Engine',
    version: '1.0.0',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/* ── Auth Routes (/v1/auth) ─────────────────────────── */

app.post('/v1/auth/register', (req, res) => {
  const result = identityService.register(req.body);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.post('/v1/auth/login', (req, res) => {
  const result = identityService.login(req.body);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.post('/v1/auth/logout', identityService.authMiddleware, (_req, res) => {
  res.json({ message: 'Logged out successfully' });
});

app.post('/v1/auth/refresh', identityService.authMiddleware, (req, res) => {
  const user = store.findById('users', req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const token = identityService.generateToken(user);
  res.json({ token });
});

/* ── User Routes (/v1/users) ────────────────────────── */

app.get('/v1/users', identityService.authMiddleware, identityService.adminMiddleware, (_req, res) => {
  const result = identityService.listUsers();
  res.status(result.status).json(result.data);
});

app.get('/v1/users/:userId', identityService.authMiddleware, (req, res) => {
  const result = identityService.getProfile(req.params.userId);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.patch('/v1/users/:userId', identityService.authMiddleware, (req, res) => {
  if (req.user.sub !== req.params.userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Can only update own profile' });
  }
  const result = identityService.updateProfile(req.params.userId, req.body);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.get('/v1/users/:userId/subscriptions', identityService.authMiddleware, (req, res) => {
  const result = subscriptionService.getUserSubscriptions(req.params.userId);
  res.status(result.status).json(result.data);
});

app.get('/v1/users/:userId/entitlements', identityService.authMiddleware, (req, res) => {
  const result = subscriptionService.getUserEntitlements(req.params.userId);
  res.status(result.status).json(result.data);
});

/* ── Product Routes (/v1/products) ──────────────────── */

app.get('/v1/products', (req, res) => {
  const result = productService.listProducts(req.query);
  res.status(result.status).json(result.data);
});

app.get('/v1/products/:productId', (req, res) => {
  const result = productService.getProduct(req.params.productId);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.post('/v1/products', identityService.authMiddleware, identityService.adminMiddleware, (req, res) => {
  const result = productService.createProduct(req.body);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.put('/v1/products/:productId', identityService.authMiddleware, identityService.adminMiddleware, (req, res) => {
  const result = productService.updateProduct(req.params.productId, req.body);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.delete('/v1/products/:productId', identityService.authMiddleware, identityService.adminMiddleware, (req, res) => {
  const result = productService.deleteProduct(req.params.productId);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.get('/v1/categories', (_req, res) => {
  const result = productService.listCategories();
  res.status(result.status).json(result.data);
});

/* ── Recommendation Routes (/v1/recommendations) ───── */

app.get('/v1/recommendations/:userId', (req, res) => {
  const result = recommendationService.getRecommendations(req.params.userId, req.query);
  res.status(result.status).json(result.data);
});

app.get('/v1/recommendations/similar/:productId', (req, res) => {
  const result = recommendationService.getSimilarProducts(req.params.productId, req.query);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.post('/v1/recommendations/events', (req, res) => {
  const result = recommendationService.trackEvent(req.body);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.post('/v1/recommendations/feedback', (req, res) => {
  const result = recommendationService.submitFeedback(req.body);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

/* ── Feed Routes (/v1/feed) ─────────────────────────── */

app.post('/v1/feed/sessions', identityService.authMiddleware, (req, res) => {
  const result = recommendationService.createFeedSession(req.user.sub);
  res.status(result.status).json(result.data);
});

app.post('/v1/feed/sessions/:sessionId/moods', identityService.authMiddleware, (req, res) => {
  const result = recommendationService.addMoodToSession(req.params.sessionId, req.body);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.get('/v1/feed/sessions/:sessionId', identityService.authMiddleware, (req, res) => {
  const result = recommendationService.getFeedSession(req.params.sessionId);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.get('/v1/feed/sessions/:sessionId/items', identityService.authMiddleware, (req, res) => {
  const result = recommendationService.getFeedItems(req.params.sessionId, req.query);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

/* ── Subscription Routes (/v1/subscriptions) ────────── */

app.get('/v1/subscription/plans', (_req, res) => {
  const result = subscriptionService.listPlans();
  res.status(result.status).json(result.data);
});

app.post('/v1/subscriptions', identityService.authMiddleware, (req, res) => {
  const result = subscriptionService.createSubscription({ userId: req.user.sub, ...req.body });
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.get('/v1/subscriptions/:subscriptionId', identityService.authMiddleware, (req, res) => {
  const result = subscriptionService.getSubscription(req.params.subscriptionId);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.post('/v1/subscriptions/:subscriptionId/upgrade', identityService.authMiddleware, (req, res) => {
  const result = subscriptionService.upgradeSubscription(req.params.subscriptionId, req.body);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.post('/v1/subscriptions/:subscriptionId/downgrade', identityService.authMiddleware, (req, res) => {
  const result = subscriptionService.downgradeSubscription(req.params.subscriptionId, req.body);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.post('/v1/subscriptions/:subscriptionId/cancel', identityService.authMiddleware, (req, res) => {
  const result = subscriptionService.cancelSubscription(req.params.subscriptionId);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.post('/v1/subscriptions/:subscriptionId/resume', identityService.authMiddleware, (req, res) => {
  const result = subscriptionService.resumeSubscription(req.params.subscriptionId);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

/* ── Payment Routes (/v1/payments) ──────────────────── */

app.post('/v1/payments', identityService.authMiddleware, (req, res) => {
  const result = paymentService.createPayment({ userId: req.user.sub, ...req.body });
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.get('/v1/payments/:paymentId', identityService.authMiddleware, (req, res) => {
  const result = paymentService.getPayment(req.params.paymentId);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.post('/v1/payments/:paymentId/refund', identityService.authMiddleware, (req, res) => {
  const result = paymentService.refundPayment(req.params.paymentId, req.body);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

/* ── Analytics Routes (/v1/analytics) ───────────────── */

app.post('/v1/analytics/events', (req, res) => {
  const result = analyticsService.trackEvent(req.body);
  res.status(result.status).json(result.error ? { error: result.error } : result.data);
});

app.get('/v1/analytics/events', (req, res) => {
  const result = analyticsService.getEvents(req.query);
  res.status(result.status).json(result.data);
});

app.get('/v1/analytics/dashboard', (req, res) => {
  const result = analyticsService.getDashboardMetrics();
  res.status(result.status).json(result.data);
});

app.get('/v1/analytics/feed', (req, res) => {
  const result = analyticsService.getActivityFeed(req.query);
  res.status(result.status).json(result.data);
});

/* ── 404 fallback ───────────────────────────────────── */

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found', engine: 'NexusForge Engine' });
});

/* ── Error handler ──────────────────────────────────── */

app.use((err, _req, res, _next) => {
  console.error('NexusForge Engine Error:', err.message);
  res.status(500).json({ error: 'Internal server error', engine: 'NexusForge Engine' });
});

/* ── Start ──────────────────────────────────────────── */

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════════╗');
    console.log('  ║                                              ║');
    console.log('  ║   ⚡  N E X U S F O R G E   E N G I N E     ║');
    console.log('  ║                                              ║');
    console.log('  ║   API-First Product & Subscription Platform  ║');
    console.log('  ║                                              ║');
    console.log(`  ║   Dashboard:  http://localhost:${PORT}           ║`);
    console.log(`  ║   API Base:   http://localhost:${PORT}/v1        ║`);
    console.log(`  ║   Health:     http://localhost:${PORT}/health    ║`);
    console.log('  ║                                              ║');
    console.log('  ║   Demo Login:                                ║');
    console.log('  ║     admin@nexusforge.io / admin123           ║');
    console.log('  ║     demo@nexusforge.io  / demo123            ║');
    console.log('  ║                                              ║');
    console.log('  ╚══════════════════════════════════════════════╝');
    console.log('');
  });
}

module.exports = app;
