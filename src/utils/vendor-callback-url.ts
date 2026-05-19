/**
 * Builds vendor callback destination with restored vendor toid (never our internal token).
 */
export function buildVendorCallbackDestinationUrl(
  baseUrl: string,
  params: {
    toid: string;
    pid?: string;
    extra?: Record<string, string>;
  }
): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) return trimmed;

  try {
    const url = new URL(trimmed);
    if (params.pid) url.searchParams.set("pid", params.pid);
    if (params.toid) url.searchParams.set("toid", params.toid);
    if (params.extra) {
      for (const [k, v] of Object.entries(params.extra)) {
        if (v) url.searchParams.set(k, v);
      }
    }
    return url.toString();
  } catch {
    const qs = new URLSearchParams();
    if (params.pid) qs.set("pid", params.pid);
    if (params.toid) qs.set("toid", params.toid);
    if (params.extra) {
      for (const [k, v] of Object.entries(params.extra)) {
        if (v) qs.set(k, v);
      }
    }
    const sep = trimmed.includes("?") ? "&" : "?";
    return `${trimmed}${sep}${qs.toString()}`;
  }
}
