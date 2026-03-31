const logger = require('../utils/logger');

const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

const errorHandler = (err, req, res, _next) => {
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600
    ? err.status
    : 500;
  const isClientError = status >= 400 && status < 500;
  const message = isClientError
    ? err.message || 'Bad request'
    : 'Internal server error';

  if (!isClientError) {
    logger.error('Unhandled server error', {
      path: req.originalUrl,
      method: req.method,
      message: err.message,
      stack: err.stack,
    });
  } else {
    logger.warn('Client request error', {
      path: req.originalUrl,
      method: req.method,
      message,
    });
  }

  res.status(status).json({ error: true, message });
};

module.exports = { notFoundHandler, errorHandler };
