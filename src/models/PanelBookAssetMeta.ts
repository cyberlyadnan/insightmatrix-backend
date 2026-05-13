import mongoose from "mongoose";

/** Single-row metadata for the downloadable Panel Book PDF (file on disk at fixed path). */
const panelBookAssetMetaSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: "default", unique: true, index: true },
    originalFileName: { type: String, default: "InsightMatrix-Panel-Book.pdf" },
    mimeType: { type: String, default: "application/pdf" },
    fileSizeBytes: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const PanelBookAssetMeta = mongoose.model("PanelBookAssetMeta", panelBookAssetMetaSchema);
