const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { authMiddleware, adminOnly, authorize } = require('../middleware/auth');

const SALT_ROUNDS = 12;

const isAdmin = [authMiddleware, authorize(['admin', 'super_admin'])];

// Dashboard stats – revenue data; restricted to admin and super_admin only
router.get('/stats', authMiddleware, authorize(['admin', 'super_admin']), async (req, res) => {
  const [[{ total_users }]] = await pool.query('SELECT COUNT(*) AS total_users FROM users WHERE role="client"');
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

// Create a new admin user – only existing admins may call this.
// Only super_admin can promote directly to super_admin.
router.post('/create-admin', ...isAdmin, async (req, res) => {
  const { email, phone, password, full_name, company, role } = req.body;

  if (!email || !phone || !password) {
    return res.status(400).json({ error: 'email, phone and password are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const targetRole = role === 'super_admin' ? 'super_admin' : 'admin';

  // Only super_admin may create another super_admin
  if (targetRole === 'super_admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only a super_admin can create another super_admin.' });
  }

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existing.length > 0) {
    return res.status(409).json({ error: 'A user with that email already exists.' });
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const [result] = await pool.query(
    `INSERT INTO users (email, phone, password_hash, role, full_name, company) VALUES (?, ?, ?, ?, ?, ?)`,
    [email, phone, password_hash, targetRole, full_name || null, company || null]
  );

  res.status(201).json({ message: 'Admin account created.', id: result.insertId, email, role: targetRole });
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
router.get('/transactions', authMiddleware, adminOnly, async (req, res) => {
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
router.get('/notifications', authMiddleware, adminOnly, async (req, res) => {
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
router.get('/audit-logs', authMiddleware, adminOnly, async (req, res) => {
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
