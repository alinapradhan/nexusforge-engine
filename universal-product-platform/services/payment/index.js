/**
 * NexusForge Engine — Payment Service
 * -------------------------------------
 * Order checkout simulation, payment transaction processing,
 * refund handling, and idempotency support.
 */

const { v4: uuidv4 } = require('uuid');
const store = require('../../database/store');

const PAYMENT_STATUSES = ['pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'];

/* ── Create Payment ─────────────────────────────────── */

function createPayment({ userId, amount, currency = 'USD', method = 'card', description, idempotencyKey, items = [] }) {
  if (!userId) return { error: 'userId is required', status: 400 };
  if (!amount || Number(amount) <= 0) return { error: 'Valid positive amount is required', status: 400 };

  // Idempotency check
  if (idempotencyKey) {
    const existing = store.getAll('payments').find((p) => p.idempotencyKey === idempotencyKey);
    if (existing) return { data: existing, status: 200 };
  }

  const payment = store.insert('payments', {
    id: uuidv4(),
    userId,
    amount: Number(amount),
    currency,
    method,
    description: description || `Payment of ${currency} ${amount}`,
    status: 'completed', // simulated instant success
    items,
    idempotencyKey: idempotencyKey || null,
    receiptUrl: null,
  });

  // Generate receipt URL
  store.update('payments', payment.id, { receiptUrl: `/v1/payments/${payment.id}/receipt` });

  // Track analytics
  store.insert('analyticsEvents', {
    type: 'payment_completed',
    userId,
    metadata: { paymentId: payment.id, amount: payment.amount, currency },
  });

  return { data: store.findById('payments', payment.id), status: 201 };
}

/* ── Get Payment ────────────────────────────────────── */

function getPayment(paymentId) {
  const payment = store.findById('payments', paymentId);
  if (!payment) return { error: 'Payment not found', status: 404 };
  return { data: payment, status: 200 };
}

/* ── List Payments ──────────────────────────────────── */

function listPayments({ userId, status, page = 1, limit = 20 } = {}) {
  let results = store.getAll('payments');
  if (userId) results = results.filter((p) => p.userId === userId);
  if (status) results = results.filter((p) => p.status === status);

  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = results.length;
  const offset = (Number(page) - 1) * Number(limit);
  const items = results.slice(offset, offset + Number(limit));

  return {
    data: { items, pagination: { page: Number(page), limit: Number(limit), total } },
    status: 200,
  };
}

/* ── Refund ──────────────────────────────────────────── */

function refundPayment(paymentId, { amount, reason } = {}) {
  const payment = store.findById('payments', paymentId);
  if (!payment) return { error: 'Payment not found', status: 404 };
  if (payment.status === 'refunded') return { error: 'Payment already fully refunded', status: 400 };
  if (payment.status !== 'completed' && payment.status !== 'partially_refunded') {
    return { error: 'Only completed or partially refunded payments can be refunded', status: 400 };
  }

  const refundAmount = amount ? Number(amount) : payment.amount;
  if (refundAmount > payment.amount) return { error: 'Refund amount exceeds payment amount', status: 400 };

  const newStatus = refundAmount >= payment.amount ? 'refunded' : 'partially_refunded';

  store.update('payments', paymentId, {
    status: newStatus,
    refundedAmount: refundAmount,
    refundReason: reason || 'Customer request',
    refundedAt: new Date().toISOString(),
  });

  store.insert('analyticsEvents', {
    type: 'payment_refunded',
    userId: payment.userId,
    metadata: { paymentId, refundAmount, reason },
  });

  return { data: store.findById('payments', paymentId), status: 200 };
}

module.exports = { createPayment, getPayment, listPayments, refundPayment, PAYMENT_STATUSES };
