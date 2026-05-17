import { routingOrchestratorService } from "../routing/routing-orchestrator.service";

export type VendorRoutingStartInput = {
  allocationCode: string;
  vendorRespondentId?: string;
  trafficSource?: string;
  sourceIp?: string;
  userAgent?: string;
};

export type VendorRoutingStartResult = {
  sessionToken: string;
  redirectUrl: string;
  allocationCode: string;
};

/**
 * Vendor entry — delegates to unified routing gateway orchestrator.
 */
export async function startVendorRoutingSession(
  input: VendorRoutingStartInput
): Promise<VendorRoutingStartResult> {
  const result = await routingOrchestratorService.startVendorTraffic(input);
  return {
    sessionToken: result.sessionToken,
    redirectUrl: result.redirectUrl,
    allocationCode: result.allocationCode ?? input.allocationCode.trim().toUpperCase()
  };
}

export const vendorRoutingService = {
  startVendorRoutingSession
};
