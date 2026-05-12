import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/ApiResponse';
import { prescreenService } from '../services/prescreen.service';
import { toPrescreenCategoryDto, toPrescreenDto } from '../utils/prescreen.dto';

export const listPrescreens = asyncHandler(async (req, res) => {
  const result = await prescreenService.list(req.validatedQuery ?? req.query);
  sendResponse(res, {
    data: result.items.map((item) => toPrescreenDto(item)),
    meta: result.meta
  });
});

export const getPrescreenById = asyncHandler(async (req, res) => {
  const form = await prescreenService.getById(req.params.id);
  sendResponse(res, { data: toPrescreenDto(form) });
});

export const createPrescreen = asyncHandler(async (req, res) => {
  const form = await prescreenService.create({ ...req.body, createdBy: req.user._id });
  sendResponse(res, { statusCode: 201, message: "Prescreen created", data: toPrescreenDto(form) });
});

export const updatePrescreen = asyncHandler(async (req, res) => {
  const form = await prescreenService.updateById(req.params.id, req.body);
  sendResponse(res, { message: "Prescreen updated", data: toPrescreenDto(form) });
});

export const deletePrescreen = asyncHandler(async (req, res) => {
  await prescreenService.deleteById(req.params.id);
  sendResponse(res, { message: "Prescreen deleted" });
});

export const publishPrescreen = asyncHandler(async (req, res) => {
  const form = await prescreenService.setStatus(req.params.id, "published");
  sendResponse(res, { message: "Prescreen published", data: toPrescreenDto(form) });
});

export const unpublishPrescreen = asyncHandler(async (req, res) => {
  const form = await prescreenService.setStatus(req.params.id, "draft");
  sendResponse(res, { message: "Prescreen moved to draft", data: toPrescreenDto(form) });
});

export const duplicatePrescreen = asyncHandler(async (req, res) => {
  const form = await prescreenService.duplicate(req.params.id, String(req.user._id));
  sendResponse(res, { statusCode: 201, message: "Prescreen duplicated", data: toPrescreenDto(form) });
});

export const reorderPrescreenQuestions = asyncHandler(async (req, res) => {
  const form = await prescreenService.reorderQuestions(req.params.id, req.body.questionIds);
  sendResponse(res, { message: "Questions reordered", data: toPrescreenDto(form) });
});

export const listPrescreenCategories = asyncHandler(async (_req, res) => {
  const categories = await prescreenService.listCategories();
  sendResponse(res, { data: categories.map((item) => toPrescreenCategoryDto(item)) });
});

export const createPrescreenCategory = asyncHandler(async (req, res) => {
  const category = await prescreenService.createCategory(req.body);
  sendResponse(res, { statusCode: 201, message: "Category created", data: toPrescreenCategoryDto(category) });
});

export const seedDefaultPrescreens = asyncHandler(async (req, res) => {
  const forms = await prescreenService.seedDefaultPrescreens(String(req.user._id));
  sendResponse(res, {
    statusCode: 201,
    message: "Default prescreens seeded",
    data: forms.map((item) => toPrescreenDto(item))
  });
});
