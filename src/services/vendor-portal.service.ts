import { ApiError } from "../utils/ApiError";
import { vendorRepository } from "../repositories/vendor.repository";
import { toVendorDashboardSummary, toVendorPublicProfile } from "../utils/vendor.dto";
import type { VendorCallbackUrls } from "../types/vendor-callback";
import { normalizeVendorCallbackUrls } from "../utils/vendor-callback";

export const vendorPortalService = {
  getProfile: async (vendorId: string) => {
    const doc = await vendorRepository.findById(vendorId);
    if (!doc) throw new ApiError(404, "Vendor not found");
    return toVendorPublicProfile(doc);
  },

  updateProfile: async (
    vendorId: string,
    payload: {
      companyName?: string;
      contactPerson?: string;
      phone?: string;
      website?: string;
      callbackUrls?: Partial<VendorCallbackUrls>;
    }
  ) => {
    const update: Record<string, unknown> = {};
    if (payload.companyName !== undefined) update.companyName = payload.companyName.trim();
    if (payload.contactPerson !== undefined) update.contactPerson = payload.contactPerson.trim();
    if (payload.phone !== undefined) update.phone = payload.phone.trim();
    if (payload.website !== undefined) update.website = payload.website.trim();
    if (payload.callbackUrls !== undefined) {
      update.callbackUrls = normalizeVendorCallbackUrls(payload.callbackUrls);
    }

    const doc = await vendorRepository.updateById(vendorId, update);
    if (!doc) throw new ApiError(404, "Vendor not found");
    return toVendorPublicProfile(doc);
  },

  getDashboardSummary: async (vendorId: string) => {
    const doc = await vendorRepository.findById(vendorId);
    if (!doc) throw new ApiError(404, "Vendor not found");
    return toVendorDashboardSummary(doc);
  }
};
