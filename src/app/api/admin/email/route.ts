import { z } from "zod";
import { appConfig } from "@config/app.config";
import { conferenceIds, getConference } from "@config/conferences";
import { correctionEmail } from "@/lib/email/template";
import { db, tables } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { fail, handle, json, parseBody } from "@/lib/server/http";
import { sendMail } from "@/lib/server/mailer";
import { getAdmin } from "@/lib/server/session";

const Item = z.object({
  key: z.string().max(400),
  paperId: z.string().max(50).nullable(),
  fileName: z.string().max(300),
  title: z.string().max(1000).nullable().optional(),
  authorName: z.string().max(300).nullable().optional(),
  reasons: z.array(z.string().max(1000)).min(1).max(100),
  to: z.array(z.string().email()).min(1).max(20),
});
const Body = z.object({ conferenceId: z.enum(conferenceIds), items: z.array(Item).min(1).max(500) });

/** Sends the format-correction email to each item, one at a time, and logs every attempt. */
export const POST = handle(async (req) => {
  const admin = await getAdmin();
  if (!admin) return fail("Admins only.", 401);
  const body = await parseBody(req, Body);
  if (!body) return fail("Each email needs at least one valid recipient and one reason.");
  const conference = getConference(body.conferenceId)!;

  const results: { key: string; ok: boolean; error?: string; deliveredTo?: string[] }[] = [];
  for (const [i, item] of body.items.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, appConfig.bulkEmailDelayMs));
    const content = correctionEmail(item, env.gmailFromName(), conference);
    try {
      const { deliveredTo } = await sendMail(item.to, content);
      results.push({ key: item.key, ok: true, deliveredTo });
      await log(conference.id, item.paperId, item.to, content.subject, "sent", null, admin.email);
    } catch (e) {
      const error = e instanceof Error ? e.message : "Send failed";
      results.push({ key: item.key, ok: false, error });
      await log(conference.id, item.paperId, item.to, content.subject, "failed", error, admin.email);
    }
  }
  return json({ results });
});

async function log(conferenceId: string, paperId: string | null, to: string[], subject: string, status: "sent" | "failed", error: string | null, sentBy: string) {
  const { error: dbError } = await db()
    .from(tables().emailLog)
    .insert({ conference_id: conferenceId, paper_id: paperId, to_email: to.join(", "), subject, status, error, sent_by: sentBy });
  if (dbError) console.error("email log failed", dbError);
}
