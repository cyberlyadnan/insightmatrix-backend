import { VENDOR_CODE_PREFIX, VENDOR_CODE_START_NUMBER } from "../constants/vendor";
import { Vendor } from "../models/Vendor";

const CODE_PATTERN = /^VND-(\d+)$/;

/**
 * Generates the next readable internal vendor code: VND-1001, VND-1002, …
 * Not related to supplier `vid` on external survey URLs.
 */
export async function generateNextVendorCode(): Promise<string> {
  const latest = await Vendor.findOne({ vendorCode: { $regex: `^${VENDOR_CODE_PREFIX}-` } })
    .sort({ vendorCode: -1 })
    .select("vendorCode")
    .lean();

  let nextNum = VENDOR_CODE_START_NUMBER;
  if (latest?.vendorCode) {
    const match = String(latest.vendorCode).match(CODE_PATTERN);
    if (match) {
      nextNum = Math.max(VENDOR_CODE_START_NUMBER, Number.parseInt(match[1], 10) + 1);
    }
  }

  return `${VENDOR_CODE_PREFIX}-${nextNum}`;
}
