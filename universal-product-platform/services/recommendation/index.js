/**
 * NexusForge Engine — Recommendation Service
 * --------------------------------------------
 * Personalised product recommendations, similarity scoring,
 * session mood matching, event collection, and feedback.
 */

const { v4: uuidv4 } = require('uuid');
const store = require('../../database/store');

/* ── Recommendation Engine ──────────────────────────── */

function getRecommendations(userId, { limit = 6 } = {}) {
  const products = store.getAll('products').filter((p) => p.status === 'active');
  if (products.length === 0) return { data: [], status: 200 };

  // Score based on user events (higher weight for interacted categories)
  const userEvents = store.findByField('analyticsEvents', 'userId', userId)
    .filter((e) => ['product_click', 'search', 'checkout'].includes(e.type));

  const categoryBoost = {};
  for (const event of userEvents) {
    if (event.metadata?.category) {
      categoryBoost[event.metadata.category] = (categoryBoost[event.metadata.category] || 0) + 1;
    }
  }

  const scored = products.map((product) => {
    let score = Math.random() * 50; // base variety score
    if (categoryBoost[product.category]) score += categoryBoost[product.category] * 20;
    if (product.tags?.includes('ai')) score += 10; // trending boost
    return { ...product, score: Math.round(score) };
  });

  scored.sort((a, b) => b.score - a.score);
  const recommendations = scored.slice(0, Number(limit));

  return { data: recommendations, status: 200 };
}

function getSimilarProducts(productId, { limit = 4 } = {}) {
  const product = store.findById('products', productId);
  if (!product) return { error: 'Product not found', status: 404 };

  const allProducts = store.getAll('products').filter((p) => p.id !== productId && p.status === 'active');

  const scored = allProducts.map((p) => {
    let similarity = 0;
    if (p.category === product.category) similarity += 50;
    const sharedTags = (p.tags || []).filter((t) => (product.tags || []).includes(t));
    similarity += sharedTags.length * 20;
    const priceDiff = Math.abs(p.price - product.price);
    similarity += Math.max(0, 30 - priceDiff);
    return { ...p, similarity: Math.round(similarity) };
  });

  scored.sort((a, b) => b.similarity - a.similarity);
  return { data: scored.slice(0, Number(limit)), status: 200 };
}

/* ── Recommendation Events ──────────────────────────── */

function trackEvent({ userId, type, productId, metadata = {} }) {
  if (!userId || !type) return { error: 'userId and type are required', status: 400 };

  const event = store.insert('analyticsEvents', {
    id: uuidv4(),
    type,
    userId,
    metadata: { ...metadata, productId },
  });

  return { data: event, status: 201 };
}

function submitFeedback({ userId, productId, rating, comment }) {
  if (!userId || !productId || rating === undefined) {
    return { error: 'userId, productId, and rating are required', status: 400 };
  }

  const event = store.insert('analyticsEvents', {
    type: 'recommendation_feedback',
    userId,
    metadata: { productId, rating: Number(rating), comment: comment || '' },
  });

  return { data: event, status: 201 };
}

/* ── Feed Sessions ──────────────────────────────────── */

function createFeedSession(userId) {
  const session = store.insert('feedSessions', {
    id: uuidv4(),
    userId,
    moods: [],
    status: 'active',
  });
  return { data: session, status: 201 };
}

function addMoodToSession(sessionId, { mood }) {
  const session = store.findById('feedSessions', sessionId);
  if (!session) return { error: 'Session not found', status: 404 };
  if (!mood) return { error: 'mood is required', status: 400 };

  session.moods.push({ mood, addedAt: new Date().toISOString() });
  store.update('feedSessions', sessionId, { moods: session.moods });

  return { data: session, status: 200 };
}

function getFeedSession(sessionId) {
  const session = store.findById('feedSessions', sessionId);
  if (!session) return { error: 'Session not found', status: 404 };
  return { data: session, status: 200 };
}

function getFeedItems(sessionId, { limit = 10 } = {}) {
  const session = store.findById('feedSessions', sessionId);
  if (!session) return { error: 'Session not found', status: 404 };

  // Mood-influenced product selection
  const products = store.getAll('products').filter((p) => p.status === 'active');
  const moodKeywords = session.moods.map((m) => m.mood.toLowerCase());

  const scored = products.map((product) => {
    let relevance = Math.random() * 30;
    for (const mood of moodKeywords) {
      if (product.tags?.some((t) => t.includes(mood))) relevance += 25;
      if (product.description.toLowerCase().includes(mood)) relevance += 15;
    }
    return { ...product, relevance: Math.round(relevance) };
  });

  scored.sort((a, b) => b.relevance - a.relevance);
  return { data: scored.slice(0, Number(limit)), status: 200 };
}

module.exports = {
  getRecommendations, getSimilarProducts,
  trackEvent, submitFeedback,
  createFeedSession, addMoodToSession, getFeedSession, getFeedItems,
};
