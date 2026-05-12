import rateLimit from "express-rate-limit";

/** Supplier redirects may burst; still bounded for abuse protection */
export const publicRoutingCallbackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, try again shortly" }
});
