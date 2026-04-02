const router = require('express').Router();
const { pool } = require('../config/db');
const { authenticateToken, adminOnly, authorizeRoles } = require('../middleware/auth');
const { sendNotification } = require('../services/notifications');
const { validateBookingCreate } = require('../middleware/validation');
const { auditAdminAction } = require('../middleware/audit');

// Generate booking reference
const genRef = () => 'TL-' + Date.now().toString(36).toUpperCase();
const WORKFLOW_STATUSES = ['pending_review', 'approved', 'dispatched', 'in_transit', 'completed'];
const LEGACY_MAP = { pending: 'pending_review', active: 'in_transit' };
const ALLOWED_TRANSITIONS = {
  pending_review: ['approved'],
  approved: ['dispatched'],
  dispatched: ['in_transit'],
  in_transit: ['completed'],
  completed: [],
};

const CATEGORY_BASE_RATE = {
  truck: 11500,
  van: 7000,
  suv: 5500,
  motorbike: 2500,
  other: 4500,
};

const normalizeStatus = (status) => LEGACY_MAP[status] || status;

const getVehicleForUser = async (vehicleId, userId) => {
  const [rows] = await pool.query(
    `SELECT id, category, vehicle_name, plate_number, tracking_enabled
     FROM vehicles
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [vehicleId, userId]
  );

  return rows[0] || null;
};

const getBookingWithUser = async (bookingId) => {
  const [rows] = await pool.query(
    `SELECT b.*, u.email, u.phone, u.full_name
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     WHERE b.id = ?
     LIMIT 1`,
    [bookingId]
  );
  return rows[0] || null;
};

// Create booking (user)
router.post('/', authenticateToken, validateBookingCreate, async (req, res) => {
  const {
    vehicle_id,
    truck_type,
    truck_price_per_day,
    units,
    days,
    hub,
    manual_location,
    security_tier,
    security_price,
    total_amount,
    notes,
  } = req.body;

  try {
    let resolvedVehicleId = null;
    let resolvedTruckType = String(truck_type || '').trim();
    let resolvedTruckPrice = Number(truck_price_per_day);

    if (vehicle_id) {
      const vehicleRecord = await getVehicleForUser(Number(vehicle_id), req.user.id);

      if (!vehicleRecord) {
        return res.status(404).json({ error: 'Selected vehicle was not found in your fleet.' });
      }

      resolvedVehicleId = vehicleRecord.id;
      const normalizedCategory = String(vehicleRecord.category || 'other').toLowerCase();

      resolvedTruckType = `${vehicleRecord.vehicle_name} (${normalizedCategory.toUpperCase()})`;

      if (!Number.isFinite(resolvedTruckPrice) || resolvedTruckPrice <= 0) {
        resolvedTruckPrice = CATEGORY_BASE_RATE[normalizedCategory] || CATEGORY_BASE_RATE.other;
      }
    }

    if (!resolvedTruckType) {
      return res.status(400).json({ error: 'A valid vehicle selection is required.' });
    }

    if (!Number.isFinite(resolvedTruckPrice) || resolvedTruckPrice <= 0) {
      return res.status(400).json({ error: 'Unable to determine pricing for the selected vehicle.' });
    }

    const ref = genRef();
    const normalizedHub = String(hub).toLowerCase() === 'other'
      ? String(manual_location || '').trim()
      : hub;

    const [result] = await pool.query(
      `INSERT INTO bookings (user_id, vehicle_id, booking_ref, truck_type, truck_price_per_day, units, days, hub, security_tier, security_price, total_amount, notes, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.user.id,
        resolvedVehicleId,
        ref,
        resolvedTruckType,
        resolvedTruckPrice,
        units,
        days,
        normalizedHub,
        security_tier,
        security_price,
        total_amount,
        notes || '',
        'pending_review',
      ]
    );
    // Create pending transaction
    await pool.query(
      'INSERT INTO transactions (booking_id, user_id, amount) VALUES (?,?,?)',
      [result.insertId, req.user.id, total_amount]
    );
    res.json({ id: result.insertId, booking_ref: ref });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get my bookings (user)
router.get('/mine', authenticateToken, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]
  );
  res.json(rows);
});

