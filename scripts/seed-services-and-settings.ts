import "dotenv/config";
import { connectDatabase } from "../src/database/mongo";
import { executeServicesAndSettingsSeed } from "../src/seeds/services-and-settings.seed";

async function main() {
  await connectDatabase();
  const r = await executeServicesAndSettingsSeed();
  console.info(
    `Services & Settings seed complete: ${r.servicesInserted} inserted, ${r.servicesUpdated} updated, total ${r.totalServices} services. Site settings status: ${r.settingsStatus}.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
