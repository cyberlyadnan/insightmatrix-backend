import fs from "node:fs";
import path from "node:path";
import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { panelBookService } from "../services/panel-book.service";
import {
  PANEL_BOOK_ABSOLUTE_PATH,
  getPanelBookPdfStat,
  panelBookPdfExists,
  uploadedFilePath
} from "../services/panel-book-upload.service";
import { toPanelBookLeadDto } from "../utils/panel-book.dto";

export const submitPanelBookLead = asyncHandler(async (req, res) => {
  const created = await panelBookService.createLead({
    ...req.body,
    metadata: {
      ip: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null
    }
  });
  sendResponse(res, {
    statusCode: 201,
    message: "Thank you. Your download is ready below.",
    data: { id: String(created._id), downloadAvailable: panelBookPdfExists() }
  });
});

export const downloadPanelBookPdf = asyncHandler(async (_req, res) => {
  if (!panelBookPdfExists()) {
    throw new ApiError(404, "Panel Book is not available yet. Please try again later.");
  }
  const meta = await panelBookService.getAssetMeta();
  const downloadName =
    meta?.originalFileName && meta.originalFileName.endsWith(".pdf")
      ? meta.originalFileName
      : "InsightMatrix-Panel-Book.pdf";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${downloadName.replace(/"/g, "")}"`);
  const stream = fs.createReadStream(PANEL_BOOK_ABSOLUTE_PATH);
  stream.on("error", () => {
    if (!res.headersSent) res.status(500).end();
  });
  stream.pipe(res);
});

export const listPanelBookLeads = asyncHandler(async (req, res) => {
  const result = await panelBookService.listLeads(req.validatedQuery ?? req.query);
  sendResponse(res, {
    data: result.items.map((item) => toPanelBookLeadDto(item)),
    meta: result.meta
  });
});

export const getPanelBookAssetAdmin = asyncHandler(async (_req, res) => {
  const meta = await panelBookService.getAssetMeta();
  const stat = getPanelBookPdfStat();
  sendResponse(res, {
    data: {
      hasFile: panelBookPdfExists(),
      fileSizeBytes: stat?.size ?? 0,
      originalFileName: meta?.originalFileName ?? null,
      updatedAt: meta?.updatedAt ? new Date(meta.updatedAt).toISOString() : null
    }
  });
});

export const uploadPanelBookPdf = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) throw new ApiError(400, "PDF file is required");
  const abs = uploadedFilePath(file);
  if (path.resolve(abs) !== path.resolve(PANEL_BOOK_ABSOLUTE_PATH)) {
    throw new ApiError(500, "Unexpected upload path");
  }
  const st = fs.statSync(abs);
  const saved = await panelBookService.upsertAssetMeta(
    file.originalname || "InsightMatrix-Panel-Book.pdf",
    st.size,
    "application/pdf"
  );
  sendResponse(res, {
    message: "Panel Book PDF updated",
    data: {
      hasFile: true,
      fileSizeBytes: st.size,
      originalFileName: saved?.originalFileName ?? file.originalname,
      updatedAt: saved?.updatedAt ? new Date(saved.updatedAt).toISOString() : new Date().toISOString()
    }
  });
});
