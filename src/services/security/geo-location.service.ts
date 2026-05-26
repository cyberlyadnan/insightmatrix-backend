import { env } from "../../config/env";

export type GeoLookupResult = {
  countryCode: string;
  countryName: string;
  region: string;
  city: string;
  success: boolean;
};

const cache = new Map<string, { at: number; data: GeoLookupResult }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function isPrivateIp(ip: string): boolean {
  if (!ip || ip === "::1" || ip === "127.0.0.1") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.")) return true;
  return false;
}

/**
 * Geo lookup via configurable HTTP API (default: ip-api.com free tier).
 * Provider abstraction — swap URL via GEOIP_API_URL.
 */
export const geoLocationService = {
  async lookup(ip: string): Promise<GeoLookupResult> {
    const normalized = ip.trim();
    if (!normalized || isPrivateIp(normalized)) {
      return {
        countryCode: "LOCAL",
        countryName: "Local",
        region: "",
        city: "",
        success: true
      };
    }

    const cached = cache.get(normalized);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const base = String(env.GEOIP_API_URL ?? "http://ip-api.com/json").replace(/\/$/, "");
      const url = `${base}/${encodeURIComponent(normalized)}?fields=status,country,countryCode,regionName,city`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        return { countryCode: "", countryName: "", region: "", city: "", success: false };
      }

      const data = (await res.json()) as {
        status?: string;
        country?: string;
        countryCode?: string;
        regionName?: string;
        city?: string;
      };

      if (data.status === "fail") {
        return { countryCode: "", countryName: "", region: "", city: "", success: false };
      }

      const result: GeoLookupResult = {
        countryCode: String(data.countryCode ?? "").toUpperCase(),
        countryName: String(data.country ?? ""),
        region: String(data.regionName ?? ""),
        city: String(data.city ?? ""),
        success: true
      };
      cache.set(normalized, { at: Date.now(), data: result });
      return result;
    } catch {
      return { countryCode: "", countryName: "", region: "", city: "", success: false };
    }
  }
};
