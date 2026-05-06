import type { RequestHandler } from "express";
import xss from "xss";

/** Do not HTML-escape these fields — would change passwords/tokens vs client payloads */
const PRESERVE_RAW_KEYS = new Set([
  "password",
  "currentPassword",
  "newPassword",
  "confirmPassword",
  "token",
  "refreshToken",
  "accessToken",
]);

/** Recursively strip XSS payloads from strings inside JSON bodies */
function sanitizeDeep(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  if (typeof input === "string") return xss(input);
  if (typeof input === "number" || typeof input === "boolean") return input;
  if (Array.isArray(input)) return input.map((item) => sanitizeDeep(item));
  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      out[key] = PRESERVE_RAW_KEYS.has(key) ? obj[key] : sanitizeDeep(obj[key]);
    }
    return out;
  }
  return input;
}

/**
 * Express 5 makes `req.query` / `req.params` read-only; legacy `xss-clean` breaks by assigning them.
 * Sanitize JSON bodies only — query validation lives in Joi / handlers where needed.
 */
export const xssSanitizeMiddleware: RequestHandler = (req, _res, next) => {
  try {
    if (req.body !== undefined && req.body !== null && typeof req.body === "object") {
      req.body = sanitizeDeep(req.body);
    }
    next();
  } catch (err) {
    next(err);
  }
};
