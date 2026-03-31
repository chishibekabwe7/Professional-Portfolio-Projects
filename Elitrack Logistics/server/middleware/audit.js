const { pool } = require('../config/db');

const auditAdminAction = (action, detailsFactory) => async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = async (body) => {
    try {
      if (res.statusCode < 400 && req.user?.id) {
        const details = typeof detailsFactory === 'function' ? detailsFactory(req, body) : null;
        await pool.query(
          `INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, details_json, ip_address, user_agent)
           VALUES (?,?,?,?,?,?,?)`,
          [
            req.user.id,
            action,
            details?.entity_type || null,
            details?.entity_id || null,
            details ? JSON.stringify(details) : null,
            req.ip || null,
            req.headers['user-agent'] || null,
          ]
        );
      }
    } catch (err) {
      console.error('[audit] Failed to store admin audit log:', err.message);
    }
    return originalJson(body);
  };

  next();
};

module.exports = { auditAdminAction };
