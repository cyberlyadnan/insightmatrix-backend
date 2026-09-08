import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { siteSettingsService } from "../services/site-settings.service";

export const getSiteSettings = asyncHandler(async (_req, res) => {
  const doc = await siteSettingsService.getSettings();
  sendResponse(res, { data: doc });
});

export const updateSiteSettings = asyncHandler(async (req, res) => {
  const doc = await siteSettingsService.updateSettings(req.body);
  sendResponse(res, {
    message: "Site profile settings updated successfully",
    data: doc,
  });
});
