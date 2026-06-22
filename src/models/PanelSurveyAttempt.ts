import mongoose from "mongoose";

/** Member-initiated survey session; `token` is echoed to supplier as tracking ref and in callbacks */
const panelSurveyAttemptSchema = new mongoose.Schema(
  {
    /** Null for anonymous share-link sessions (internal team links without login) */
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    panelSurveyId: { type: mongoose.Schema.Types.ObjectId, ref: "PanelSurvey", required: true, index: true },
    token: { type: String, required: true, unique: true, trim: true, maxlength: 64, index: true },
    /** Admin-supplied respondent id from share link (toid, pid, gid, etc.) */
    externalParticipantRef: { type: String, trim: true, maxlength: 200, default: "", index: true },
    supplierProjectPidSnapshot: { type: String, trim: true, maxlength: 200, default: "" },
    status: {
      type: String,
      enum: ["started", "completed_rewarded"],
      default: "started",
      index: true
    }
  },
  { timestamps: true }
);

panelSurveyAttemptSchema.index({ userId: 1, panelSurveyId: 1, createdAt: -1 });

export const PanelSurveyAttempt = mongoose.model("PanelSurveyAttempt", panelSurveyAttemptSchema);
