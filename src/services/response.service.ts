import { Response } from '../models/Response';

export const responseService = {
  submit: (payload) => Response.create(payload),
  listBySurvey: (surveyId) => Response.find({ surveyId }).sort({ createdAt: -1 }),
  exportBySurvey: async (surveyId) => {
    const rows = await Response.find({ surveyId }).lean();
    return rows.map((row) => ({
      id: row._id.toString(),
      respondentEmail: row.respondentEmail,
      submittedAt: row.createdAt,
      answers: JSON.stringify(row.answers)
    }));
  }
};

