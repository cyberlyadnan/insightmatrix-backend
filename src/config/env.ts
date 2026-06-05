import dotenv from "dotenv";
import Joi from "joi";
import fs from "fs";

dotenv.config();
if (process.env.NODE_ENV === "production" && fs.existsSync(".env.production")) {
  dotenv.config({ path: ".env.production", override: true });
}

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
  INVOICE_PLATFORM_ADDRESS: Joi.string().max(2000).allow(""),
  /** Gateway security layer */
  SECURITY_GATEWAY_ENABLED: Joi.boolean().default(false),
  SECURITY_CAPTCHA_ENABLED: Joi.boolean().default(false),
  RECAPTCHA_SITE_KEY: Joi.string().allow(""),
  RECAPTCHA_SECRET_KEY: Joi.string().allow(""),
  RECAPTCHA_VERSION: Joi.string().valid("v2", "v3").default("v3"),
  RECAPTCHA_MIN_SCORE: Joi.number().min(0).max(1).default(0.5),
  SECURITY_UNIQUE_IP_ENABLED: Joi.boolean().default(false),
  SECURITY_UNIQUE_IP_WINDOW_MINUTES: Joi.number().integer().min(1).max(10080).default(60),
  SECURITY_UNIQUE_IP_MAX_PER_SURVEY: Joi.number().integer().min(1).max(1000).default(3),
  SECURITY_UNIQUE_IP_MAX_PER_ALLOCATION: Joi.number().integer().min(1).max(1000).default(2),
  SECURITY_UNIQUE_IP_BLOCK: Joi.boolean().default(false),
  SECURITY_GEO_ENABLED: Joi.boolean().default(false),
  SECURITY_BOT_ENABLED: Joi.boolean().default(false),
  SECURITY_BOT_BLOCK: Joi.boolean().default(false),
  GEOIP_API_URL: Joi.string().uri().default("http://ip-api.com/json")
}).unknown();

const { value, error } = schema.validate(process.env);

if (error) {
  throw new Error(`Environment validation failed: ${error.message}`);
}

export const env = {
  ...value,
  skipEmailVerification: value.SKIP_EMAIL_VERIFICATION === "true"
};

