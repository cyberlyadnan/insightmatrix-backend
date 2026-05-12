import type { FilterQuery } from "mongoose";
import { PanelSurvey } from '../models/PanelSurvey';

export type PanelSurveyFilter = FilterQuery<typeof PanelSurvey>;

export const panelSurveyRepository = {
  create: async (payload: Record<string, unknown>) => {
    const doc = await PanelSurvey.create(payload);
    return PanelSurvey.findById(doc._id)
      .populate("providerId", "companyName companyCode")
      .exec();
  },
  findById: (id: string) => PanelSurvey.findById(id),
  findByIdPopulated: (id: string) =>
    PanelSurvey.findById(id).populate("providerId", "companyName companyCode"),
  updateById: async (id: string, payload: Record<string, unknown>) => {
    const updated = await PanelSurvey.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true
    });
    if (!updated) return null;
    return PanelSurvey.findById(updated._id)
      .populate("providerId", "companyName companyCode")
      .exec();
  },
  deleteById: (id: string) => PanelSurvey.findByIdAndDelete(id),
  count: (filter: PanelSurveyFilter) => PanelSurvey.countDocuments(filter),
  findPaged: (
    filter: PanelSurveyFilter,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number
  ) =>
    PanelSurvey.find(filter)
      .populate("providerId", "companyName companyCode")
      .sort(sort)
      .skip(skip)
      .limit(limit)
};
