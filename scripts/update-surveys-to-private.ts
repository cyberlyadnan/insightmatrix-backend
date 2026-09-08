/**
 * Update all existing surveys to internal/private audience.
 * Usage: npx tsx scripts/update-surveys-to-private.ts
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { env } from "../src/config/env";
import { PanelSurvey } from "../src/models/PanelSurvey";

dotenv.config();

async function main() {
  await mongoose.connect(env.MONGO_URI);

  const result = await PanelSurvey.updateMany(
    {},
    { $set: { surveyAudience: "internal" } }
  );

  console.log(`Successfully updated ${result.modifiedCount} survey(s) to internal/private.`);
  
  const counts = await PanelSurvey.aggregate([
    { $group: { _id: "$surveyAudience", count: { $sum: 1 } } }
  ]);
  console.log("Current audience distribution:", counts);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
