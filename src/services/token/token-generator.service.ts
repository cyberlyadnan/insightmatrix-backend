import { VendorSurveyAllocation } from "../../models/VendorSurveyAllocation";
import { VendorRespondentSession } from "../../models/VendorRespondentSession";
import {
  TOKEN_BODY_LENGTH,
  TOKEN_PREFIX_ALLOCATION,
  TOKEN_PREFIX_INTERNAL_SESSION
} from "../../constants/token";
import { generateSecureAlphanumeric } from "../../utils/secure-token";

function buildToken(prefix: string, bodyLength = TOKEN_BODY_LENGTH): string {
  return `${prefix}${generateSecureAlphanumeric(bodyLength)}`;
}

/**
 * Compact, URL-safe, uppercase alphanumeric tokens (e.g. ALC7X9K2P4, IMX8Q2M7P5).
 */
export const tokenGeneratorService = {
  generateAllocationSlug(): string {
    return buildToken(TOKEN_PREFIX_ALLOCATION);
  },

  generateInternalSessionToken(): string {
    return buildToken(TOKEN_PREFIX_INTERNAL_SESSION);
  },

  async generateUniqueAllocationSlug(): Promise<string> {
    for (let attempt = 0; attempt < 16; attempt++) {
      const slug = this.generateAllocationSlug();
      const exists = await VendorSurveyAllocation.exists({ routingSlug: slug });
      if (!exists) return slug;
    }
    throw new Error("Failed to generate unique allocation routing slug");
  },

  async generateUniqueInternalSessionToken(): Promise<string> {
    for (let attempt = 0; attempt < 16; attempt++) {
      const token = this.generateInternalSessionToken();
      const exists = await VendorRespondentSession.exists({
        $or: [{ sessionToken: token }, { internalSessionToken: token }]
      });
      if (!exists) return token;
    }
    throw new Error("Failed to generate unique internal session token");
  }
};
