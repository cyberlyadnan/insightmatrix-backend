import { VENDOR_CALLBACK_OUTCOMES } from "../constants/vendor-callback";
import type {
  VendorCallbackConfigurationStatus,
  VendorCallbackUrls
} from "../types/vendor-callback";

export function buildVendorCallbackConfigurationStatus(
  urls: VendorCallbackUrls
): VendorCallbackConfigurationStatus {
  const status = {} as VendorCallbackConfigurationStatus;
  for (const outcome of VENDOR_CALLBACK_OUTCOMES) {
    status[outcome] = urls[outcome]?.trim() ? "configured" : "not_configured";
  }
  return status;
}
