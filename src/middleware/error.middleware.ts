import { logger } from '../config/logger';

export const errorMiddleware = (err, req, res, _next) => {
  logger.error(err.stack || err.message);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    details: err.details || null
  });
};

export const notFoundMiddleware = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
};

