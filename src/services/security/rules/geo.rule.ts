import { gatewaySecurityConfig } from "../../../config/gateway-security.config";
import { SECURITY_REASON_CODES } from "../../../constants/gateway-security";
import { geoLocationService } from "../geo-location.service";
import type { SecurityRule } from "../security.types";

function normalizeCountryList(list: string[] | undefined): string[] {
  return (list ?? []).map((c) => c.trim().toUpperCase()).filter(Boolean);
}

export const geoValidationRule: SecurityRule = {
  name: "geo",
  async run(ctx) {
    if (!gatewaySecurityConfig.enabled || !gatewaySecurityConfig.geo.enabled) {
      return null;
    }

    const geo = await geoLocationService.lookup(ctx.ipAddress);
    const country = geo.countryCode;

    ctx.headers = ctx.headers ?? {};
    (ctx as { _geo?: typeof geo })._geo = geo;

    const vendorCountries = normalizeCountryList(ctx.vendorAllowedCountries);
    if (vendorCountries.length && country && !vendorCountries.includes(country)) {
      return {
        allowed: false,
        decision: "block",
        reasonCode: SECURITY_REASON_CODES.GEO_VENDOR_BLOCKED,
        reasonMessage: `Country ${country} not allowed for vendor`,
        publicMessage: "This survey is not available in your region.",
        metadata: { country, vendorCountries }
      };
    }

    const surveyCountries = normalizeCountryList(ctx.surveyTargetCountries);
    if (
      gatewaySecurityConfig.geo.blockWhenSurveyCountriesConfigured &&
      surveyCountries.length &&
      country &&
      country !== "LOCAL" &&
      !surveyCountries.includes(country)
    ) {
      return {
        allowed: false,
        decision: "block",
        reasonCode: SECURITY_REASON_CODES.GEO_BLOCKED,
        reasonMessage: `Country ${country} not in survey targets`,
        publicMessage: "This survey is not available in your country.",
        metadata: { country, surveyCountries }
      };
    }

    return {
      allowed: true,
      decision: "allow",
      reasonCode: SECURITY_REASON_CODES.ALLOWED,
      reasonMessage: "Geo OK",
      publicMessage: "OK",
      metadata: { country, city: geo.city, region: geo.region }
    };
  }
};
