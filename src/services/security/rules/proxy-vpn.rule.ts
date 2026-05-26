import { gatewaySecurityConfig } from "../../../config/gateway-security.config";
import { SECURITY_REASON_CODES } from "../../../constants/gateway-security";
import { proxyVpnDetectionService } from "../proxy-vpn-detection.service";
import type { SecurityRule } from "../security.types";

/** Stub rule — VPN/proxy provider integration deferred */
export const proxyVpnValidationRule: SecurityRule = {
  name: "proxy_vpn",
  async run(ctx) {
    if (!gatewaySecurityConfig.vpn.enabled) return null;

    const detection = await proxyVpnDetectionService.analyze(ctx);
    if (detection.vpnDetected || detection.proxyDetected) {
      return {
        allowed: false,
        decision: "block",
        reasonCode: detection.vpnDetected
          ? SECURITY_REASON_CODES.VPN_DETECTED
          : SECURITY_REASON_CODES.PROXY_DETECTED,
        reasonMessage: "VPN or proxy detected",
        publicMessage: "VPN or proxy connections are not allowed for this survey.",
        metadata: detection
      };
    }
    return null;
  }
};
