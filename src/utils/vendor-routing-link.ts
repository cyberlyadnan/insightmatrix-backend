import { env } from "../config/env";

/** Public vendor entry URL — uses opaque routingSlug, not guessable allocation codes */
export function buildVendorAllocationRoutingLink(routingSlug: string): string {
  const base = env.CLIENT_URL.replace(/\/$/, "");
  const slug = routingSlug.trim();
  return `${base}/vendor/start/${encodeURIComponent(slug)}`;
}

/** Example for vendors — they append their respondent id as toid */
export function buildVendorAllocationRoutingLinkExample(routingSlug: string): string {
  return `${buildVendorAllocationRoutingLink(routingSlug)}?toid=RESPONDENT_ID`;
}
