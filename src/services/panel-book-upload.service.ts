import fs from "node:fs";
import path from "node:path";
import type { Express } from "express";
import multer from "multer";
import { ApiError } from "../utils/ApiError";

const PANEL_BOOK_DIR = path.join(process.cwd(), "uploads", "panel-book");
export const PANEL_BOOK_PDF_FILENAME = "current.pdf";
export const PANEL_BOOK_ABSOLUTE_PATH = path.join(PANEL_BOOK_DIR, PANEL_BOOK_PDF_FILENAME);

function ensureDir() {
  fs.mkdirSync(PANEL_BOOK_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      ensureDir();
      cb(null, PANEL_BOOK_DIR);
    } catch (e) {
      cb(e as Error, PANEL_BOOK_DIR);
    }
  },
  filename: (_req, _file, cb) => {
    cb(null, PANEL_BOOK_PDF_FILENAME);
  }
});

export const panelBookPdfUpload = multer({
  storage,
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");
    if (!ok) {
      cb(new ApiError(400, "Only PDF files are allowed"));
      return;
    }
    cb(null, true);
  }
});

export function panelBookPdfExists(): boolean {
  try {
    return fs.existsSync(PANEL_BOOK_ABSOLUTE_PATH);
  } catch {
    return false;
  }
}

export function getPanelBookPdfStat(): { size: number } | null {
  if (!panelBookPdfExists()) return null;
  try {
    const st = fs.statSync(PANEL_BOOK_ABSOLUTE_PATH);
    return { size: st.size };
  } catch {
    return null;
  }
}

export function removePanelBookPdf(): void {
  try {
    if (fs.existsSync(PANEL_BOOK_ABSOLUTE_PATH)) fs.unlinkSync(PANEL_BOOK_ABSOLUTE_PATH);
  } catch {
    /* ignore */
  }
}

export function uploadedFilePath(file: Express.Multer.File): string {
  return file.path;
}
