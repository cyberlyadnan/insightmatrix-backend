import { Vendor } from "../models/Vendor";
import { generateSecureAlphanumeric } from "./secure-token";

const VENDOR_CODE_PREFIX = "VND";

/**
 * Generates non-sequential vendor codes: VND-K7X9M2QP4R (not guessable like VND-1001).
 * Internal admin label only — not used on public supplier URLs.
 */
export async function generateNextVendorCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = `${VENDOR_CODE_PREFIX}-${generateSecureAlphanumeric(10)}`;
    const exists = await Vendor.exists({ vendorCode: code });
    if (!exists) return code;
  }
  throw new Error("Failed to generate unique vendor code");
}
