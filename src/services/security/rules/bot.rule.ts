import { botDetectionService } from "../bot-detection.service";
import type { SecurityRule } from "../security.types";

export const botDetectionRule: SecurityRule = {
  name: "bot",
  async run(ctx) {
    const result = botDetectionService.analyze(ctx);
    if (!result.allowed || result.decision === "block") return result;
    return null;
  }
};
