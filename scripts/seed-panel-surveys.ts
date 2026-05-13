import "dotenv/config";
import { connectDatabase } from "../src/database/mongo";
import { executePanelSurveySeed } from "../src/seeds/panel-surveys.seed";

async function main() {
  await connectDatabase();
  const r = await executePanelSurveySeed();
  console.info(
    `Panel surveys seed complete: ${r.inserted} inserted, ${r.updated} updated, ${r.skipped} skipped (${r.definitions} definitions).`
  );
  for (const w of r.warnings) console.warn(w);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
