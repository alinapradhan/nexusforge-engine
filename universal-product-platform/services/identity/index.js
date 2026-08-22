/**
 * NexusForge Engine — Identity Service
 * -------------------------------------
 * User registration, authentication, JWT token management,
 * role verification, and profile operations.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const store = require('../../database/store');

const JWT_SECRET = process.env.JWT_SECRET || 'nexusforge-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const SALT_ROUNDS = 10;

/* ── Token Helpers ──────────────────────────────────── */

function generateToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, tier: user.tier },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/* ── Validation ─────────────────────────────────────── */

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

/* ── Service Methods ────────────────────────────────── */

function register({ email, password, name }) {
  if (!validateEmail(email)) return { error: 'Invalid email format', status: 400 };
  if (!validatePassword(password)) return { error: 'Password must be at least 6 characters', status: 400 };
  if (!name || name.trim().length < 2) return { error: 'Name is required (min 2 characters)', status: 400 };

  const existing = store.findByField('users', 'email', email);
  if (existing.length > 0) return { error: 'Email already registered', status: 409 };

  const user = store.insert('users', {
    id: uuidv4(),
    email: email.toLowerCase().trim(),
    name: name.trim(),
    passwordHash: bcrypt.hashSync(password, SALT_ROUNDS),
    role: 'customer',
    tier: 'FREE',
    avatar: '👤',
  });

  // Auto-create free entitlement
  const freePlan = store.findById('subscriptionPlans', 'plan_free');
  store.insert('entitlements', {
    userId: user.id,
    tier: 'FREE',
    features: freePlan ? freePlan.features : [],
  });

  const token = generateToken(user);
  return {
    data: {
      user: sanitizeUser(user),
      token,
    },
    status: 201,
  };
}

function login({ email, password }) {
  if (!email || !password) return { error: 'Email and password are required', status: 400 };

  const users = store.findByField('users', 'email', email.toLowerCase().trim());
  const user = users[0];
  if (!user) return { error: 'Invalid credentials', status: 401 };

  if (!bcrypt.compareSync(password, user.passwordHash)) {
    return { error: 'Invalid credentials', status: 401 };
  }

  const token = generateToken(user);
  store.insert('analyticsEvents', { type: 'login', userId: user.id, metadata: {} });

  return {
    data: { user: sanitizeUser(user), token },
    status: 200,
  };
}

function getProfile(userId) {
  const user = store.findById('users', userId);
  if (!user) return { error: 'User not found', status: 404 };
  return { data: sanitizeUser(user), status: 200 };
}

function updateProfile(userId, updates) {
  const user = store.findById('users', userId);
  if (!user) return { error: 'User not found', status: 404 };

  const allowed = {};
  if (updates.name) allowed.name = updates.name.trim();
  if (updates.avatar) allowed.avatar = updates.avatar;

  const updated = store.update('users', userId, allowed);
  return { data: sanitizeUser(updated), status: 200 };
}

function listUsers() {
  return {
    data: store.getAll('users').map(sanitizeUser),
    status: 200,
  };
}

/* ── Middleware ──────────────────────────────────────── */

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  const decoded = verifyToken(header.slice(7));
  if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' });
  req.user = decoded;
  next();
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/* ── Helpers ─────────────────────────────────────────── */

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

module.exports = {
  register, login, getProfile, updateProfile, listUsers,
  generateToken, verifyToken, validateEmail, validatePassword,
  authMiddleware, adminMiddleware, sanitizeUser,
};
