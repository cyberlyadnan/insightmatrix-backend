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
    }

    interface Request {
      user?: UserPayload;
      /** Set by `validate` middleware when query keys are validated (Express 5 cannot assign `req.query`). */
      validatedQuery?: Record<string, unknown>;
    }
  }
}

export {};
