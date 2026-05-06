import "dotenv/config";
import { connectDatabase } from "../src/database/mongo";
import { User } from "../src/models/User";
import { ROLES } from "../src/constants/roles";
import { hashPassword } from "../src/utils/password";

async function main() {
  await connectDatabase();

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@insightmatrix.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";

  const existing = await User.findOne({ email });
  if (existing) {
    console.info(`Admin seed skipped — ${email} already exists.`);
    process.exit(0);
  }

  await User.create({
    fullName: "System Administrator",
    email,
    password: await hashPassword(password),
    role: ROLES.ADMIN,
    isVerified: true,
    status: "active"
  });

  console.info(`Seeded admin user: ${email} / ${password}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
