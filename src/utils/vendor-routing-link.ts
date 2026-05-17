import { env } from "../config/env";

/** Public vendor entry URL — vendors never receive raw supplier URLs */
export function buildVendorAllocationRoutingLink(allocationCode: string): string {
  const base = env.CLIENT_URL.replace(/\/$/, "");
  const code = allocationCode.trim().toUpperCase();
  return `${base}/vendor/start/${encodeURIComponent(code)}`;
}
