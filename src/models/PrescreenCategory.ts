import mongoose from "mongoose";

const prescreenCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    description: { type: String, default: "" },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const PrescreenCategory = mongoose.model("PrescreenCategory", prescreenCategorySchema);
