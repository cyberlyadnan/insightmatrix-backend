import mongoose from "mongoose";

export const CONTACT_QUERY_SUBJECTS = [
  "General Inquiry",
  "Sales",
  "Support",
  "Partnership",
  "Pricing",
  "Technical Integration",
  "Research Services"
] as const;

export const CONTACT_QUERY_LABELS = [
  "Sales",
  "Support",
  "Partnership",
  "Technical",
  "Priority"
] as const;

const contactQuerySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    subject: { type: String, required: true, enum: CONTACT_QUERY_SUBJECTS, index: true },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "in_progress", "resolved", "completed", "unread", "read"],
      default: "pending",
      index: true
    },
    starred: { type: Boolean, default: false, index: true },
    archived: { type: Boolean, default: false, index: true },
    labels: { type: [String], default: [], index: true },
    source: { type: String, enum: ["contact_page"], default: "contact_page" },
    metadata: {
      ip: { type: String, default: null },
      userAgent: { type: String, default: null }
    }
  },
  { timestamps: true }
);

contactQuerySchema.index({ createdAt: -1 });

export const ContactQuery = mongoose.model("ContactQuery", contactQuerySchema);
