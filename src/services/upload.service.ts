import multer from "multer";
import { cloudinary } from '../config/cloudinary';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new ApiError(400, "Only image uploads are allowed"));
      return;
    }
    cb(null, true);
  }
});

export const uploadToCloudinary = async (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });
    stream.end(buffer);
  });

function isPlaceholder(value: string | undefined) {
  return !value || value.startsWith("your_");
}

export function hasValidCloudinaryConfig() {
  return !isPlaceholder(env.CLOUDINARY_CLOUD_NAME) && !isPlaceholder(env.CLOUDINARY_API_KEY) && !isPlaceholder(env.CLOUDINARY_API_SECRET);
}

export function bufferToDataUrl(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

