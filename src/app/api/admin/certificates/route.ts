import { db, tables } from "@/lib/server/db";
import { conferenceFromQuery, fail, handle, json } from "@/lib/server/http";
import { getAdmin } from "@/lib/server/session";

export interface CertificateRecord {
  paymentId: string;
  paperId: string | null;
  name: string | null;
  affiliation: string | null;
  paperTitle: string | null;
  type: string | null;
  certificateNo: string | null;
  times: number;
  firstAt: string;
  lastAt: string;
}

/** Everyone who has generated a certificate for one conference (?conference=<id>), one row per payment ID, most recent first. */
export const GET = handle(async (req) => {
  if (!(await getAdmin())) return fail("Admins only.", 401);
  const conference = conferenceFromQuery(req);
  if (!conference) return fail("Unknown conference.");
  const { data, error } = await db()
    .from(tables().certificateLog)
    .select("*")
    .eq("conference_id", conference.id)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01")
      return fail("The certificate log table does not exist yet. Run supabase/002_certificates.sql in the Supabase SQL editor.", 503);
    throw error;
  }

  const byPayment = new Map<string, CertificateRecord>();
  for (const row of data ?? []) {
    const existing = byPayment.get(row.payment_id);
    if (existing) {
      // Rows arrive newest first, so later rows only push the first-generated time back.
      existing.times++;
      existing.firstAt = row.created_at;
      continue;
    }
    byPayment.set(row.payment_id, {
      paymentId: row.payment_id,
      paperId: row.paper_id,
      name: row.name,
      affiliation: row.affiliation,
      paperTitle: row.paper_title,
      type: row.certificate_type,
      certificateNo: row.certificate_no,
      times: 1,
      firstAt: row.created_at,
      lastAt: row.created_at,
    });
  }
  return json({ certificates: [...byPayment.values()] });
});
