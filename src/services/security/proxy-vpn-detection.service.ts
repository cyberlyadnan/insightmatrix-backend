import type { SecurityTrafficContext } from "./security.types";

/**
 * VPN / proxy detection — stubbed for future provider integration.
 * Returns no detection until a provider (IPQualityScore, etc.) is wired in.
 */
export const proxyVpnDetectionService = {
  async analyze(_ctx: SecurityTrafficContext): Promise<{
    vpnDetected: boolean;
    proxyDetected: boolean;
    provider: string | null;
  }> {
    return {
      vpnDetected: false,
      proxyDetected: false,
      provider: null
    };
  }
};
