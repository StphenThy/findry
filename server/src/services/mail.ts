import nodemailer from 'nodemailer';
import { config, isProd } from '../config';

/**
 * Outgoing mail. With SMTP_HOST set we send for real; otherwise the message is
 * printed to the server console so the flow can be exercised locally.
 */
const transport = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

export const mailConfigured = !!transport;

export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<void> {
  if (!transport) {
    if (!isProd) console.log(`\n[mail] (not configured — printing instead)\n  To: ${to}\n  Subject: ${subject}\n  ${text.replace(/\n/g, '\n  ')}\n`);
    return;
  }
  await transport.sendMail({ from: config.smtp.from, to, subject, text, html });
}
