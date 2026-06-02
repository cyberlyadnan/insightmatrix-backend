import { PrescreenSubmission } from "../models/PrescreenSubmission";
import { logger } from "../config/logger";

const LEGACY_USER_FORM_INDEX = "userId_1_formId_1";

/**
 * Legacy unique { userId, formId } treated all vendor rows (userId null) as one slot — only
 * one vendor could ever submit routing prescreen per form. Replace with partial uniques.
 */
export async function ensurePrescreenSubmissionIndexes(): Promise<void> {
  const collection = PrescreenSubmission.collection;

  try {
    await collection.dropIndex(LEGACY_USER_FORM_INDEX);
    logger.info(`Dropped legacy index ${LEGACY_USER_FORM_INDEX} on prescreensubmissions`);
  } catch (err) {
    const code = (err as { code?: number }).code;
    const message = err instanceof Error ? err.message : String(err);
    if (code !== 27 && !message.includes("index not found")) {
      logger.warn(`Could not drop ${LEGACY_USER_FORM_INDEX}: ${message}`);
    }
  }

  await PrescreenSubmission.syncIndexes();
  logger.info("PrescreenSubmission indexes synced");
}
