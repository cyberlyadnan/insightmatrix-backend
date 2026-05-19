/**
 * Backfill internalSessionToken + vendorRespondentToid fields on existing sessions.
 * Usage: npx tsx scripts/backfill-vendor-session-tokens.ts
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { env } from "../src/config/env";
import { VendorRespondentSession } from "../src/models/VendorRespondentSession";
import { tokenGeneratorService } from "../src/services/token/token-generator.service";

dotenv.config();

async function main() {
  await mongoose.connect(env.MONGO_URI);

  const sessions = await VendorRespondentSession.find({
    $or: [
      { internalSessionToken: { $exists: false } },
      { internalSessionToken: "" },
      { internalSessionToken: null }
    ]
  }).select("_id sessionToken vendorRespondentId vendorRespondentToid");

  let updated = 0;
  for (const doc of sessions) {
    const legacyToken = String(doc.sessionToken ?? "");
    const isCompact = legacyToken.startsWith("IMX") && legacyToken.length <= 15;
    const internalSessionToken = isCompact
      ? legacyToken
      : await tokenGeneratorService.generateUniqueInternalSessionToken();
    const vendorRespondentToid = String(
      doc.vendorRespondentToid ?? doc.vendorRespondentId ?? ""
    ).trim();

    await VendorRespondentSession.updateOne(
      { _id: doc._id },
      {
        $set: {
          internalSessionToken,
          sessionToken: internalSessionToken,
          vendorRespondentToid,
          vendorRespondentId: vendorRespondentToid,
          responseStatus: doc.status ?? "started",
          trafficType: "vendor_panel",
          respondentOwnerType: "vendor"
        }
      }
    );
    console.log(String(doc._id), "→", internalSessionToken);
    updated++;
  }

  console.log(`Updated ${updated} session(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
