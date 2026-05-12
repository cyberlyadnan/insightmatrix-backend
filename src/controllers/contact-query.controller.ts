import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/ApiResponse';
import { contactQueryService } from '../services/contact-query.service';
import { toContactQueryDto } from '../utils/contact-query.dto';
import { CONTACT_QUERY_SUBJECTS } from '../models/ContactQuery';

export const submitContactQuery = asyncHandler(async (req, res) => {
  const created = await contactQueryService.create({
    ...req.body,
    source: "contact_page",
    metadata: {
      ip: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null
    }
  });
  sendResponse(res, { statusCode: 201, message: "Query submitted", data: toContactQueryDto(created) });
});

export const listContactQueries = asyncHandler(async (req, res) => {
  const result = await contactQueryService.list(req.validatedQuery ?? req.query);
  sendResponse(res, { data: result.items.map((item) => toContactQueryDto(item)), meta: result.meta });
});

export const updateContactQueryStatus = asyncHandler(async (req, res) => {
  const updated = await contactQueryService.updateStatus(req.params.id, req.body.status);
  sendResponse(res, { message: "Query status updated", data: toContactQueryDto(updated) });
});

export const updateContactQuery = asyncHandler(async (req, res) => {
  const updated = await contactQueryService.updateById(req.params.id, req.body);
  sendResponse(res, { message: "Query updated", data: toContactQueryDto(updated) });
});

export const deleteContactQuery = asyncHandler(async (req, res) => {
  await contactQueryService.deleteById(req.params.id);
  sendResponse(res, { message: "Query deleted" });
});

export const listContactSubjects = asyncHandler(async (_req, res) => {
  sendResponse(res, { data: CONTACT_QUERY_SUBJECTS });
});
