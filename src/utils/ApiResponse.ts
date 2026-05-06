import { Response } from "express";

type ApiResponsePayload = {
  statusCode?: number;
  message?: string;
  data?: unknown;
  meta?: unknown;
};

export const sendResponse = (
  res: Response,
  { statusCode = 200, message = "Success", data = null, meta = null }: ApiResponsePayload
) =>
  res.status(statusCode).json({
    success: statusCode < 400,
    message,
    data,
    meta
  });

