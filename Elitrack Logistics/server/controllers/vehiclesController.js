const { pool } = require('../config/db');

const DEFAULT_CATEGORY = 'other';

const toBoolean = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }

  return fallback;
};

const normalizeCategory = (category, customCategory) => {
  const normalized = String(category || '').trim().toLowerCase();

  if (!normalized) return DEFAULT_CATEGORY;
  if (normalized !== DEFAULT_CATEGORY) return normalized;

  const custom = String(customCategory || '').trim().toLowerCase();
  return custom || DEFAULT_CATEGORY;
};

const normalizePlate = (plateNumber) => String(plateNumber || '').trim().toUpperCase();

const parseVehiclePayload = (payload) => {
  const category = normalizeCategory(payload.category, payload.custom_category);
  const vehicleName = String(payload.vehicle_name || '').trim();
  const plateNumber = normalizePlate(payload.plate_number);
  const trackingEnabled = toBoolean(payload.tracking_enabled, true);

  if (!vehicleName) {
    return { error: 'vehicle_name is required.' };
  }

  if (!plateNumber) {
    return { error: 'plate_number is required.' };
  }

  if (vehicleName.length > 120) {
    return { error: 'vehicle_name must be 120 characters or fewer.' };
  }

  if (plateNumber.length > 30) {
    return { error: 'plate_number must be 30 characters or fewer.' };
  }

  if (category.length > 60) {
    return { error: 'category must be 60 characters or fewer.' };
  }

  return {
    category,
    vehicleName,
    plateNumber,
    trackingEnabled,
  };
};

const createVehicle = async (req, res) => {
  const parsed = parseVehiclePayload(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO vehicles (user_id, category, vehicle_name, plate_number, tracking_enabled)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, parsed.category, parsed.vehicleName, parsed.plateNumber, parsed.trackingEnabled]
    );

    const [rows] = await pool.query(
      'SELECT * FROM vehicles WHERE id = ? AND user_id = ? LIMIT 1',
      [result.insertId, req.user.id]
    );

    return res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A vehicle with this plate_number is already registered in your fleet.' });
    }

    return res.status(500).json({ error: error.message });
  }
};

const getVehicles = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const updateVehicle = async (req, res) => {
  const vehicleId = Number(req.params.id);
  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    return res.status(400).json({ error: 'Invalid vehicle id.' });
  }

  const parsed = parseVehiclePayload(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  try {
    const [existingRows] = await pool.query(
      'SELECT id FROM vehicles WHERE id = ? AND user_id = ? LIMIT 1',
      [vehicleId, req.user.id]
    );

    if (!existingRows.length) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    await pool.query(
      `UPDATE vehicles
       SET category = ?, vehicle_name = ?, plate_number = ?, tracking_enabled = ?
       WHERE id = ? AND user_id = ?`,
      [parsed.category, parsed.vehicleName, parsed.plateNumber, parsed.trackingEnabled, vehicleId, req.user.id]
    );

    const [rows] = await pool.query(
      'SELECT * FROM vehicles WHERE id = ? AND user_id = ? LIMIT 1',
      [vehicleId, req.user.id]
    );

    return res.json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A vehicle with this plate_number is already registered in your fleet.' });
    }

    return res.status(500).json({ error: error.message });
  }
};

const deleteVehicle = async (req, res) => {
  const vehicleId = Number(req.params.id);
  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    return res.status(400).json({ error: 'Invalid vehicle id.' });
  }

  try {
    const [existingRows] = await pool.query(
      'SELECT id FROM vehicles WHERE id = ? AND user_id = ? LIMIT 1',
      [vehicleId, req.user.id]
    );

    if (!existingRows.length) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    await pool.query('DELETE FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, req.user.id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createVehicle,
  getVehicles,
  updateVehicle,
  deleteVehicle,
};
