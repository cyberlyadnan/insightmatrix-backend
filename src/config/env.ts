import dotenv from "dotenv";
import Joi from "joi";

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
  PORT: Joi.number().default(5000),
  API_PREFIX: Joi.string().default("/api/v1"),
  /** Absolute origin used in verification emails (direct backend URL) */
  API_PUBLIC_URL: Joi.string().uri().default("http://localhost:5000"),
  MONGO_URI: Joi.string().required(),
  CLIENT_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("7d"),
  /** Optional separate secrets for B2B vendor JWTs (fallback to JWT_* when empty) */
  VENDOR_JWT_ACCESS_SECRET: Joi.string().allow(""),
  VENDOR_JWT_REFRESH_SECRET: Joi.string().allow(""),
  JWT_RESET_PASSWORD_EXPIRES_MIN: Joi.number().default(30),
  SKIP_EMAIL_VERIFICATION: Joi.string().valid("true", "false").default("false"),
  COOKIE_DOMAIN: Joi.string().allow(""),
  COOKIE_SECURE: Joi.boolean().default(false),
  COOKIE_SAME_SITE: Joi.string().valid("lax", "strict", "none").default("lax"),
  CLOUDINARY_CLOUD_NAME: Joi.string().allow(""),
  CLOUDINARY_API_KEY: Joi.string().allow(""),
  CLOUDINARY_API_SECRET: Joi.string().allow(""),
  CLOUDINARY_FOLDER: Joi.string().default("insightmatrix"),
  SMTP_HOST: Joi.string().allow(""),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().allow(""),
  SMTP_PASS: Joi.string().allow(""),
  SMTP_FROM: Joi.string().allow(""),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: Joi.number().default(300),
  /** Shown on PDF invoices (optional) */
  INVOICE_PLATFORM_NAME: Joi.string().max(200).allow(""),
  INVOICE_PLATFORM_ADDRESS: Joi.string().max(2000).allow("")
}).unknown();

const { value, error } = schema.validate(process.env);

if (error) {
  throw new Error(`Environment validation failed: ${error.message}`);
}

export const env = {
  ...value,
  skipEmailVerification: value.SKIP_EMAIL_VERIFICATION === "true"
};

