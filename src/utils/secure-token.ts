import crypto from "crypto";

const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** URL-safe opaque token (unguessable) */
export function generateSecureToken(byteLength = 24): string {
  return crypto.randomBytes(byteLength).toString("base64url");
}

/** Uppercase alphanumeric without ambiguous chars (0/O, 1/I) for display codes */
export function generateSecureAlphanumeric(length: number): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHANUM[bytes[i] % ALPHANUM.length];
  }
  return out;
}
