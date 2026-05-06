import { ApiError } from '../utils/ApiError';
import { verifyAccessToken } from '../utils/tokens';
import { User } from '../models/User';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) return next(new ApiError(401, "Unauthorized"));

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) return next(new ApiError(401, "Invalid user session"));
    req.user = user;
    return next();
  } catch {
    return next(new ApiError(401, "Invalid or expired token"));
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, "Unauthorized"));
  if (!roles.includes(req.user.role)) return next(new ApiError(403, "Forbidden"));
  return next();
};

