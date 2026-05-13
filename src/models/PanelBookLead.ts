import mongoose from "mongoose";
import { PANEL_BOOK_ORG_TYPES } from "../constants/panel-book";

const panelBookLeadSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    workEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    companyName: { type: String, required: true, trim: true, maxlength: 200 },
    organizationType: { type: String, required: true, enum: PANEL_BOOK_ORG_TYPES, index: true },
    jobTitle: { type: String, required: true, trim: true, maxlength: 120 },
    country: { type: String, required: true, uppercase: true, trim: true, minlength: 2, maxlength: 2 },
    acceptedTerms: { type: Boolean, required: true },
    metadata: {
      ip: { type: String, default: null },
      userAgent: { type: String, default: null }
    }
  },
  { timestamps: true }
);

panelBookLeadSchema.index({ createdAt: -1 });

export const PanelBookLead = mongoose.model("PanelBookLead", panelBookLeadSchema);
