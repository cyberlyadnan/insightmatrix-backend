import { Document, Types } from "mongoose";

declare global {
  namespace Express {
    interface UserPayload extends Document {
      _id: Types.ObjectId;
      name: string;
      email: string;
      role: string;
      isActive: boolean;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
