import { Resend } from "resend";

// Default sender works with zero domain setup on the Resend free tier.
const DEFAULT_FROM = "onboarding@resend.dev";

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
};

// Sends an email through Resend. No-ops and logs when RESEND_API_KEY is unset so
// local dev without a key never crashes. The client is built lazily so an absent
// key never throws at import time.
export async function sendEmail({ to, subject, html }: SendEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`email skipped (no RESEND_API_KEY): "${subject}" to ${to}`);
    return { skipped: true as const };
  }
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;
  const resend = new Resend(apiKey);
  return resend.emails.send({ from, to, subject, html });
}
