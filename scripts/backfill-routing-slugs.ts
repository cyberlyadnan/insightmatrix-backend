/**
 * Backfill compact routingSlug + routingLink for allocations.
 * Usage: npx tsx scripts/backfill-routing-slugs.ts
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { env } from "../src/config/env";
import { VendorSurveyAllocation } from "../src/models/VendorSurveyAllocation";
import { tokenGeneratorService } from "../src/services/token/token-generator.service";
import { buildVendorAllocationRoutingLink } from "../src/utils/vendor-routing-link";

dotenv.config();

async function main() {
  await mongoose.connect(env.MONGO_URI);

  const allocations = await VendorSurveyAllocation.find({}).select(
    "_id allocationCode routingSlug routingLink"
  );

  let updated = 0;
  for (const doc of allocations) {
    const slug = String(doc.routingSlug ?? "");
    const needsSlug = !slug || slug.length > 15 || !slug.startsWith("ALC");
    if (!needsSlug) continue;

    const routingSlug = await tokenGeneratorService.generateUniqueAllocationSlug();
    const routingLink = buildVendorAllocationRoutingLink(routingSlug);
    await VendorSurveyAllocation.updateOne(
      { _id: doc._id },
      { $set: { routingSlug, routingLink } }
    );
    console.log(`${doc.allocationCode} → ${routingSlug}`);
    updated++;
  }

  console.log(`Updated ${updated} allocation(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
