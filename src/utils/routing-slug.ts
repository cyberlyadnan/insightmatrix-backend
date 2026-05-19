import { tokenGeneratorService } from "../services/token/token-generator.service";

/** Compact public allocation key (e.g. ALC7X9K2P4) for /vendor/start/:slug?toid=... */
export async function generateUniqueRoutingSlug(): Promise<string> {
  return tokenGeneratorService.generateUniqueAllocationSlug();
}
