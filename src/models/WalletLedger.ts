import mongoose from "mongoose";

const walletLedgerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["earned_complete", "adjustment", "bonus"],
      required: true,
      index: true
    },
    points: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    panelSurveyId: { type: mongoose.Schema.Types.ObjectId, ref: "PanelSurvey", default: null, index: true },
    attemptToken: { type: String, trim: true, maxlength: 64, default: null, index: true },
    description: { type: String, trim: true, maxlength: 500, default: "" }
  },
  { timestamps: true }
);

walletLedgerSchema.index({ userId: 1, createdAt: -1 });

export const WalletLedger = mongoose.model("WalletLedger", walletLedgerSchema);
