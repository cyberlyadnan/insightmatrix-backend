/**
 * Seeds panel distribution setup:
 * 1) Required locked member demographic prescreen
 * 2) Two public targeted surveys (India tech + digital habits)
 * 3) Upserts Cyberly Adnan member profile so surveys match
 *
 * Usage: npm run seed:panel-distribution
 * Optional env:
 *   SEED_MEMBER_EMAIL (default cyberlyadnan@gmail.com)
 *   SEED_MEMBER_PASSWORD (default CyberlyAdnan123!)
 *   SEED_MEMBER_NAME (default Cyberly Adnan)
 */
import "dotenv/config";
import { connectDatabase } from "../src/database/mongo";
import { User } from "../src/models/User";
import { PrescreenSubmission } from "../src/models/PrescreenSubmission";
import { ROLES } from "../src/constants/roles";
import { hashPassword } from "../src/utils/password";
import { prescreenService } from "../src/services/prescreen.service";
import { executePanelSurveySeed } from "../src/seeds/panel-surveys.seed";
import {
  parseMemberPanelProfileFromAnswers,
  surveyMatchesMemberProfile
} from "../src/utils/member-panel-profile-match";
import { PanelSurvey } from "../src/models/PanelSurvey";

const MEMBER_EMAIL = (process.env.SEED_MEMBER_EMAIL ?? "cyberlyadnan@gmail.com").toLowerCase();
const MEMBER_PASSWORD = process.env.SEED_MEMBER_PASSWORD ?? "CyberlyAdnan123!";
const MEMBER_NAME = process.env.SEED_MEMBER_NAME ?? "Cyberly Adnan";

const TARGET_SURVEY_CODES = ["IM_IN_TECH_PULSE_PUBLIC", "IM_DIGITAL_HABITS_PUBLIC"];

function buildAdnanAnswers(seedPrefix: string) {
  // Matches India tech surveys: IN, 25–34, male, full-time, technology, mobile+desktop
  return {
    [`${seedPrefix}_q_age`]: "25_34",
    [`${seedPrefix}_q_gender`]: "male",
    [`${seedPrefix}_q_country`]: "IN",
    [`${seedPrefix}_q_region`]: "Bangalore, Karnataka",
    [`${seedPrefix}_q_employment`]: "full_time",
    [`${seedPrefix}_q_industry`]: "technology",
    [`${seedPrefix}_q_education`]: "bachelors",
    [`${seedPrefix}_q_income`]: "band_3",
    [`${seedPrefix}_q_ethnicity`]: "asian",
    [`${seedPrefix}_q_devices`]: ["smartphone", "computer"],
    [`${seedPrefix}_q_frequency`]: "regular",
    [`${seedPrefix}_q_topics`]: ["technology", "b2b", "finance_topics"]
  };
}

async function upsertMember() {
  let user = await User.findOne({ email: MEMBER_EMAIL }).select("+password");
  if (!user) {
    // Fallback: find likely existing account by name/email fragment
    user = await User.findOne({
      $or: [
        { email: /cyberlyadnan/i },
        { email: /cyberly.?adnan/i },
        { fullName: /cyberly\s*adnan/i },
        { fullName: /adnan\s*ahmad/i }
      ]
    }).select("+password");
  }

  if (!user) {
    user = await User.create({
      fullName: MEMBER_NAME,
      email: MEMBER_EMAIL,
      password: await hashPassword(MEMBER_PASSWORD),
      role: ROLES.USER,
      isVerified: true,
      status: "active",
      isActive: true
    });
    console.info(`Created member: ${user.email}`);
  } else {
    user.fullName = MEMBER_NAME;
    user.role = ROLES.USER;
    user.isVerified = true;
    user.status = "active";
    user.isActive = true;
    if (MEMBER_PASSWORD) {
      user.password = await hashPassword(MEMBER_PASSWORD);
    }
    await user.save();
    console.info(`Updated member: ${user.email}`);
  }

  return user;
}

async function main() {
  await connectDatabase();

  const admin =
    (await User.findOne({ role: ROLES.ADMIN }).sort({ createdAt: 1 })) ||
    (await User.findOne({ email: process.env.SEED_ADMIN_EMAIL ?? "admin@insightmatrix.local" }));

  if (!admin) {
    throw new Error("No admin user found. Run npm run seed:admin first.");
  }

  const form = await prescreenService.seedPanelMemberPrescreen(String(admin._id));
  console.info(`Panel prescreen ready: ${form.slug} (${form.questions.length} questions, required=true)`);

  const surveySeed = await executePanelSurveySeed();
  console.info(
    `Surveys seed: ${surveySeed.inserted} inserted, ${surveySeed.updated} updated, ${surveySeed.skipped} skipped`
  );
  for (const w of surveySeed.warnings) console.warn(w);

  const member = await upsertMember();
  const seedPrefix = "pm_prof_v1";
  const answers = buildAdnanAnswers(seedPrefix);

  await PrescreenSubmission.findOneAndUpdate(
    { userId: member._id, formId: form._id },
    {
      $set: {
        answers,
        durationMs: 90_000,
        submittedAt: new Date()
      },
      $setOnInsert: { userId: member._id, formId: form._id }
    },
    { upsert: true }
  );

  await User.findByIdAndUpdate(member._id, {
    panelPrescreenCompletedAt: new Date(),
    panelPrescreenFormId: form._id
  });

  const profile = parseMemberPanelProfileFromAnswers(answers);
  const surveys = await PanelSurvey.find({
    surveyCode: { $in: TARGET_SURVEY_CODES },
    surveyStatus: "active"
  }).lean();

  console.info("\nMatch check for Cyberly Adnan profile:");
  console.info(
    `  profile → country=${profile.countryCode}, age=${profile.ageMin}-${profile.ageMax}, industry=${profile.industry}, employment=${profile.employment}`
  );

  for (const code of TARGET_SURVEY_CODES) {
    const survey = surveys.find((s) => s.surveyCode === code);
    if (!survey) {
      console.warn(`  ✗ ${code} not found (provider seed may be missing)`);
      continue;
    }
    const ok = surveyMatchesMemberProfile(survey, profile);
    console.info(`  ${ok ? "✓" : "✗"} ${code} — ${survey.surveyName}`);
  }

  console.info(`\nMember login: ${member.email} / ${MEMBER_PASSWORD}`);
  console.info("Open /dashboard/surveys after login to see matched public surveys.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