// Get all bookings (admin / super_admin)
router.get('/all', authenticateToken, authorizeRoles('admin', 'super_admin'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT b.*, u.email, u.full_name, u.company FROM bookings b
     JOIN users u ON b.user_id = u.id ORDER BY b.created_at DESC`
  );
  res.json(rows);
});

// Update booking status (admin / super_admin)
router.patch(
  '/:id/status',
  authenticateToken,
  authorizeRoles('admin', 'super_admin'),
  auditAdminAction('booking_status_updated', (req) => ({
    entity_type: 'booking',
    entity_id: Number(req.params.id),
    status: req.body.status,
    dispatcher_name: req.body.dispatcher_name || null,
    eta: req.body.eta || null,
  })),
  async (req, res) => {
  const requestedStatus = normalizeStatus(req.body.status);
  const dispatcherName = (req.body.dispatcher_name || '').trim();
  const eta = req.body.eta || null;
  const statusNotes = (req.body.status_notes || '').trim();

  if (!WORKFLOW_STATUSES.includes(requestedStatus)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  if (['dispatched', 'in_transit'].includes(requestedStatus)) {
    if (!dispatcherName) {
      return res.status(400).json({ error: 'dispatcher_name is required for dispatched/in_transit status.' });
    }
    if (!eta) {
      return res.status(400).json({ error: 'eta is required for dispatched/in_transit status.' });
    }
  }

  const [rows] = await pool.query('SELECT status FROM bookings WHERE id = ? LIMIT 1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Booking not found.' });

  const currentStatus = normalizeStatus(rows[0].status);
  if (currentStatus !== requestedStatus && !ALLOWED_TRANSITIONS[currentStatus]?.includes(requestedStatus)) {
    return res.status(400).json({ error: `Invalid transition from ${currentStatus} to ${requestedStatus}.` });
  }

  await pool.query(
    'UPDATE bookings SET status = ?, dispatcher_name = ?, eta = ?, status_notes = ? WHERE id = ?',
    [requestedStatus, dispatcherName || null, eta, statusNotes || null, req.params.id]
  );

  // Insert simple audit log entry
  if (req.user?.id) {
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, target_id) VALUES (?, ?, ?)',
      [req.user.id, 'status_change', Number(req.params.id)]
    ).catch(() => {});
  }

  const bookingRecord = await getBookingWithUser(req.params.id);
  if (bookingRecord) {
    await sendNotification({
      eventType: 'booking_status_update',
      booking: bookingRecord,
      user: bookingRecord,
    });

    if (requestedStatus === 'dispatched') {
      await sendNotification({
        eventType: 'dispatch_started',
        booking: bookingRecord,
        user: bookingRecord,
      });
    }

    if (requestedStatus === 'completed') {
      await sendNotification({
        eventType: 'booking_completed',
        booking: bookingRecord,
        user: bookingRecord,
      });
    }
  }

  res.json({ success: true, status: requestedStatus });
});

// Update transaction status (admin)
router.patch(
  '/:id/payment',
  authenticateToken,
  adminOnly,
  auditAdminAction('booking_payment_updated', (req) => ({
    entity_type: 'booking',
    entity_id: Number(req.params.id),
    payment_status: req.body.status,
    payment_method: req.body.payment_method || null,
  })),
  async (req, res) => {
  const { status, payment_method } = req.body;
  const allowedPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
  if (!allowedPaymentStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid payment status.' });
  }
  await pool.query(
    'UPDATE transactions SET status = ?, payment_method = ? WHERE booking_id = ?',
    [status, payment_method, req.params.id]
  );

  if (status === 'paid') {
    const bookingRecord = await getBookingWithUser(req.params.id);
    if (bookingRecord) {
      const [txRows] = await pool.query(
        `SELECT amount, payment_method
         FROM transactions
         WHERE booking_id = ?
         ORDER BY id DESC
         LIMIT 1`,
        [req.params.id]
      );
      const tx = txRows[0] || {};
      await sendNotification({
        eventType: 'payment_confirmation',
        booking: bookingRecord,
        user: bookingRecord,
        extra: { amount: tx.amount, payment_method: tx.payment_method },
      });
    }
  }

  res.json({ success: true });
});

module.exports = router;
