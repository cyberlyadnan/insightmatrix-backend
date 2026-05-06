import { sendResponse } from '../utils/ApiResponse';

export const healthCheck = (req, res) => {
  sendResponse(res, {
    message: "InsightMatrix backend is healthy",
    data: { uptime: process.uptime(), timestamp: new Date().toISOString() }
  });
};

