import mongoose from "mongoose";

const prescreenSubmissionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    respondentProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SurveyRespondentProfile",
      default: null,
      index: true
    },
    respondentOwnerType: {
      type: String,
      enum: ["internal", "vendor"],
      default: "internal",
      index: true
    },
    vendorRespondentToid: { type: String, trim: true, maxlength: 500, default: "" },
    formId: { type: mongoose.Schema.Types.ObjectId, ref: "PrescreenForm", required: true, index: true },
    answers: { type: mongoose.Schema.Types.Mixed, required: true },
    /** Client-reported time from form open to submit (milliseconds); optional */
    durationMs: { type: Number, default: null },
    submittedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

prescreenSubmissionSchema.index({ formId: 1, submittedAt: -1 });
prescreenSubmissionSchema.index({ userId: 1, formId: 1 });
prescreenSubmissionSchema.index({ respondentProfileId: 1, formId: 1 });

export const PrescreenSubmission = mongoose.model("PrescreenSubmission", prescreenSubmissionSchema);
