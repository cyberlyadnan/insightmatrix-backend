import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { getSmtpHealth, sendTestEmail } from "../services/email.service";

export const getEmailStatus = asyncHandler(async (_req, res) => {
  const status = await getSmtpHealth();
  sendResponse(res, {
    message: status.verified ? "SMTP is connected" : "SMTP needs attention",
    data: status
  });
});

export const postTestEmail = asyncHandler(async (req, res) => {
  const to = String(req.body.to || "").trim().toLowerCase();
  const sentBy =
    typeof req.user?.email === "string"
      ? req.user.email
      : typeof req.user?.fullName === "string"
        ? req.user.fullName
        : undefined;

  const result = await sendTestEmail(to, sentBy);
  sendResponse(res, {
    message: `Test email sent to ${to}`,
    data: result
  });
});
