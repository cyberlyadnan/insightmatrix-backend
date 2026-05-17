/**
 * Seed a demo B2B vendor account.
 * Usage: npx tsx scripts/seed-vendor.ts
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { env } from "../src/config/env";
import { vendorService } from "../src/services/vendor.service";

dotenv.config();

async function main() {
  await mongoose.connect(env.MONGO_URI);

  const email = process.env.SEED_VENDOR_EMAIL ?? "vendor.demo@insightmatrix.local";
  const password = process.env.SEED_VENDOR_PASSWORD ?? "VendorDemo123!";

  try {
    const doc = await vendorService.create({
      companyName: "Demo Subpanel Vendor",
      contactPerson: "Demo Contact",
      email,
      password,
      website: "https://example.com",
      callbackUrls: {
        complete: "https://example.com/callbacks/complete",
        terminate: "https://example.com/callbacks/terminate",
        quota_full: "https://example.com/callbacks/quota-full",
        quality_reject: "https://example.com/callbacks/quality"
      },
      notes: "Seeded vendor for local QA"
    });
    console.log("Vendor created:", doc.vendorCode, email);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("already exists")) {
      console.log("Vendor already exists for", email);
    } else {
      throw e;
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
