const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { pool } = require('../config/db');
const { validateRegister, validateLogin, validateGoogleAuth, validateForgotPassword, validateResetPassword, validateVerifyResetToken } = require('../middleware/validation');
const { sendPasswordResetEmail } = require('../services/notifications');
const SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || 'elitrack-api';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'elitrack-client';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

if (!SECRET) {
  throw new Error('JWT_SECRET is required in environment variables.');
}

const signAuthToken = (user) => jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  SECRET,
  { expiresIn: JWT_EXPIRES_IN, issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
);

// Register
router.post('/register', validateRegister, async (req, res) => {
  const { email, phone, password, full_name, company } = req.body;
  if (!email || !phone || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (email, phone, password_hash, full_name, company) VALUES (?,?,?,?,?)',
      [email, phone, hash, full_name || '', company || '']
    );
    res.json({ success: true, message: 'Account created successfully. Please log in.' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: e.message });
  }
});

// Login
router.post('/login', validateLogin, async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signAuthToken(user);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name, company: user.company } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Google OAuth
router.post('/google', validateGoogleAuth, async (req, res) => {
  const { token } = req.body;
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'GOOGLE_CLIENT_ID is not configured.' });
    }
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const { email, name } = payload;

    // Check if user exists, create if not
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    let user;

    if (rows.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO users (email, full_name, phone, password_hash) VALUES (?,?,?,?)',
        [email, name || '', 'N/A', await bcrypt.hash('oauth_user', 10)]
      );
      user = { id: result.insertId, email, full_name: name, role: 'client' };
    } else {
      user = rows[0];
    }

    const jwtToken = signAuthToken(user);
    res.json({ token: jwtToken, user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name, company: user.company } });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'Google authentication failed: ' + err.message });
  }
});

// Forgot password - request reset token
router.post('/forgot-password', validateForgotPassword, async (req, res) => {
  const { email } = req.body;
  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    
    // Always return success to prevent email enumeration
    if (!rows.length) {
      return res.json({ message: 'If an account exists, a reset link will be sent shortly.' });
    }

    const user = rows[0];
    
    // Generate reset token (32 random bytes in hex)
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Store token in database
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?,?,?)',
      [user.id, resetToken, expiresAt]
    );

    // Send email
    await sendPasswordResetEmail({ email, resetToken, expiresIn: '15 minutes' });
    
    res.json({ message: 'If an account exists, a reset link will be sent shortly.' });
  } catch (e) {
    console.error('Forgot password error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Verify reset token - check if token is valid
router.post('/verify-reset-token', validateVerifyResetToken, async (req, res) => {
  const { token } = req.body;
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, expires_at, used FROM password_reset_tokens 
       WHERE token = ? AND used = FALSE`,
      [token]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid or expired reset token.' });
    }

    const resetRecord = rows[0];
    const now = new Date();

    if (new Date(resetRecord.expires_at) < now) {
      return res.status(401).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    res.json({ 
      valid: true, 
      message: 'Token is valid. You can now reset your password.',
      user_id: resetRecord.user_id 
    });
  } catch (e) {
    console.error('Token verification error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Reset password - use token to reset password
router.post('/reset-password', validateResetPassword, async (req, res) => {
  const { token, password } = req.body;
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, expires_at, used FROM password_reset_tokens 
       WHERE token = ? AND used = FALSE`,
      [token]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid or expired reset token.' });
    }

    const resetRecord = rows[0];
    const now = new Date();

    if (new Date(resetRecord.expires_at) < now) {
      return res.status(401).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password
    await pool.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, resetRecord.user_id]
    );

    // Mark token as used
    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = ?',
      [resetRecord.id]
    );

    // Clean up expired tokens (optional)
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = TRUE'
    );

    res.json({ 
      success: true, 
      message: 'Password reset successfully. You can now login with your new password.' 
    });
  } catch (e) {
    console.error('Reset password error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
