import { z } from "zod";
import { conferenceIds } from "@config/conferences";
import { db, tables } from "@/lib/server/db";
import { conferenceFromQuery, fail, handle, json, parseBody } from "@/lib/server/http";
import { getAdmin } from "@/lib/server/session";

const Item = z.object({
  kind: z.enum(["format", "camera-ready"]),
  fileName: z.string().min(1).max(300),
  paperId: z.string().max(50).nullable().optional(),
  status: z.string().min(1).max(50),
  numPages: z.number().int().nonnegative().nullable().optional(),
  reasons: z.array(z.string().max(2000)).max(100).default([]),
  title: z.string().max(1000).nullable().optional(),
  authors: z.array(z.string().max(300)).max(100).default([]),
  emails: z.array(z.string().max(300)).max(100).default([]),
  details: z.record(z.string(), z.unknown()).default({}),
});
const Body = z.object({
  conferenceId: z.enum(conferenceIds),
  items: z.array(Item).min(1).max(1000),
  source: z.enum(["admin", "admin-bulk"]).optional(),
});

/** Stores check results run by admins, under the selected conference. */
export const POST = handle(async (req) => {
  if (!(await getAdmin())) return fail("Admins only.", 401);
  const body = await parseBody(req, Body);
  if (!body) return fail("Invalid submission data.");

  const rows = body.items.map((it) => ({
    conference_id: body.conferenceId,
    paper_id: it.paperId ?? null,
    payment_id: null,
    source: body.source ?? "admin",
    kind: it.kind,
    file_name: it.fileName,
    status: it.status,
    num_pages: it.numPages ?? null,
    reasons: it.reasons,
    title: it.title ?? null,
    authors: it.authors,
    emails: it.emails,
    details: it.details,
  }));
  const { error } = await db().from(tables().submissions).insert(rows);
  if (error) throw error;
  return json({ saved: rows.length });
});

/** Most recent results for one conference (?conference=<id>). */
export const GET = handle(async (req) => {
  if (!(await getAdmin())) return fail("Admins only.", 401);
  const conference = conferenceFromQuery(req);
  if (!conference) return fail("Unknown conference.");
  const { data, error } = await db()
    .from(tables().submissions)
    .select("*")
    .eq("conference_id", conference.id)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return json({ submissions: data });
});
