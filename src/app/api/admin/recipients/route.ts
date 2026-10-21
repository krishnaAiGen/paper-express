import { z } from "zod";
import { conferenceIds } from "@config/conferences";
import { db, tables } from "@/lib/server/db";
import { fail, handle, json, parseBody } from "@/lib/server/http";
import { getAdmin } from "@/lib/server/session";

const Body = z.object({ conferenceId: z.enum(conferenceIds), paperIds: z.array(z.string().max(50)).max(2000) });

/** Author contact details on file (from payments) for each paper ID. */
export const POST = handle(async (req) => {
  if (!(await getAdmin())) return fail("Admins only.", 401);
  const body = await parseBody(req, Body);
  if (!body) return fail("Invalid request.");
  if (body.paperIds.length === 0) return json({ recipients: {} });

  const { data, error } = await db().from(tables().payments).select("paper_id, author_name, author_email").eq("conference_id", body.conferenceId).in("paper_id", body.paperIds);
  if (error) throw error;
  const recipients: Record<string, { name: string | null; emails: string[] }> = {};
  for (const row of data ?? []) {
    const r = (recipients[row.paper_id] ??= { name: row.author_name, emails: [] });
    if (row.author_email && !r.emails.includes(row.author_email)) r.emails.push(row.author_email);
  }
  return json({ recipients });
});
