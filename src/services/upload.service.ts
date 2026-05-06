import multer from "multer";
import { cloudinary } from '../config/cloudinary';

const storage = multer.memoryStorage();
export const upload = multer({ storage });

export const uploadToCloudinary = async (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });
    stream.end(buffer);
  });

