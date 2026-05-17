/**
 * Reset a vendor portal password (local QA / recovery).
 * Usage: npx tsx scripts/reset-vendor-password.ts <vendorId|email> <newPassword>
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { env } from "../src/config/env";
import { hashPassword } from "../src/utils/password";
import { vendorRepository } from "../src/repositories/vendor.repository";

dotenv.config();

async function main() {
  const [, , idOrEmail, newPassword] = process.argv;
  if (!idOrEmail || !newPassword || newPassword.length < 8) {
    console.error("Usage: npx tsx scripts/reset-vendor-password.ts <vendorId|email> <newPassword>");
    process.exit(1);
  }

  await mongoose.connect(env.MONGO_URI);

  const isObjectId = /^[a-f0-9]{24}$/i.test(idOrEmail);
  const vendor = isObjectId
    ? await vendorRepository.findById(idOrEmail)
    : await vendorRepository.findByEmail(idOrEmail.trim().toLowerCase());

  if (!vendor) {
    console.error("Vendor not found");
    process.exit(1);
  }

  const passwordHash = await hashPassword(newPassword.trim());
  await vendorRepository.setPasswordHash(String(vendor._id), passwordHash);

  console.log("Password reset for:", vendor.email, `(${vendor.vendorCode})`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
