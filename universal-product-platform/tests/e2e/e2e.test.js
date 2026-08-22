const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../../src/server');

let server;
let baseUrl;

describe('NexusForge E2E Platform Workflow', () => {
  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('executes full end-to-end customer journey', async () => {
    // 1. Customer registers
    const email = `e2e-user-${Date.now()}@nexusforge.io`;
    const regRes = await fetch(`${baseUrl}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'securePassword123!', name: 'Jane Explorer' }),
    });
    assert.strictEqual(regRes.status, 201);
    const regBody = await regRes.json();
    const token = regBody.token;
    const userId = regBody.user.id;
    assert.ok(token);

    // 2. Customer browses product catalog
    const catalogRes = await fetch(`${baseUrl}/v1/products?search=Code`);
    assert.strictEqual(catalogRes.status, 200);
    const catalogBody = await catalogRes.json();
    assert.ok(catalogBody.items.length > 0);
    const selectedProduct = catalogBody.items[0];

    // 3. Customer tracks product view event
    const eventRes = await fetch(`${baseUrl}/v1/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'product_click',
        userId,
        metadata: { productId: selectedProduct.id, category: selectedProduct.category },
      }),
    });
    assert.strictEqual(eventRes.status, 201);

    // 4. Customer retrieves personalized recommendations
    const recsRes = await fetch(`${baseUrl}/v1/recommendations/${userId}`);
    assert.strictEqual(recsRes.status, 200);
    const recsBody = await recsRes.json();
    assert.ok(Array.isArray(recsBody));

    // 5. Customer subscribes to Professional Plan
    const subRes = await fetch(`${baseUrl}/v1/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ planId: 'plan_premium' }),
    });
    assert.strictEqual(subRes.status, 201);
    const subBody = await subRes.json();
    assert.strictEqual(subBody.planId, 'plan_premium');

    // 6. Customer completes a payment for additional add-ons
    const payRes = await fetch(`${baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: 49.99,
        currency: 'USD',
        description: 'Forge ML Pipeline Add-on',
      }),
    });
    assert.strictEqual(payRes.status, 201);
    const payBody = await payRes.json();
    assert.strictEqual(payBody.status, 'completed');

    // 7. Verify dashboard analytics updated
    const dashRes = await fetch(`${baseUrl}/v1/analytics/dashboard`);
    assert.strictEqual(dashRes.status, 200);
    const dashBody = await dashRes.json();
    assert.ok(dashBody.overview.totalUsers >= 3);
  });
});
