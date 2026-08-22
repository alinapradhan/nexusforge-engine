/**
 * NexusForge Engine — Dashboard Application
 * ===========================================
 * Interactive web dashboard driving live metrics, product catalog,
 * subscription management, activity feed, and API playground.
 */

(function () {
  'use strict';

  const API_BASE = '';
  let authToken = null;
  let currentUser = null;

  /* ── Loading ────────────────────────────────────────── */

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      document.getElementById('loading-screen').classList.add('fade-out');
      document.getElementById('app').style.display = 'flex';
      init();
    }, 2000);
  });

  /* ── Init ───────────────────────────────────────────── */

  function init() {
    setupNavigation();
    setupAuth();
    setupMenuToggle();
    setupApiPlayground();
    loadDashboard();
    loadProducts();
    loadPlans();
  }

  /* ── Navigation ─────────────────────────────────────── */

  function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((item) => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        switchView(view);
        navItems.forEach((n) => n.classList.remove('active'));
        item.classList.add('active');
        document.getElementById('page-title').textContent = item.querySelector('.nav-label').textContent;

        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');
      });
    });
  }

  function switchView(viewName) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
      target.classList.add('active');
      // Lazy load data
      if (viewName === 'activity') loadActivityFeed();
      if (viewName === 'dashboard') loadDashboard();
    }
  }

  function setupMenuToggle() {
    document.getElementById('menu-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }

  /* ── Auth ───────────────────────────────────────────── */

  function setupAuth() {
    const loginBtn = document.getElementById('login-btn');
    const modal = document.getElementById('login-modal');
    const closeModal = document.getElementById('close-modal');
    const form = document.getElementById('login-form');

    loginBtn.addEventListener('click', () => { modal.style.display = 'flex'; });
    closeModal.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      try {
        const res = await apiCall('POST', '/v1/auth/login', { email, password });
        if (res.token) {
          authToken = res.token;
          currentUser = res.user;
          modal.style.display = 'none';
          updateAuthUI();
          loadDashboard();
        }
      } catch (err) {
        alert('Login failed: ' + (err.message || 'Unknown error'));
      }
    });
  }

  function updateAuthUI() {
    const section = document.getElementById('auth-section');
    if (currentUser) {
      section.innerHTML = `
        <div class="auth-user">
          <span class="auth-avatar">${currentUser.avatar || '👤'}</span>
          <span class="auth-name">${currentUser.name}</span>
          <span class="auth-tier">${currentUser.tier}</span>
        </div>
        <button class="btn btn-ghost btn-sm" id="logout-btn">Logout</button>
      `;
      document.getElementById('logout-btn').addEventListener('click', () => {
        authToken = null;
        currentUser = null;
        section.innerHTML = '<button id="login-btn" class="btn btn-primary btn-sm">Sign In</button>';
        setupAuth();
      });
    }
  }

  /* ── API Helper ─────────────────────────────────────── */

  async function apiCall(method, path, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (authToken) opts.headers['Authorization'] = `Bearer ${authToken}`;
    if (body && method !== 'GET') opts.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();
    if (!res.ok && data.error) throw new Error(data.error);
    return data;
  }

  /* ── Dashboard ──────────────────────────────────────── */

  async function loadDashboard() {
    try {
      const data = await apiCall('GET', '/v1/analytics/dashboard');
      renderMetrics(data.overview);
      renderChart(data.events.dailyTrend);
      renderEngineInfo(data.engine);
      renderTierBars(data.subscriptions.byTier);
      renderRecentEvents(data.events);
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }

  function renderMetrics(overview) {
    document.getElementById('val-users').textContent = overview.totalUsers;
    document.getElementById('val-products').textContent = overview.totalProducts;
    document.getElementById('val-subs').textContent = overview.activeSubscriptions;
    document.getElementById('val-revenue').textContent = `$${overview.netRevenue.toLocaleString()}`;
  }

  function renderChart(dailyTrend) {
    const container = document.getElementById('events-chart');
    if (!dailyTrend || dailyTrend.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;">No data yet</p>';
      return;
    }
    const maxVal = Math.max(...dailyTrend.map((d) => d.events), 1);
    container.innerHTML = dailyTrend.map((d) => {
      const height = Math.max(4, (d.events / maxVal) * 140);
      const dayLabel = new Date(d.date).toLocaleDateString('en', { weekday: 'short' });
      return `
        <div class="chart-bar-group">
          <div class="chart-bar" style="height:${height}px;">
            <span class="chart-bar-value">${d.events}</span>
          </div>
          <span class="chart-bar-label">${dayLabel}</span>
        </div>
      `;
    }).join('');
  }

  function renderEngineInfo(engine) {
    const container = document.getElementById('engine-info');
    const rows = [
      { key: 'Engine', val: engine.name },
      { key: 'Version', val: engine.version },
      { key: 'Node.js', val: engine.nodeVersion },
      { key: 'Uptime', val: `${engine.uptime}s` },
      { key: 'Memory', val: `${(engine.memoryUsage / 1024 / 1024).toFixed(1)} MB` },
    ];
    container.innerHTML = rows.map((r) => `
      <div class="engine-info-row">
        <span class="info-key">${r.key}</span>
        <span class="info-val">${r.val}</span>
      </div>
    `).join('');
  }

  function renderTierBars(byTier) {
    const container = document.getElementById('tier-bars');
    const tiers = ['FREE', 'PREMIUM', 'ENTERPRISE'];
    const total = Object.values(byTier || {}).reduce((s, v) => s + v, 0) || 1;

    container.innerHTML = tiers.map((tier) => {
      const count = (byTier && byTier[tier]) || 0;
      const pct = Math.round((count / total) * 100);
      return `
        <div class="tier-row tier-${tier.toLowerCase()}">
          <div class="tier-header">
            <span class="tier-name">${tier}</span>
            <span class="tier-count">${count} (${pct}%)</span>
          </div>
          <div class="tier-progress">
            <div class="tier-progress-fill" style="width:${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderRecentEvents(eventsData) {
    const container = document.getElementById('recent-events');
    const events = eventsData.byType || {};
    const entries = Object.entries(events).sort((a, b) => b[1] - a[1]).slice(0, 8);

    if (entries.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;">No events yet</p>';
      return;
    }

    container.innerHTML = entries.map(([type, count]) => {
      let badgeClass = '';
      if (type.includes('payment')) badgeClass = 'payment';
      else if (type.includes('subscription')) badgeClass = 'subscription';
      else if (type.includes('login') || type.includes('register')) badgeClass = 'user';

      return `
        <div class="event-item">
          <span class="event-type-badge ${badgeClass}">${type.replace(/_/g, ' ')}</span>
          <span class="event-user">${count} occurrences</span>
        </div>
      `;
    }).join('');
  }

  /* ── Products ───────────────────────────────────────── */

  async function loadProducts() {
    try {
      const data = await apiCall('GET', '/v1/products');
      renderProductGrid(data.items || []);
      loadCategories();
      setupProductFilters(data.items || []);
    } catch (err) {
      console.error('Products load error:', err);
    }
  }

  async function loadCategories() {
    try {
      const categories = await apiCall('GET', '/v1/categories');
      const select = document.getElementById('product-category');
      select.innerHTML = '<option value="">All Categories</option>';
      categories.forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = `${cat.icon} ${cat.name}`;
        select.appendChild(opt);
      });
    } catch (err) {
      console.error('Categories load error:', err);
    }
  }

  function setupProductFilters() {
    const searchInput = document.getElementById('product-search');
    const categorySelect = document.getElementById('product-category');

    const doFilter = async () => {
      const params = new URLSearchParams();
      if (searchInput.value) params.set('search', searchInput.value);
      if (categorySelect.value) params.set('category', categorySelect.value);
      try {
        const data = await apiCall('GET', `/v1/products?${params.toString()}`);
        renderProductGrid(data.items || []);
      } catch (err) {
        console.error('Filter error:', err);
      }
    };

    let debounce;
    searchInput.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(doFilter, 300); });
    categorySelect.addEventListener('change', doFilter);
  }

  function renderProductGrid(products) {
    const grid = document.getElementById('product-grid');
    if (products.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-muted);padding:2rem;">No products found.</p>';
      return;
    }

    grid.innerHTML = products.map((p) => `
      <div class="product-card">
        <div class="product-header">
          <div>
            <div class="product-name">${escapeHtml(p.name)}</div>
            <div class="product-sku">${escapeHtml(p.sku)}</div>
          </div>
          <div class="product-price">$${p.price}<span>/mo</span></div>
        </div>
        <p class="product-desc">${escapeHtml(p.description)}</p>
        <div class="product-tags">
          ${(p.tags || []).map((t) => `<span class="product-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
        <div class="product-features">
          ${(p.features || []).slice(0, 4).map((f) => `<span class="product-feature">${escapeHtml(f)}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }

  /* ── Subscriptions / Plans ──────────────────────────── */

  async function loadPlans() {
    try {
      const plans = await apiCall('GET', '/v1/subscription/plans');
      renderPlans(plans);
      renderEntitlementMatrix(plans);
    } catch (err) {
      console.error('Plans load error:', err);
    }
  }

  function renderPlans(plans) {
    const grid = document.getElementById('plans-grid');
    grid.innerHTML = plans.map((plan, i) => {
      const isFeatured = plan.tier === 'PREMIUM';
      const badgeClass = plan.tier === 'FREE' ? 'badge-free' : plan.tier === 'PREMIUM' ? 'badge-premium' : 'badge-enterprise';
      return `
        <div class="plan-card ${isFeatured ? 'featured' : ''}">
          <span class="plan-tier-badge ${badgeClass}">${plan.tier}</span>
          <h3 class="plan-name">${escapeHtml(plan.name)}</h3>
          <div class="plan-price">
            <span class="currency">$</span>${plan.price}
            <span class="interval">/${plan.interval}</span>
          </div>
          <ul class="plan-features-list">
            ${plan.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
          </ul>
        </div>
      `;
    }).join('');
  }

  function renderEntitlementMatrix(plans) {
    const container = document.getElementById('entitlement-matrix');
    const allFeatures = new Set();
    plans.forEach((p) => p.features.forEach((f) => allFeatures.add(f)));

    let html = '<table><thead><tr><th>Feature</th>';
    plans.forEach((p) => { html += `<th>${p.name}</th>`; });
    html += '</tr></thead><tbody>';

    for (const feature of allFeatures) {
      html += `<tr><td>${escapeHtml(feature)}</td>`;
      plans.forEach((p) => {
        const has = p.features.includes(feature);
        html += `<td class="${has ? 'check' : 'cross'}">${has ? '✓' : '—'}</td>`;
      });
      html += '</tr>';
    }

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  /* ── Activity Feed ──────────────────────────────────── */

  async function loadActivityFeed() {
    try {
      const feed = await apiCall('GET', '/v1/analytics/feed?limit=30');
      renderActivityFeed(feed);
    } catch (err) {
      console.error('Activity feed error:', err);
    }
  }

  function renderActivityFeed(feed) {
    const container = document.getElementById('activity-feed');
    if (!feed || feed.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);padding:2rem;">No activity yet.</p>';
      return;
    }

    container.innerHTML = feed.map((item) => {
      const timeAgo = getTimeAgo(item.timestamp);
      const description = getEventDescription(item);
      return `
        <div class="activity-item">
          <span class="activity-avatar">${item.user?.avatar || '⚙️'}</span>
          <div class="activity-body">
            <div class="activity-text"><strong>${escapeHtml(item.user?.name || 'System')}</strong> ${description}</div>
            <div class="activity-meta">${escapeHtml(item.type)} · ${timeAgo}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function getEventDescription(item) {
    const descs = {
      'page_view': 'viewed a page',
      'product_click': 'clicked on a product',
      'search': 'performed a search',
      'subscription_start': 'started a subscription',
      'subscription_cancel': 'cancelled a subscription',
      'subscription_upgrade': 'upgraded their subscription',
      'api_call': 'made an API call',
      'checkout': 'completed checkout',
      'login': 'signed in',
      'register': 'created an account',
      'product_created': 'created a product',
      'payment_completed': 'made a payment',
      'payment_refunded': 'received a refund',
      'recommendation_feedback': 'left feedback',
    };
    return descs[item.type] || `triggered ${item.type}`;
  }

  function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - new Date(timestamp)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  /* ── API Playground ─────────────────────────────────── */

  function setupApiPlayground() {
    const endpoints = [
      { method: 'GET', path: '/health' },
      { method: 'POST', path: '/v1/auth/login', body: '{"email":"admin@nexusforge.io","password":"admin123"}' },
      { method: 'POST', path: '/v1/auth/register', body: '{"email":"new@test.io","password":"test123","name":"Test User"}' },
      { method: 'GET', path: '/v1/products' },
      { method: 'GET', path: '/v1/categories' },
      { method: 'GET', path: '/v1/subscription/plans' },
      { method: 'GET', path: '/v1/analytics/dashboard' },
      { method: 'GET', path: '/v1/analytics/feed' },
      { method: 'GET', path: '/v1/analytics/events' },
      { method: 'POST', path: '/v1/analytics/events', body: '{"type":"page_view","userId":"test"}' },
      { method: 'POST', path: '/v1/payments', body: '{"amount":49.99,"description":"Pro Plan"}' },
    ];

    const list = document.getElementById('endpoint-list');
    list.innerHTML = endpoints.map((ep) => {
      const methodClass = `method-${ep.method.toLowerCase()}`;
      return `
        <button class="endpoint-item" data-method="${ep.method}" data-path="${ep.path}" data-body='${ep.body || ''}'>
          <span class="endpoint-method ${methodClass}">${ep.method}</span>
          <span class="endpoint-path">${ep.path}</span>
        </button>
      `;
    }).join('');

    // Click endpoint to load
    list.querySelectorAll('.endpoint-item').forEach((item) => {
      item.addEventListener('click', () => {
        document.getElementById('req-method').value = item.dataset.method;
        document.getElementById('req-url').value = item.dataset.path;
        document.getElementById('req-body').value = item.dataset.body || '';
      });
    });

    // Send request
    document.getElementById('send-request').addEventListener('click', sendPlaygroundRequest);

    // Enter key in URL
    document.getElementById('req-url').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendPlaygroundRequest();
    });
  }

  async function sendPlaygroundRequest() {
    const method = document.getElementById('req-method').value;
    const url = document.getElementById('req-url').value;
    const bodyStr = document.getElementById('req-body').value.trim();

    const statusEl = document.getElementById('res-status');
    const timeEl = document.getElementById('res-time');
    const bodyEl = document.getElementById('res-body');

    statusEl.textContent = '...';
    statusEl.className = 'response-status';
    bodyEl.textContent = 'Sending...';

    const start = performance.now();

    try {
      const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (authToken) opts.headers['Authorization'] = `Bearer ${authToken}`;
      if (bodyStr && method !== 'GET') {
        opts.body = bodyStr;
      }

      const res = await fetch(url, opts);
      const elapsed = Math.round(performance.now() - start);
      const data = await res.json();

      statusEl.textContent = `${res.status} ${res.statusText}`;
      statusEl.className = `response-status ${res.ok ? 'success' : 'error'}`;
      timeEl.textContent = `${elapsed}ms`;
      bodyEl.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      statusEl.textContent = 'Error';
      statusEl.className = 'response-status error';
      timeEl.textContent = `${elapsed}ms`;
      bodyEl.textContent = `Request failed: ${err.message}`;
    }
  }

  /* ── Utilities ──────────────────────────────────────── */

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
