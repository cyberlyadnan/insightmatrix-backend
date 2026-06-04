import { env } from "./env";

function envBool(v: unknown, defaultVal: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return defaultVal;
}

export type GatewaySecurityConfig = {
  enabled: boolean;
  captcha: {
    enabled: boolean;
    provider: "recaptcha_v3" | "recaptcha_v2";
    siteKey: string;
    secretKey: string;
    minScore: number;
  };
  uniqueIp: {
    enabled: boolean;
    windowMinutes: number;
    maxHitsPerSurvey: number;
    maxHitsPerAllocation: number;
    blockOnDuplicate: boolean;
  };
  geo: {
    enabled: boolean;
    blockWhenSurveyCountriesConfigured: boolean;
  };
  bot: {
    enabled: boolean;
    blockOnDetection: boolean;
  };
  vpn: {
    enabled: boolean;
  };
};

export const gatewaySecurityConfig: GatewaySecurityConfig = {
  enabled: envBool(env.SECURITY_GATEWAY_ENABLED, false),
  captcha: {
    enabled: envBool(env.SECURITY_CAPTCHA_ENABLED, false),
    provider: (env.RECAPTCHA_VERSION === "v2" ? "recaptcha_v2" : "recaptcha_v3") as
      | "recaptcha_v3"
      | "recaptcha_v2",
    siteKey: String(env.RECAPTCHA_SITE_KEY ?? ""),
    secretKey: String(env.RECAPTCHA_SECRET_KEY ?? ""),
    minScore: Number(env.RECAPTCHA_MIN_SCORE ?? 0.5)
  },
  uniqueIp: {
    enabled: envBool(env.SECURITY_UNIQUE_IP_ENABLED, false),
    windowMinutes: Number(env.SECURITY_UNIQUE_IP_WINDOW_MINUTES ?? 60),
    maxHitsPerSurvey: Number(env.SECURITY_UNIQUE_IP_MAX_PER_SURVEY ?? 3),
    maxHitsPerAllocation: Number(env.SECURITY_UNIQUE_IP_MAX_PER_ALLOCATION ?? 2),
    blockOnDuplicate: envBool(env.SECURITY_UNIQUE_IP_BLOCK, true)
  },
  geo: {
    enabled: envBool(env.SECURITY_GEO_ENABLED, false),
    blockWhenSurveyCountriesConfigured: true
  },
  bot: {
    enabled: envBool(env.SECURITY_BOT_ENABLED, false),
    blockOnDetection: envBool(env.SECURITY_BOT_BLOCK, false)
  },
  vpn: {
    enabled: false
  }
};
