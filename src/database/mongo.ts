import mongoose from "mongoose";
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ensurePrescreenSubmissionIndexes } from "./prescreen-submission-indexes";
import { repairDuplicateRequiredPanelFlags } from "../services/panel-prescreen.service";

export const connectDatabase = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    logger.info("MongoDB connected");
    await ensurePrescreenSubmissionIndexes();
    await repairDuplicateRequiredPanelFlags();
  } catch (error) {
    const dbError = error as Error;
    logger.error(`Mongo connection error: ${dbError.message}`);
    throw error;
  }
};

