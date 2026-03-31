require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { initDB, pool, closeDB } = require('./config/db');
const { authRateLimit, adminRateLimit } = require('./middleware/rateLimit');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in server/.env');
}

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '200kb' }));

app.use('/api/auth', authRateLimit, require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', adminRateLimit, require('./routes/admin'));

app.get('/', (_, res) => {
  res.json({
    name: 'Elitrack Logistics API',
    status: 'running',
    client_url: 'http://localhost:3000',
    health_url: '/api/health',
  });
});

app.get('/api/health', async (_, res) => {
  try {
    await pool.query('SELECT 1 AS ok');
    res.status(200).json({ status: 'ok', db: 'connected', time: new Date() });
  } catch (error) {
    logger.error('Health check failed', { message: error.message });
    res.status(503).json({ status: 'degraded', db: 'disconnected', time: new Date() });
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
let server;
let shuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info('Shutdown signal received', { signal });

  if (server) {
    await new Promise((resolve) => {
      const shutdownTimer = setTimeout(() => {
        logger.warn('Forcing process exit after shutdown timeout', { timeout_ms: 10000 });
        resolve();
      }, 10000);

      server.close(() => {
        clearTimeout(shutdownTimer);
        resolve();
      });
    });
  }

  try {
    await closeDB();
    logger.info('SQL pool closed');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to close SQL pool', { message: error.message, stack: error.stack });
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

initDB().then(() => {
  server = app.listen(PORT, () => logger.info('API server started', { port: PORT }));
}).catch((err) => {
  logger.error('DB init failed', { message: err.message, stack: err.stack });
  process.exit(1);
});
