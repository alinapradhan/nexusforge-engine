/**
 * NexusForge Engine — Analytics Service
 * ---------------------------------------
 * Event collection, system metrics aggregation,
 * revenue tracking, and real-time feed telemetry.
 */

const { v4: uuidv4 } = require('uuid');
const store = require('../../database/store');

const VALID_EVENT_TYPES = [
  'page_view', 'product_click', 'search', 'checkout',
  'subscription_start', 'subscription_cancel', 'subscription_upgrade',
  'payment_completed', 'payment_refunded',
  'api_call', 'login', 'register', 'product_created',
  'recommendation_feedback',
];

/* ── Track Event ────────────────────────────────────── */

function trackEvent({ type, userId, metadata = {} }) {
  if (!type) return { error: 'Event type is required', status: 400 };

  const event = store.insert('analyticsEvents', {
    id: uuidv4(),
    type,
    userId: userId || 'anonymous',
    metadata,
  });

  return { data: event, status: 201 };
}

/* ── Query Events ───────────────────────────────────── */

function getEvents({ type, userId, from, to, limit = 50 } = {}) {
  let events = store.getAll('analyticsEvents');

  if (type) events = events.filter((e) => e.type === type);
  if (userId) events = events.filter((e) => e.userId === userId);
  if (from) events = events.filter((e) => new Date(e.timestamp || e.createdAt) >= new Date(from));
  if (to) events = events.filter((e) => new Date(e.timestamp || e.createdAt) <= new Date(to));

  events.sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
  return { data: events.slice(0, Number(limit)), status: 200 };
}

/* ── Dashboard Metrics ──────────────────────────────── */

function getDashboardMetrics() {
  const users = store.getAll('users');
  const products = store.getAll('products');
  const subscriptions = store.getAll('subscriptions');
  const payments = store.getAll('payments');
  const events = store.getAll('analyticsEvents');

  // Revenue
  const totalRevenue = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const refundedAmount = payments
    .filter((p) => ['refunded', 'partially_refunded'].includes(p.status))
    .reduce((sum, p) => sum + (p.refundedAmount || 0), 0);

  // Subscriptions by status
  const subsByStatus = {};
  for (const sub of subscriptions) {
    subsByStatus[sub.status] = (subsByStatus[sub.status] || 0) + 1;
  }

  // Subscriptions by tier
  const subsByTier = {};
  for (const sub of subscriptions) {
    const plan = store.findById('subscriptionPlans', sub.planId);
    const tier = plan ? plan.tier : 'UNKNOWN';
    subsByTier[tier] = (subsByTier[tier] || 0) + 1;
  }

  // Events by type (last 7 days)
  const weekAgo = Date.now() - 7 * 86400000;
  const recentEvents = events.filter((e) => new Date(e.timestamp || e.createdAt) > weekAgo);
  const eventsByType = {};
  for (const event of recentEvents) {
    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
  }

  // Daily event trend (last 7 days)
  const dailyTrend = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(Date.now() - i * 86400000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const count = events.filter((e) => {
      const ts = new Date(e.timestamp || e.createdAt);
      return ts >= dayStart && ts <= dayEnd;
    }).length;
    dailyTrend.push({
      date: dayStart.toISOString().split('T')[0],
      events: count,
    });
  }

  return {
    data: {
      overview: {
        totalUsers: users.length,
        totalProducts: products.filter((p) => p.status === 'active').length,
        activeSubscriptions: subscriptions.filter((s) => s.status === 'ACTIVE').length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        refundedAmount: Math.round(refundedAmount * 100) / 100,
        netRevenue: Math.round((totalRevenue - refundedAmount) * 100) / 100,
      },
      subscriptions: { byStatus: subsByStatus, byTier: subsByTier },
      events: { total: events.length, recentCount: recentEvents.length, byType: eventsByType, dailyTrend },
      engine: {
        name: 'NexusForge Engine',
        version: '1.0.0',
        uptime: process.uptime ? Math.round(process.uptime()) : 0,
        memoryUsage: process.memoryUsage ? process.memoryUsage().heapUsed : 0,
        nodeVersion: process.version || 'unknown',
      },
    },
    status: 200,
  };
}

/* ── Activity Feed ──────────────────────────────────── */

function getActivityFeed({ limit = 20 } = {}) {
  const events = store.getAll('analyticsEvents');
  events.sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));

  const feed = events.slice(0, Number(limit)).map((event) => {
    const user = store.findById('users', event.userId);
    return {
      id: event.id,
      type: event.type,
      user: user ? { id: user.id, name: user.name, avatar: user.avatar } : { id: event.userId, name: 'System', avatar: '⚙️' },
      metadata: event.metadata,
      timestamp: event.timestamp || event.createdAt,
    };
  });

  return { data: feed, status: 200 };
}

module.exports = { trackEvent, getEvents, getDashboardMetrics, getActivityFeed, VALID_EVENT_TYPES };
