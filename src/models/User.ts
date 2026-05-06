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
      enum: ["active", "suspended"],
      default: "active"
    },
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
