const router = require('express').Router();
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { authenticateToken, adminOnly, authorizeRoles } = require('../middleware/auth');

const SALT_ROUNDS = 12;
const DEFAULT_SUPER_ADMIN_EMAIL = 'chishibekabwe7@gmail.com';

const isAdmin = [authenticateToken, authorizeRoles('admin', 'super_admin')];
const isSuperAdmin = [authenticateToken, authorizeRoles('super_admin')];

// Development helper endpoint to quickly verify seeded auth data.
// This is intentionally disabled outside development mode.
router.get('/dev/seeded-users-checklist', ...isSuperAdmin, async (req, res) => {
  const appEnv = process.env.NODE_ENV || 'development';
  if (appEnv !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  const [[{ total_users }]] = await pool.query('SELECT COUNT(*) AS total_users FROM users');
  const [[{ super_admin_count }]] = await pool.query('SELECT COUNT(*) AS super_admin_count FROM users WHERE role = "super_admin"');
  const [[{ admin_count }]] = await pool.query('SELECT COUNT(*) AS admin_count FROM users WHERE role = "admin"');
  const [[{ user_count }]] = await pool.query('SELECT COUNT(*) AS user_count FROM users WHERE role = "user"');
  const [[{ users_without_password_count }]] = await pool.query(
    'SELECT COUNT(*) AS users_without_password_count FROM users WHERE password IS NULL OR password = ""'
  );

  const [superAdminRows] = await pool.query(
    'SELECT id, email, role, created_at FROM users WHERE email = ? LIMIT 1',
    [DEFAULT_SUPER_ADMIN_EMAIL]
  );

  const [recentUsers] = await pool.query(
    `SELECT id, email, role, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT 10`
  );

  res.json({
    environment: appEnv,
    role_model: ['super_admin', 'admin', 'user'],
    default_super_admin: {
      email: DEFAULT_SUPER_ADMIN_EMAIL,
      exists: superAdminRows.length > 0,
      id: superAdminRows[0]?.id || null,
      note: 'Default password is configured in server config bootstrap logic.',
    },
    checklist: {
      total_users,
      super_admin_count,
      admin_count,
      user_count,
      users_without_password_count,
      all_users_have_password_hash: users_without_password_count === 0,
      has_exactly_one_super_admin: super_admin_count === 1,
    },
    recent_users: recentUsers,
  });
});

// Dashboard stats – revenue data; restricted to admin and super_admin only
router.get('/stats', authenticateToken, authorizeRoles('admin', 'super_admin'), async (req, res) => {
  const [[{ total_users }]] = await pool.query('SELECT COUNT(*) AS total_users FROM users WHERE role="user"');
  const [[{ total_bookings }]] = await pool.query('SELECT COUNT(*) AS total_bookings FROM bookings');
  const [[{ active_bookings }]] = await pool.query(
    `SELECT COUNT(*) AS active_bookings
     FROM bookings
     WHERE status IN ("approved","dispatched","in_transit")`
  );
  const [[{ total_revenue }]] = await pool.query('SELECT COALESCE(SUM(amount),0) AS total_revenue FROM transactions WHERE status="paid"');
  const [[{ pending_revenue }]] = await pool.query('SELECT COALESCE(SUM(amount),0) AS pending_revenue FROM transactions WHERE status="pending"');
  res.json({ total_users, total_bookings, active_bookings, total_revenue, pending_revenue });
});

// All users – user management; restricted to admin and super_admin only
router.get('/users', ...isAdmin, async (req, res) => {
  const [rows] = await pool.query('SELECT id, email, phone, full_name, company, role, created_at FROM users ORDER BY created_at DESC');
  res.json(rows);
});

// Create a new admin user – only super_admin may call this endpoint.
router.post('/create-admin', ...isSuperAdmin, async (req, res) => {
  const { email, password, full_name, company, phone } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existing.length > 0) {
    return res.status(409).json({ error: 'A user with that email already exists.' });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const [result] = await pool.query(
    `INSERT INTO users (email, password, role, full_name, company, phone) VALUES (?, ?, 'admin', ?, ?, ?)`,
    [email, hashedPassword, full_name || null, company || null, phone || null]
  );

  res.status(201).json({ message: 'Admin account created.', id: result.insertId, email, role: 'admin' });
});

// Delete (or deactivate) a user – admin and super_admin only.
// An admin cannot delete another admin or super_admin.
router.delete('/users/:id', ...isAdmin, async (req, res) => {
  const targetId = Number(req.params.id);
  if (!targetId || !Number.isInteger(targetId)) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }

  const [rows] = await pool.query('SELECT id, role FROM users WHERE id = ? LIMIT 1', [targetId]);
  if (!rows.length) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const targetUser = rows[0];

  // Prevent self-deletion
  if (targetUser.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  // Regular admins cannot delete other admins or super_admins
  if (['admin', 'super_admin'].includes(targetUser.role) && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only a super_admin can remove another admin account.' });
  }

  await pool.query('DELETE FROM users WHERE id = ?', [targetId]);
  res.json({ message: 'User removed successfully.' });
});


// All transactions
router.get('/transactions', authenticateToken, adminOnly, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT t.*, b.booking_ref, b.truck_type, b.hub, u.email, u.full_name
     FROM transactions t
     JOIN bookings b ON t.booking_id = b.id
     JOIN users u ON t.user_id = u.id
     ORDER BY t.created_at DESC`
  );
  res.json(rows);
});

// Notification delivery audit log
router.get('/notifications', authenticateToken, adminOnly, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT n.*, b.booking_ref, u.email, u.full_name
     FROM notification_events n
     LEFT JOIN bookings b ON n.booking_id = b.id
     LEFT JOIN users u ON n.user_id = u.id
     ORDER BY n.created_at DESC
     LIMIT 300`
  );
  res.json(rows);
});

// Admin action audit log
router.get('/audit-logs', authenticateToken, adminOnly, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT a.*, u.email AS admin_email, u.full_name AS admin_name
     FROM admin_audit_logs a
     JOIN users u ON a.admin_user_id = u.id
     ORDER BY a.created_at DESC
     LIMIT 300`
  );
  res.json(rows);
});

module.exports = router;
