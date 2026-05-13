import mongoose from "mongoose";
import { ROLE_VALUES } from '../constants/roles';

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLE_VALUES, default: "user" },
    isVerified: { type: Boolean, default: false },
    avatar: { type: String, default: null },
    status: {
      type: String,
      enum: ["active", "suspended", "deactivated"],
      default: "active"
    },
    isActive: { type: Boolean, default: true },
    deletionRequested: { type: Boolean, default: false },
    deletionRequestedAt: { type: Date, default: null },
    deletionRequestReason: { type: String, trim: true, default: null },
    deactivatedAt: { type: Date, default: null },
    /** Member panel: completed required prescreen (matches active published required form) */
    panelPrescreenCompletedAt: { type: Date, default: null },
    panelPrescreenFormId: { type: mongoose.Schema.Types.ObjectId, ref: "PrescreenForm", default: null },
    /** Panel member rewards (points) */
    panelPoints: { type: Number, default: 0, min: 0 },
    panelLifetimePoints: { type: Number, default: 0, min: 0 },
    /** Legacy field — migration helper */
    name: { type: String, trim: true }
  },
  { timestamps: true }
);

userSchema.pre("save", function migrateLegacyName(next) {
  if ((!this.fullName || this.fullName === "") && this.name) {
    this.fullName = this.name;
  }
  next();
});

export const User = mongoose.model("User", userSchema);
