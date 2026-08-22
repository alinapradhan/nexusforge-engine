const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../../src/server');

let server;
let baseUrl;
let authToken;
let adminToken;
let createdProductId;

describe('NexusForge REST API Integration Tests', () => {
  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('Health Endpoint', () => {
    it('GET /health returns 200 OK and healthy status', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.status, 'healthy');
      assert.strictEqual(body.engine, 'NexusForge Engine');
    });
  });

  describe('Auth API (/v1/auth)', () => {
    it('POST /v1/auth/login logs in admin user', async () => {
      const res = await fetch(`${baseUrl}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@nexusforge.io', password: 'admin123' }),
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.ok(body.token);
      assert.strictEqual(body.user.role, 'admin');
      adminToken = body.token;
    });

    it('POST /v1/auth/register creates a customer account', async () => {
      const email = `api-test-${Date.now()}@nexusforge.io`;
      const res = await fetch(`${baseUrl}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123', name: 'API Test User' }),
      });
      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.ok(body.token);
      assert.strictEqual(body.user.email, email);
      authToken = body.token;
    });
  });

  describe('Products API (/v1/products)', () => {
    it('GET /v1/products lists product catalog', async () => {
      const res = await fetch(`${baseUrl}/v1/products`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.ok(Array.isArray(body.items));
      assert.ok(body.items.length > 0);
    });

    it('POST /v1/products creates a product (admin authenticated)', async () => {
      const res = await fetch(`${baseUrl}/v1/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Nexus API Shield',
          description: 'Automated API security scanner and vulnerability patcher.',
          category: 'cat_security',
          price: 59.99,
          tags: ['security', 'api', 'automation'],
        }),
      });
      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.ok(body.id);
      assert.strictEqual(body.name, 'Nexus API Shield');
      createdProductId = body.id;
    });

    it('GET /v1/products/:id retrieves the created product', async () => {
      const res = await fetch(`${baseUrl}/v1/products/${createdProductId}`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.name, 'Nexus API Shield');
    });

    it('POST /v1/products without token fails with 401', async () => {
      const res = await fetch(`${baseUrl}/v1/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Unauthorized Product', price: 10, category: 'cat_dev_tools', description: 'desc' }),
      });
      assert.strictEqual(res.status, 401);
    });
  });

  describe('Subscription API (/v1/subscriptions)', () => {
    it('GET /v1/subscription/plans lists subscription plans', async () => {
      const res = await fetch(`${baseUrl}/v1/subscription/plans`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.ok(Array.isArray(body));
      assert.strictEqual(body.length, 3);
    });
  });

  describe('Analytics API (/v1/analytics)', () => {
    it('GET /v1/analytics/dashboard returns full platform stats', async () => {
      const res = await fetch(`${baseUrl}/v1/analytics/dashboard`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.ok(body.overview);
      assert.ok(body.overview.totalProducts > 0);
      assert.ok(body.engine);
    });
  });
});
