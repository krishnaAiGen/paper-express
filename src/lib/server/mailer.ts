import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { appEnv } from "@config/app.config";
import type { EmailContent } from "@/lib/email/template";
import { env } from "./env";

let transport: Transporter | null = null;

function mailer(): Transporter {
  transport ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: env.gmailAddress(), pass: env.gmailAppPassword() },
  });
  return transport;
}

/**
 * Sends one email. With APP_ENV=test every message goes to the sender's own
 * address instead, so testing never emails real authors.
 */
export async function sendMail(to: string[], content: EmailContent): Promise<{ deliveredTo: string[] }> {
  const testMode = appEnv() === "test";
  const deliveredTo = testMode ? [env.gmailAddress()] : to;
  await mailer().sendMail({
    from: { name: env.gmailFromName(), address: env.gmailAddress() },
    to: deliveredTo,
    subject: testMode ? `[TEST → ${to.join(", ")}] ${content.subject}` : content.subject,
    text: content.text,
    html: content.html,
  });
  return { deliveredTo };
}
