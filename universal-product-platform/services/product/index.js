/**
 * NexusForge Engine — Product / Catalog Service
 * -----------------------------------------------
 * Full CRUD for the product catalog with search, filtering,
 * category management, and stock handling.
 */

const { v4: uuidv4 } = require('uuid');
const store = require('../../database/store');

/* ── List / Search / Filter ─────────────────────────── */

function listProducts({ search, category, tag, minPrice, maxPrice, status, page = 1, limit = 20 } = {}) {
  let results = store.getAll('products');

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }
  if (category) results = results.filter((p) => p.category === category);
  if (tag) results = results.filter((p) => p.tags && p.tags.includes(tag));
  if (minPrice !== undefined) results = results.filter((p) => p.price >= Number(minPrice));
  if (maxPrice !== undefined) results = results.filter((p) => p.price <= Number(maxPrice));
  if (status) results = results.filter((p) => p.status === status);

  const total = results.length;
  const offset = (Number(page) - 1) * Number(limit);
  const items = results.slice(offset, offset + Number(limit));

  return {
    data: {
      items,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    },
    status: 200,
  };
}

function getProduct(id) {
  const product = store.findById('products', id);
  if (!product) return { error: 'Product not found', status: 404 };
  return { data: product, status: 200 };
}

/* ── CRUD ────────────────────────────────────────────── */

function createProduct(data) {
  const required = ['name', 'description', 'price', 'category'];
  for (const field of required) {
    if (!data[field]) return { error: `Missing required field: ${field}`, status: 400 };
  }

  const product = store.insert('products', {
    id: uuidv4(),
    sku: data.sku || `NF-${Date.now().toString(36).toUpperCase()}`,
    name: data.name,
    description: data.description,
    category: data.category,
    tags: data.tags || [],
    price: Number(data.price),
    currency: data.currency || 'USD',
    stock: data.stock !== undefined ? Number(data.stock) : 999,
    status: 'active',
    imageUrl: data.imageUrl || null,
    features: data.features || [],
  });

  store.insert('analyticsEvents', { type: 'product_created', metadata: { productId: product.id } });
  return { data: product, status: 201 };
}

function updateProduct(id, updates) {
  const product = store.findById('products', id);
  if (!product) return { error: 'Product not found', status: 404 };

  const allowed = {};
  const fields = ['name', 'description', 'category', 'tags', 'price', 'stock', 'status', 'imageUrl', 'features'];
  for (const f of fields) {
    if (updates[f] !== undefined) allowed[f] = updates[f];
  }
  if (allowed.price !== undefined) allowed.price = Number(allowed.price);
  if (allowed.stock !== undefined) allowed.stock = Number(allowed.stock);

  const updated = store.update('products', id, allowed);
  return { data: updated, status: 200 };
}

function deleteProduct(id) {
  const product = store.findById('products', id);
  if (!product) return { error: 'Product not found', status: 404 };
  store.remove('products', id);
  return { data: { message: 'Product deleted', id }, status: 200 };
}

/* ── Categories ──────────────────────────────────────── */

function listCategories() {
  return { data: store.getAll('categories'), status: 200 };
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct, listCategories };
