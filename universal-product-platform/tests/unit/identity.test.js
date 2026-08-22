const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

describe('Identity Service', () => {
  let identityService;
  let store;

  before(() => {
    store = require('../../database/store');
    store.seed();
    identityService = require('../../services/identity');
  });

  describe('validateEmail', () => {
    it('accepts valid emails', () => {
      assert.strictEqual(identityService.validateEmail('test@example.com'), true);
      assert.strictEqual(identityService.validateEmail('user+tag@domain.co'), true);
    });

    it('rejects invalid emails', () => {
      assert.strictEqual(identityService.validateEmail(''), false);
      assert.strictEqual(identityService.validateEmail('notanemail'), false);
      assert.strictEqual(identityService.validateEmail('@no-local.com'), false);
      assert.strictEqual(identityService.validateEmail(null), false);
    });
  });

  describe('validatePassword', () => {
    it('accepts passwords >= 6 chars', () => {
      assert.strictEqual(identityService.validatePassword('123456'), true);
      assert.strictEqual(identityService.validatePassword('strongpassword'), true);
    });

    it('rejects short passwords', () => {
      assert.strictEqual(identityService.validatePassword('12345'), false);
      assert.strictEqual(identityService.validatePassword(''), false);
      assert.strictEqual(identityService.validatePassword(null), false);
    });
  });

  describe('register', () => {
    it('creates a new user with valid data', () => {
      const result = identityService.register({
        email: 'unit-test-reg@nexusforge.io',
        password: '*******',
        name: 'Unit Tester',
      });
      assert.strictEqual(result.status, 201);
      assert.ok(result.data.user.id);
      assert.strictEqual(result.data.user.email, 'unit-test-reg@nexusforge.io');
      assert.strictEqual(result.data.user.role, 'customer');
      assert.strictEqual(result.data.user.tier, 'FREE');
      assert.ok(result.data.token);
      // Password hash must not leak
      assert.strictEqual(result.data.user.passwordHash, undefined);
    });

    it('rejects duplicate email', () => {
      const result = identityService.register({
        email: 'unit-test-reg@nexusforge.io',
        password: '@@@@@',
        name: 'Dup User',
      });
      assert.strictEqual(result.status, 409);
      assert.ok(result.error);
    });

    it('rejects invalid email format', () => {
      const result = identityService.register({
        email: 'bademail',
        password: '@@@@@@@@',
        name: 'Bad Email',
      });
      assert.strictEqual(result.status, 400);
    });

    it('rejects short password', () => {
      const result = identityService.register({
        email: 'short@pw.com',
        password: '@@@@',
        name: 'Short PW',
      });
      assert.strictEqual(result.status, 400);
    });
  });

  describe('login', () => {
    it('succeeds with correct credentials', () => {
      const result = identityService.login({
        email: 'admin@nexusforge.io',
        password: '@@@@@@@@',
      });
      assert.strictEqual(result.status, 200);
      assert.ok(result.data.token);
      assert.strictEqual(result.data.user.email, 'admin@nexusforge.io');
    });

    it('fails with wrong password', () => {
      const result = identityService.login({
        email: 'admin@nexusforge.io',
        password: '@@@@@@@',
      });
      assert.strictEqual(result.status, 401);
    });

    it('fails with non-existent email', () => {
      const result = identityService.login({
        email: 'ghost@nexusforge.io',
        password: 'anything',
      });
      assert.strictEqual(result.status, 401);
    });
  });

  describe('JWT token', () => {
    it('generates and verifies a valid token', () => {
      const user = { id: 'test-id', email: 'jwt@test.io', role: 'customer', tier: 'FREE' };
      const token = identityService.generateToken(user);
      assert.ok(token);
      const decoded = identityService.verifyToken(token);
      assert.strictEqual(decoded.sub, 'test-id');
      assert.strictEqual(decoded.email, 'jwt@test.io');
    });

    it('returns null for invalid tokens', () => {
      assert.strictEqual(identityService.verifyToken('invalid.token.here'), null);
    });
  });

  describe('sanitizeUser', () => {
    it('removes passwordHash from user object', () => {
      const user = { id: '1', email: 'a@b.com', passwordHash: 'secret', name: 'Test' };
      const safe = identityService.sanitizeUser(user);
      assert.strictEqual(safe.passwordHash, undefined);
      assert.strictEqual(safe.email, 'a@b.com');
    });

    it('handles null gracefully', () => {
      assert.strictEqual(identityService.sanitizeUser(null), null);
    });
  });
});
