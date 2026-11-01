import "dotenv/config";
import mongoose from "mongoose";
import { hashPassword } from "../src/utils/password";

async function run() {
  await mongoose.connect(process.env.MONGO_URI!);
  const passwordHash = await hashPassword("Admin123!");

  for (const dbName of ["test", "insightmatrix"]) {
    const db = mongoose.connection.getClient().db(dbName);
    const usersCol = db.collection("users");

    const emails = [
      "admin@insightmatrix.online",
      "admin@insightmatrix.com",
      "admin@insightmatrix.local"
    ];

    for (const email of emails) {
      const res = await usersCol.updateOne(
        { email },
        {
          $set: {
            fullName: "System Administrator",
            email,
            password: passwordHash,
            role: "admin",
            isVerified: true,
            status: "active",
            isActive: true,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date(),
            deletionRequested: false,
            panelPoints: 0,
            panelLifetimePoints: 0
          }
        },
        { upsert: true }
      );
      console.log(`[${dbName}] Upserted ${email}: matched=${res.matchedCount}, upserted=${res.upsertedCount}`);
    }
  }

  await mongoose.disconnect();
  console.log("Done upserting admins across databases.");
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

