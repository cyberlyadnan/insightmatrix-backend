import { Types } from "mongoose";
import { VendorRespondentSession } from "../models/VendorRespondentSession";
import type { VendorRespondentSessionStatus } from "../constants/vendor-allocation";

export const vendorRespondentSessionRepository = {
  findByToken(sessionToken: string) {
    return VendorRespondentSession.findOne({ sessionToken: sessionToken.trim() }).lean();
  },

  findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return VendorRespondentSession.findById(id).lean();
  },

  create(payload: Record<string, unknown>) {
    return VendorRespondentSession.create(payload);
  },

  updateStatus(
    id: Types.ObjectId,
    status: VendorRespondentSessionStatus,
    extra?: { redirectedAt?: Date; completedAt?: Date }
  ) {
    return VendorRespondentSession.findByIdAndUpdate(
      id,
      { $set: { status, ...extra } },
      { new: true }
    );
  },

  countRedirectsForAllocation(allocationId: Types.ObjectId) {
    return VendorRespondentSession.countDocuments({
      allocationId,
      status: { $in: ["redirected", "complete", "terminate", "quota_full", "quality_reject"] }
    });
  }
};
