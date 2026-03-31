const nodemailer = require('nodemailer');
const { pool } = require('../config/db');

const EMAIL_ENABLED = String(process.env.EMAIL_ENABLED || '').toLowerCase() === 'true';
const SMS_ENABLED = String(process.env.SMS_ENABLED || '').toLowerCase() === 'true';
const WHATSAPP_ENABLED = String(process.env.WHATSAPP_ENABLED || '').toLowerCase() === 'true';

let transporter = null;

const STATUS_LABELS = {
  pending_review: 'Pending Review',
  approved: 'Approved',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  completed: 'Completed',
};

const setupTransporter = () => {
  if (transporter) return transporter;
  if (!EMAIL_ENABLED) return null;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[notifications] Email enabled but SMTP config is incomplete.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
};

const buildMessage = ({ eventType, booking, user, extra = {} }) => {
  const statusLabel = STATUS_LABELS[booking.status] || booking.status;
  const base = `Booking ${booking.booking_ref} for ${user.full_name || user.email}`;

  switch (eventType) {
    case 'booking_status_update':
      return {
        subject: `Booking Update: ${statusLabel}`,
        text: `${base} is now ${statusLabel}. Notes: ${booking.status_notes || 'No notes provided.'}`,
      };
    case 'dispatch_started':
      return {
        subject: `Dispatch Started: ${booking.booking_ref}`,
        text: `${base} has been dispatched.\nDispatcher: ${booking.dispatcher_name || 'N/A'}\nETA: ${booking.eta || 'N/A'}\nNotes: ${booking.status_notes || 'No notes provided.'}`,
      };
    case 'booking_completed':
      return {
        subject: `Booking Completed: ${booking.booking_ref}`,
        text: `${base} has been completed.\nThanks for using Elitrack Logistics.`,
      };
    case 'payment_confirmation':
      return {
        subject: `Payment Confirmed: ${booking.booking_ref}`,
        text: `Payment confirmed for booking ${booking.booking_ref}.\nAmount: K${Number(extra.amount || 0).toLocaleString()}\nMethod: ${extra.payment_method || 'N/A'}`,
      };
    default:
      return {
        subject: `Booking Notification: ${booking.booking_ref}`,
        text: `${base} has a new update.`,
      };
  }
};

const postWebhook = async (url, payload, label) => {
  if (!url) return;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`${label} webhook returned ${response.status}`);
  }
};

const sendTwilioMessage = async ({ to, from, message, channel }) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return false;

  const body = new URLSearchParams({
    To: channel === 'whatsapp' ? `whatsapp:${to}` : to,
    From: channel === 'whatsapp' ? `whatsapp:${from}` : from,
    Body: message,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!response.ok) {
    throw new Error(`Twilio ${channel} send failed with ${response.status}`);
  }
  return true;
};

const sendNotification = async ({ eventType, booking, user, extra = {} }) => {
  const message = buildMessage({ eventType, booking, user, extra });

  const logEvent = async ({ channel, status, provider, recipient, errorText }) => {
    try {
      await pool.query(
        `INSERT INTO notification_events
         (booking_id, user_id, channel, event_type, recipient, status, provider, message_subject, message_text, error_text)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          booking.id || null,
          booking.user_id || user.id || null,
          channel,
          eventType,
          recipient || null,
          status,
          provider || null,
          message.subject,
          message.text,
          errorText || null,
        ]
      );
    } catch (err) {
      console.error('[notifications] Failed to log notification event:', err.message);
    }
  };

  const attempt = async ({ channel, enabled, recipient, provider, send }) => {
    if (!enabled) {
      await logEvent({ channel, status: 'skipped', provider, recipient, errorText: 'Channel disabled by configuration.' });
      return;
    }
    if (!recipient) {
      await logEvent({ channel, status: 'skipped', provider, recipient, errorText: 'Recipient missing.' });
      return;
    }
    try {
      await send();
      await logEvent({ channel, status: 'sent', provider, recipient });
    } catch (error) {
      await logEvent({ channel, status: 'failed', provider, recipient, errorText: error.message });
      console.error(`[notifications] ${channel} send failed:`, error.message);
    }
  };

  const twilioSmsFrom = process.env.TWILIO_SMS_FROM;
  const twilioWhatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

  await Promise.all([
    attempt({
      channel: 'email',
      enabled: EMAIL_ENABLED,
      recipient: user.email,
      provider: 'smtp',
      send: async () => {
        const tx = setupTransporter();
        if (!tx) throw new Error('SMTP transporter not configured.');
        await tx.sendMail({
          from: process.env.EMAIL_FROM || process.env.SMTP_USER,
          to: user.email,
          subject: message.subject,
          text: message.text,
        });
      },
    }),
    attempt({
      channel: 'sms',
      enabled: SMS_ENABLED,
      recipient: user.phone,
      provider: twilioSmsFrom ? 'twilio' : 'webhook',
      send: async () => {
        if (twilioSmsFrom) {
          await sendTwilioMessage({ to: user.phone, from: twilioSmsFrom, message: message.text, channel: 'sms' });
          return;
        }
        if (!process.env.SMS_WEBHOOK_URL) throw new Error('SMS webhook URL not configured.');
        await postWebhook(
          process.env.SMS_WEBHOOK_URL,
          { to: user.phone, message: message.text, booking_ref: booking.booking_ref, event_type: eventType },
          'SMS'
        );
      },
    }),
    attempt({
      channel: 'whatsapp',
      enabled: WHATSAPP_ENABLED,
      recipient: user.phone,
      provider: twilioWhatsappFrom ? 'twilio' : 'webhook',
      send: async () => {
        if (twilioWhatsappFrom) {
          await sendTwilioMessage({ to: user.phone, from: twilioWhatsappFrom, message: message.text, channel: 'whatsapp' });
          return;
        }
        if (!process.env.WHATSAPP_WEBHOOK_URL) throw new Error('WhatsApp webhook URL not configured.');
        await postWebhook(
          process.env.WHATSAPP_WEBHOOK_URL,
          { to: user.phone, message: message.text, booking_ref: booking.booking_ref, event_type: eventType },
          'WhatsApp'
        );
      },
    }),
  ]);
};

const sendPasswordResetEmail = async ({ email, resetToken, expiresIn = '1h' }) => {
  if (!EMAIL_ENABLED) {
    console.warn('[notifications] Email not enabled. Password reset email not sent.');
    return false;
  }

  try {
    const tx = setupTransporter();
    if (!tx) throw new Error('SMTP transporter not configured.');

    const resetUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const htmlContent = `
      <h2>Password Reset Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Click the link below to proceed:</p>
      <p><a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
      <p>Or copy this link: <code>${resetUrl}</code></p>
      <p>This link expires in ${expiresIn}.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <hr />
      <p><small>Elitrack Logistics</small></p>
    `;

    const textContent = `
Password Reset Request

Hello,

We received a request to reset your password. Visit this link to proceed:
${resetUrl}

This link expires in ${expiresIn}.

If you didn't request this, please ignore this email.

Elitrack Logistics
    `.trim();

    await tx.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Elitrack Logistics - Password Reset',
      text: textContent,
      html: htmlContent,
    });

    return true;
  } catch (err) {
    console.error('[notifications] Password reset email failed:', err.message);
    return false;
  }
};

module.exports = { sendNotification, sendPasswordResetEmail };
