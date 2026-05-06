import { mailTransporter } from '../config/mailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

export const sendEmail = async ({ to, subject, html }) => {
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    logger.warn("SMTP not fully configured; email not sent.");
    return;
  }

  await mailTransporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html
  });
};

