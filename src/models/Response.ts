import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { _id: false }
);

const responseSchema = new mongoose.Schema(
  {
    surveyId: { type: mongoose.Schema.Types.ObjectId, ref: "Survey", required: true, index: true },
    respondentEmail: { type: String, required: true, lowercase: true },
    answers: [answerSchema]
  },
  { timestamps: true }
);

export const Response = mongoose.model("Response", responseSchema);

