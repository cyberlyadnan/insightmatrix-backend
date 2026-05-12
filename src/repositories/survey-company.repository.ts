import type { FilterQuery } from "mongoose";
import { SurveyCompany } from '../models/SurveyCompany';

export type SurveyCompanyFilter = FilterQuery<typeof SurveyCompany>;

export const surveyCompanyRepository = {
  create: (payload: Record<string, unknown>) => SurveyCompany.create(payload),
  findById: (id: string) => SurveyCompany.findById(id),
  findOneByCode: (code: string, excludeId?: string) =>
    SurveyCompany.findOne({
      companyCode: code.toUpperCase(),
      ...(excludeId ? { _id: { $ne: excludeId } } : {})
    }),
  updateById: (id: string, payload: Record<string, unknown>) =>
    SurveyCompany.findByIdAndUpdate(id, payload, { new: true, runValidators: true }),
  deleteById: (id: string) => SurveyCompany.findByIdAndDelete(id),
  count: (filter: SurveyCompanyFilter) => SurveyCompany.countDocuments(filter),
  findPaged: (
    filter: SurveyCompanyFilter,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number
  ) => SurveyCompany.find(filter).sort(sort).skip(skip).limit(limit)
};
