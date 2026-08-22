/**
 * NexusForge Engine — Subscription Service
 * ------------------------------------------
 * Plan management, subscription lifecycle (create, upgrade,
 * downgrade, cancel, resume), entitlement checks.
 */

const { v4: uuidv4 } = require('uuid');
const store = require('../../database/store');

const VALID_STATUSES = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED'];
const TIER_ORDER = { FREE: 0, PREMIUM: 1, ENTERPRISE: 2 };

/* ── Plans ───────────────────────────────────────────── */

function listPlans() {
  return { data: store.getAll('subscriptionPlans'), status: 200 };
}

function getPlan(planId) {
  const plan = store.findById('subscriptionPlans', planId);
  if (!plan) return { error: 'Plan not found', status: 404 };
  return { data: plan, status: 200 };
}

/* ── Subscriptions ───────────────────────────────────── */

function createSubscription({ userId, planId }) {
  if (!userId || !planId) return { error: 'userId and planId are required', status: 400 };

  const plan = store.findById('subscriptionPlans', planId);
  if (!plan) return { error: 'Plan not found', status: 404 };

  // Check for existing active subscription
  const existing = store.findByField('subscriptions', 'userId', userId)
    .filter((s) => ['ACTIVE', 'TRIAL'].includes(s.status));
  if (existing.length > 0) {
    return { error: 'User already has an active subscription. Use upgrade/downgrade.', status: 409 };
  }

  const subscription = store.insert('subscriptions', {
    id: uuidv4(),
    userId,
    planId,
    status: plan.price === 0 ? 'ACTIVE' : 'TRIAL',
    startDate: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
  });

  // Set entitlement
  const existingEntitlements = store.findByField('entitlements', 'userId', userId);
  if (existingEntitlements.length > 0) {
    store.update('entitlements', existingEntitlements[0].id, { tier: plan.tier, features: plan.features });
  } else {
    store.insert('entitlements', { userId, tier: plan.tier, features: plan.features });
  }

  // Update user tier
  store.update('users', userId, { tier: plan.tier });

  store.insert('analyticsEvents', { type: 'subscription_start', userId, metadata: { planId, tier: plan.tier } });

  return { data: subscription, status: 201 };
}

function getSubscription(subscriptionId) {
  const sub = store.findById('subscriptions', subscriptionId);
  if (!sub) return { error: 'Subscription not found', status: 404 };
  const plan = store.findById('subscriptionPlans', sub.planId);
  return { data: { ...sub, plan }, status: 200 };
}

function getUserSubscriptions(userId) {
  const subs = store.findByField('subscriptions', 'userId', userId);
  return { data: subs, status: 200 };
}

function getUserEntitlements(userId) {
  const ents = store.findByField('entitlements', 'userId', userId);
  return { data: ents, status: 200 };
}

/* ── Lifecycle ───────────────────────────────────────── */

function upgradeSubscription(subscriptionId, { planId }) {
  const sub = store.findById('subscriptions', subscriptionId);
  if (!sub) return { error: 'Subscription not found', status: 404 };
  if (!['ACTIVE', 'TRIAL'].includes(sub.status)) return { error: 'Can only upgrade active subscriptions', status: 400 };

  const currentPlan = store.findById('subscriptionPlans', sub.planId);
  const newPlan = store.findById('subscriptionPlans', planId);
  if (!newPlan) return { error: 'Target plan not found', status: 404 };

  if (TIER_ORDER[newPlan.tier] <= TIER_ORDER[currentPlan.tier]) {
    return { error: 'New plan must be a higher tier. Use downgrade instead.', status: 400 };
  }

  store.update('subscriptions', subscriptionId, { planId, status: 'ACTIVE' });
  const entitlements = store.findByField('entitlements', 'userId', sub.userId);
  if (entitlements.length > 0) {
    store.update('entitlements', entitlements[0].id, { tier: newPlan.tier, features: newPlan.features });
  }
  store.update('users', sub.userId, { tier: newPlan.tier });

  store.insert('analyticsEvents', { type: 'subscription_upgrade', userId: sub.userId, metadata: { from: currentPlan.tier, to: newPlan.tier } });

  return { data: store.findById('subscriptions', subscriptionId), status: 200 };
}

function downgradeSubscription(subscriptionId, { planId }) {
  const sub = store.findById('subscriptions', subscriptionId);
  if (!sub) return { error: 'Subscription not found', status: 404 };
  if (!['ACTIVE', 'TRIAL'].includes(sub.status)) return { error: 'Can only downgrade active subscriptions', status: 400 };

  const currentPlan = store.findById('subscriptionPlans', sub.planId);
  const newPlan = store.findById('subscriptionPlans', planId);
  if (!newPlan) return { error: 'Target plan not found', status: 404 };

  if (TIER_ORDER[newPlan.tier] >= TIER_ORDER[currentPlan.tier]) {
    return { error: 'New plan must be a lower tier. Use upgrade instead.', status: 400 };
  }

  store.update('subscriptions', subscriptionId, { planId, status: 'ACTIVE' });
  const entitlements = store.findByField('entitlements', 'userId', sub.userId);
  if (entitlements.length > 0) {
    store.update('entitlements', entitlements[0].id, { tier: newPlan.tier, features: newPlan.features });
  }
  store.update('users', sub.userId, { tier: newPlan.tier });

  return { data: store.findById('subscriptions', subscriptionId), status: 200 };
}

function cancelSubscription(subscriptionId) {
  const sub = store.findById('subscriptions', subscriptionId);
  if (!sub) return { error: 'Subscription not found', status: 404 };
  if (sub.status === 'CANCELLED') return { error: 'Already cancelled', status: 400 };

  store.update('subscriptions', subscriptionId, { status: 'CANCELLED', cancelledAt: new Date().toISOString() });
  store.insert('analyticsEvents', { type: 'subscription_cancel', userId: sub.userId, metadata: { planId: sub.planId } });

  return { data: store.findById('subscriptions', subscriptionId), status: 200 };
}

function resumeSubscription(subscriptionId) {
  const sub = store.findById('subscriptions', subscriptionId);
  if (!sub) return { error: 'Subscription not found', status: 404 };
  if (!['CANCELLED', 'PAUSED'].includes(sub.status)) return { error: 'Can only resume cancelled or paused subscriptions', status: 400 };

  store.update('subscriptions', subscriptionId, {
    status: 'ACTIVE',
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
  });

  return { data: store.findById('subscriptions', subscriptionId), status: 200 };
}

/* ── Entitlement Check ───────────────────────────────── */

function checkEntitlement(userId, requiredTier) {
  const ents = store.findByField('entitlements', 'userId', userId);
  if (ents.length === 0) return { hasAccess: false, currentTier: 'NONE' };
  const current = ents[0];
  const hasAccess = TIER_ORDER[current.tier] >= TIER_ORDER[requiredTier];
  return { hasAccess, currentTier: current.tier, requiredTier };
}

module.exports = {
  listPlans, getPlan, createSubscription, getSubscription,
  getUserSubscriptions, getUserEntitlements,
  upgradeSubscription, downgradeSubscription, cancelSubscription, resumeSubscription,
  checkEntitlement, VALID_STATUSES, TIER_ORDER,
};
