import type { Request } from "express";

/**
 * Resolves client IP from Express request (supports proxies).
 */
export function resolveClientIp(req: Request): { ip: string; forwardedIp: string } {
  const forwarded = String(req.headers["x-forwarded-for"] ?? "").trim();
  const forwardedIp = forwarded
    ? forwarded
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)[0] ?? ""
    : "";

  const ip =
    forwardedIp ||
    String(req.headers["x-real-ip"] ?? "").trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    "";

  return {
    ip: ip.replace(/^::ffff:/, "").slice(0, 64),
    forwardedIp: forwarded.slice(0, 256)
  };
}

export function normalizeIp(ip: string): string {
  return ip.trim().replace(/^::ffff:/, "");
}
