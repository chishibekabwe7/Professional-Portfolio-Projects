const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || 'elitrack-api';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'elitrack-client';

if (!SECRET) {
  throw new Error('JWT_SECRET is required in environment variables.');
}

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = header.slice(7);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, SECRET, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * authorize(roles) – allow access only if req.user.role is in the given list.
 * Must be used after authMiddleware.
 */
const authorize = (roles) => (req, res, next) => {
  if (!req.user?.role || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

const adminOnly = async (req, res, next) => {
  if (!req.user?.id) return res.status(403).json({ error: 'Admins only' });
  const [rows] = await pool.query('SELECT role FROM users WHERE id = ? LIMIT 1', [req.user.id]);
  if (!rows.length || !['admin', 'super_admin'].includes(rows[0].role)) {
    return res.status(403).json({ error: 'Admins only' });
  }
  req.user.role = rows[0].role;
  next();
};

module.exports = { authMiddleware, adminOnly, authorize };
