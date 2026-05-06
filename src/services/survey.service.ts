import { ApiError } from '../utils/ApiError';
import { Survey } from '../models/Survey';
import { Response } from '../models/Response';

export const surveyService = {
  create: (payload) => Survey.create(payload),
  list: () => Survey.find().sort({ createdAt: -1 }),
  updateById: async (id, payload) => {
    const survey = await Survey.findByIdAndUpdate(id, payload, { new: true });
    if (!survey) throw new ApiError(404, "Survey not found");
    return survey;
  },
  deleteById: async (id) => {
    const survey = await Survey.findByIdAndDelete(id);
    if (!survey) throw new ApiError(404, "Survey not found");
  },
  publish: async (id) => {
    const survey = await Survey.findByIdAndUpdate(id, { status: "published" }, { new: true });
    if (!survey) throw new ApiError(404, "Survey not found");
    return survey;
  },
  analytics: async (surveyId) => {
    const totalResponses = await Response.countDocuments({ surveyId });
    return { surveyId, totalResponses };
  }
};

