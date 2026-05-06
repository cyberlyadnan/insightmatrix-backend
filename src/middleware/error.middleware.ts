import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';

export const errorMiddleware = (err, req, res, _next) => {
  const statusCode =
    err instanceof ApiError || typeof err.statusCode === "number"
      ? Number(err.statusCode)
      : 500;

  const resolved = Number.isFinite(statusCode) && statusCode >= 400 ? statusCode : 500;

  const routineGuestProfile =
    resolved === 401 &&
    req.method === "GET" &&
    String(req.originalUrl || "").includes("/users/profile");

  if (resolved >= 500) {
    logger.error(`${req.method} ${req.originalUrl} ${resolved}`, {
      message: err.message,
      stack: err.stack
    });
  } else if (!routineGuestProfile) {
    logger.info(`Client ${resolved}: ${req.method} ${req.originalUrl} — ${err.message}`);
  }

  res.status(resolved).json({
    success: false,
    message: err.message || "Internal Server Error",
    details: err.details ?? null
  });
};

export const notFoundMiddleware = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
};

