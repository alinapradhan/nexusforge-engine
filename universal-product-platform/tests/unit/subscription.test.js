const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

describe('Subscription Service', () => {
  let subscriptionService;
  let store;

  before(() => {
    store = require('../../database/store');
    store.seed();
    subscriptionService = require('../../services/subscription');
  });

  describe('listPlans', () => {
    it('returns all subscription plans', () => {
      const result = subscriptionService.listPlans();
      assert.strictEqual(result.status, 200);
      assert.ok(Array.isArray(result.data));
      assert.strictEqual(result.data.length, 3);
    });

    it('plans have required fields', () => {
      const result = subscriptionService.listPlans();
      for (const plan of result.data) {
        assert.ok(plan.id);
        assert.ok(plan.name);
        assert.ok(plan.tier);
        assert.ok(plan.currency);
        assert.ok(plan.interval);
        assert.ok(Array.isArray(plan.features));
      }
    });
  });

  describe('getPlan', () => {
    it('returns a plan by ID', () => {
      const result = subscriptionService.getPlan('plan_premium');
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.data.tier, 'PREMIUM');
    });

    it('returns 404 for missing plan', () => {
      const result = subscriptionService.getPlan('plan_nonexistent');
      assert.strictEqual(result.status, 404);
    });
  });

  describe('TIER_ORDER', () => {
    it('has correct tier ordering', () => {
      assert.ok(subscriptionService.TIER_ORDER.FREE < subscriptionService.TIER_ORDER.PREMIUM);
      assert.ok(subscriptionService.TIER_ORDER.PREMIUM < subscriptionService.TIER_ORDER.ENTERPRISE);
    });
  });

  describe('checkEntitlement', () => {
    it('grants access when user tier meets requirement', () => {
      const users = store.getAll('users');
      const adminUser = users.find((u) => u.role === 'admin');
      const result = subscriptionService.checkEntitlement(adminUser.id, 'PREMIUM');
      assert.strictEqual(result.hasAccess, true);
      assert.strictEqual(result.currentTier, 'ENTERPRISE');
    });

    it('denies access when user tier is below requirement', () => {
      // Register a free user
      const identityService = require('../../services/identity');
      const reg = identityService.register({
        email: 'free-entitlement-test@test.io',
        password: 'test123',
        name: 'Free Tester',
      });
      const userId = reg.data.user.id;
      const result = subscriptionService.checkEntitlement(userId, 'ENTERPRISE');
      assert.strictEqual(result.hasAccess, false);
    });

    it('returns hasAccess=false for unknown users', () => {
      const result = subscriptionService.checkEntitlement('nonexistent-user-id', 'FREE');
      assert.strictEqual(result.hasAccess, false);
    });
  });

  describe('VALID_STATUSES', () => {
    it('includes all lifecycle states', () => {
      const expected = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED'];
      for (const status of expected) {
        assert.ok(subscriptionService.VALID_STATUSES.includes(status), `Missing status: ${status}`);
      }
    });
  });

  describe('cancelSubscription', () => {
    it('cancels an active subscription', () => {
      const subs = store.getAll('subscriptions').filter((s) => s.status === 'ACTIVE');
      if (subs.length === 0) return; // Skip if no active subs
      const sub = subs[0];
      const result = subscriptionService.cancelSubscription(sub.id);
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.data.status, 'CANCELLED');
    });

    it('returns 404 for missing subscription', () => {
      const result = subscriptionService.cancelSubscription('nonexistent-sub-id');
      assert.strictEqual(result.status, 404);
    });
  });
});
