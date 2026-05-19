import { vendorRespondentSessionRepository } from "../../repositories/vendor-respondent-session.repository";
import { toVendorRespondentTrackingDto } from "../../utils/vendor-respondent-tracking.dto";
import type { VendorRespondentSessionListFilter } from "../../repositories/vendor-respondent-session.repository";

export const vendorRespondentTrackingService = {
  async list(filter: VendorRespondentSessionListFilter) {
    const result = await vendorRespondentSessionRepository.list(filter);
    return {
      items: result.items.map((item) =>
        toVendorRespondentTrackingDto(item as Record<string, unknown>)
      ),
      meta: result.meta
    };
  },

  async getById(id: string) {
    const doc = await vendorRespondentSessionRepository.findById(id);
    if (!doc) return null;
    return toVendorRespondentTrackingDto(doc as Record<string, unknown>);
  }
};
