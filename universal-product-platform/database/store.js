/**
 * NexusForge Engine — In-Memory Data Store & Seed
 * ------------------------------------------------
 * Provides a JSON-based in-memory repository used by every service.
 * Call `seed()` to populate with realistic demo data.
 */

const { v4: uuidv4 } = require('uuid');

/* ── Collections ─────────────────────────────────────── */

const db = {
  users: [],
  products: [],
  categories: [],
  subscriptionPlans: [],
  subscriptions: [],
  entitlements: [],
  payments: [],
  recommendations: [],
  feedSessions: [],
  analyticsEvents: [],
  _meta: { seeded: false, createdAt: new Date().toISOString() },
};

/* ── Seed Data ───────────────────────────────────────── */

function seed() {
  if (db._meta.seeded) return db;

  // ── Categories ───────────────────────────────────────
  db.categories = [
    { id: 'cat_dev_tools',   name: 'Developer Tools',    icon: '🛠️' },
    { id: 'cat_ai_ml',       name: 'AI & Machine Learning', icon: '🤖' },
    { id: 'cat_analytics',   name: 'Analytics',          icon: '📊' },
    { id: 'cat_security',    name: 'Security',           icon: '🔒' },
    { id: 'cat_infra',       name: 'Infrastructure',     icon: '☁️' },
    { id: 'cat_design',      name: 'Design & UX',        icon: '🎨' },
  ];

  // ── Products ─────────────────────────────────────────
  db.products = [
    {
      id: uuidv4(), sku: 'NF-CODE-001', name: 'NexusForge Code Analyzer',
      description: 'AI-powered static code analysis that finds bugs, security vulnerabilities, and performance bottlenecks before they reach production.',
      category: 'cat_dev_tools', tags: ['code-quality', 'static-analysis', 'ai'],
      price: 29.99, currency: 'USD', stock: 999, status: 'active',
      imageUrl: '/assets/code-analyzer.svg',
      features: ['50+ language support', 'CI/CD integration', 'Real-time scanning', 'Custom rule builder'],
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(), sku: 'NF-MLOPS-002', name: 'Forge ML Pipeline',
      description: 'End-to-end MLOps pipeline orchestrator for training, versioning, deploying, and monitoring machine learning models at scale.',
      category: 'cat_ai_ml', tags: ['mlops', 'pipeline', 'model-serving'],
      price: 79.99, currency: 'USD', stock: 500, status: 'active',
      imageUrl: '/assets/ml-pipeline.svg',
      features: ['Auto-scaling inference', 'Experiment tracking', 'Model registry', 'A/B testing'],
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(), sku: 'NF-DASH-003', name: 'Insight Dashboard Pro',
      description: 'Real-time business intelligence dashboard with drag-and-drop widgets, anomaly detection, and automated reporting.',
      category: 'cat_analytics', tags: ['dashboard', 'bi', 'reporting'],
      price: 49.99, currency: 'USD', stock: 750, status: 'active',
      imageUrl: '/assets/dashboard.svg',
      features: ['50+ chart types', 'SQL query builder', 'Scheduled reports', 'Slack/Teams alerts'],
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(), sku: 'NF-VAULT-004', name: 'ForgeVault Secrets Manager',
      description: 'Enterprise-grade secrets management with zero-knowledge encryption, dynamic credentials, and audit logging.',
      category: 'cat_security', tags: ['secrets', 'encryption', 'compliance'],
      price: 39.99, currency: 'USD', stock: 600, status: 'active',
      imageUrl: '/assets/vault.svg',
      features: ['AES-256 encryption', 'RBAC policies', 'Secret rotation', 'SOC2 compliance'],
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(), sku: 'NF-EDGE-005', name: 'NexusEdge CDN',
      description: 'Global edge network with intelligent caching, DDoS protection, and serverless edge compute for sub-50ms latency worldwide.',
      category: 'cat_infra', tags: ['cdn', 'edge', 'performance'],
      price: 59.99, currency: 'USD', stock: 400, status: 'active',
      imageUrl: '/assets/cdn.svg',
      features: ['200+ PoPs', 'Edge functions', 'Image optimization', 'WebSocket support'],
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(), sku: 'NF-DESIGN-006', name: 'ForgeUI Component Library',
      description: 'Production-ready, accessible React/Vue/Svelte component library with dark mode, theming engine, and Figma sync.',
      category: 'cat_design', tags: ['ui', 'components', 'design-system'],
      price: 19.99, currency: 'USD', stock: 999, status: 'active',
      imageUrl: '/assets/ui-lib.svg',
      features: ['120+ components', 'WCAG 2.1 AA', 'Figma plugin', 'Theming tokens'],
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(), sku: 'NF-API-007', name: 'Forge API Gateway',
      description: 'Unified API gateway with rate limiting, request transformation, OAuth2/OIDC, and developer portal generation.',
      category: 'cat_infra', tags: ['api', 'gateway', 'rate-limiting'],
      price: 69.99, currency: 'USD', stock: 350, status: 'active',
      imageUrl: '/assets/api-gateway.svg',
      features: ['OpenAPI import', 'Rate limiting', 'Response caching', 'Developer portal'],
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(), sku: 'NF-MONITOR-008', name: 'ForgeWatch Observability',
      description: 'Full-stack observability platform combining logs, metrics, traces, and profiling with AI-driven root cause analysis.',
      category: 'cat_analytics', tags: ['observability', 'monitoring', 'apm'],
      price: 89.99, currency: 'USD', stock: 300, status: 'active',
      imageUrl: '/assets/observability.svg',
      features: ['Distributed tracing', 'Log aggregation', 'Custom dashboards', 'PagerDuty integration'],
      createdAt: new Date().toISOString(),
    },
  ];

  // ── Subscription Plans ───────────────────────────────
  db.subscriptionPlans = [
    {
      id: 'plan_free', name: 'Starter', tier: 'FREE',
      price: 0, currency: 'USD', interval: 'month',
      features: ['3 products', 'Community support', 'Basic analytics', '1 team member'],
      limits: { products: 3, apiCalls: 1000, teamMembers: 1 },
    },
    {
      id: 'plan_premium', name: 'Professional', tier: 'PREMIUM',
      price: 49.99, currency: 'USD', interval: 'month',
      features: ['25 products', 'Priority support', 'Advanced analytics', '10 team members', 'API access', 'Custom integrations'],
      limits: { products: 25, apiCalls: 50000, teamMembers: 10 },
    },
    {
      id: 'plan_enterprise', name: 'Enterprise', tier: 'ENTERPRISE',
      price: 199.99, currency: 'USD', interval: 'month',
      features: ['Unlimited products', 'Dedicated support', 'Full analytics suite', 'Unlimited members', 'SLA guarantee', 'Custom SLOs', 'SSO/SAML', 'Audit logs'],
      limits: { products: -1, apiCalls: -1, teamMembers: -1 },
    },
  ];

  // ── Demo Users ───────────────────────────────────────
  const bcrypt = require('bcryptjs');
  const adminId = uuidv4();
  const demoId = uuidv4();
  db.users = [
    {
      id: adminId, email: 'admin@nexusforge.io', name: 'NexusForge Admin',
      passwordHash: bcrypt.hashSync('admin123', 10),
      role: 'admin', tier: 'ENTERPRISE', avatar: '👑',
      createdAt: new Date().toISOString(),
    },
    {
      id: demoId, email: 'demo@nexusforge.io', name: 'Demo User',
      passwordHash: bcrypt.hashSync('demo123', 10),
      role: 'customer', tier: 'PREMIUM', avatar: '🚀',
      createdAt: new Date().toISOString(),
    },
  ];

  // ── Demo Subscriptions ───────────────────────────────
  db.subscriptions = [
    {
      id: uuidv4(), userId: adminId, planId: 'plan_enterprise',
      status: 'ACTIVE', startDate: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(), userId: demoId, planId: 'plan_premium',
      status: 'ACTIVE', startDate: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    },
  ];

  // ── Demo Entitlements ────────────────────────────────
  db.entitlements = [
    { id: uuidv4(), userId: adminId, tier: 'ENTERPRISE', features: db.subscriptionPlans[2].features },
    { id: uuidv4(), userId: demoId, tier: 'PREMIUM', features: db.subscriptionPlans[1].features },
  ];

  // ── Seed Analytics Events ────────────────────────────
  const eventTypes = ['page_view', 'product_click', 'search', 'subscription_start', 'api_call', 'checkout'];
  for (let i = 0; i < 50; i++) {
    db.analyticsEvents.push({
      id: uuidv4(),
      type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      userId: Math.random() > 0.5 ? adminId : demoId,
      metadata: { source: 'seed', index: i },
      timestamp: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
    });
  }

  db._meta.seeded = true;
  db._meta.seededAt = new Date().toISOString();
  return db;
}

/* ── Helpers ─────────────────────────────────────────── */

function findById(collection, id) {
  return db[collection]?.find((item) => item.id === id) || null;
}

function findByField(collection, field, value) {
  return db[collection]?.filter((item) => item[field] === value) || [];
}

function insert(collection, record) {
  if (!record.id) record.id = uuidv4();
  if (!record.createdAt) record.createdAt = new Date().toISOString();
  db[collection].push(record);
  return record;
}

function update(collection, id, updates) {
  const idx = db[collection]?.findIndex((item) => item.id === id);
  if (idx === -1 || idx === undefined) return null;
  db[collection][idx] = { ...db[collection][idx], ...updates, updatedAt: new Date().toISOString() };
  return db[collection][idx];
}

function remove(collection, id) {
  const idx = db[collection]?.findIndex((item) => item.id === id);
  if (idx === -1 || idx === undefined) return false;
  db[collection].splice(idx, 1);
  return true;
}

function count(collection) {
  return db[collection]?.length || 0;
}

function getAll(collection) {
  return db[collection] || [];
}

module.exports = { db, seed, findById, findByField, insert, update, remove, count, getAll };
