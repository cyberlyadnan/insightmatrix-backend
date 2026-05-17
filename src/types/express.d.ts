import type { Document, Types } from "mongoose";

declare global {
  namespace Express {
    interface UserPayload extends Document {
      _id: Types.ObjectId;
      fullName: string;
      email: string;
      role: string;
      isVerified: boolean;
      avatar: string | null;
      status: string;
      isActive: boolean;
      deletionRequested: boolean;
      deletionRequestedAt: Date | null;
      deletionRequestReason: string | null;
      deactivatedAt: Date | null;
    }

    interface VendorPayload extends Document {
      _id: Types.ObjectId;
      vendorCode: string;
      vendorUid: string;
      companyName: string;
      contactPerson: string;
      email: string;
      status: string;
      callbackUrls: {
        complete: string;
        terminate: string;
        quota_full: string;
        quality_reject: string;
      };
    }

    interface Request {
      user?: UserPayload;
      vendor?: VendorPayload;
      /** Set by `validate` middleware when query keys are validated (Express 5 cannot assign `req.query`). */
      validatedQuery?: Record<string, unknown>;
    }
  }
}

export {};
