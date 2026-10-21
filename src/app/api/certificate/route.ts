import { z } from "zod";
import { conferenceIds, getConference } from "@config/conferences";
import { certificateNumber, type CertificateType } from "@/components/Certificate";
import { db, tables } from "@/lib/server/db";
import { fail, handle, json, parseBody } from "@/lib/server/http";
import { allow, clientKey } from "@/lib/server/rate-limit";

const Body = z.object({ conferenceId: z.enum(conferenceIds), paymentId: z.string().trim().min(1).max(100) });

export interface CertificateData {
  paperId: string;
  name: string;
  affiliation: string;
  paperTitle: string;
  type: CertificateType;
}

/** Certificate details for one payment ID. The payment ID is the only key; nothing else is listed. */
export const POST = handle(async (req) => {
  if (!allow(clientKey(req, "certificate"), 20)) return fail("Too many attempts. Try again in 15 minutes.", 429);
  const body = await parseBody(req, Body);
  if (!body) return fail("Enter your payment ID.");
  const conference = getConference(body.conferenceId)!;
  if (!conference.certificates) return fail(`Certificates for ${conference.name} are not available yet.`, 404);

  // select("*") so this keeps working before supabase/002_certificates.sql adds the certificate columns.
  const { data: payment, error } = await db().from(tables().payments).select("*").eq("payment_id", body.paymentId.toUpperCase()).eq("conference_id", conference.id).maybeSingle();
  if (error) throw error;
  if (!payment) return fail(`Payment ID not found for ${conference.name}.`, 404);
  if (!payment.author_name) return fail("No author name is on file for this payment. Please contact the organisers.", 422);

  let paperTitle: string | null = payment.paper_title ?? null;
  if (!paperTitle) {
    const { data: latest } = await db()
      .from(tables().submissions)
      .select("title")
      .eq("conference_id", conference.id)
      .eq("paper_id", payment.paper_id)
      .not("title", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    paperTitle = latest?.title ?? null;
  }
  if (!paperTitle) return fail("No paper title is on file for this payment. Please contact the organisers.", 422);

  const types: CertificateType[] = ["presentation", "best", "doctoral"];
  const type: CertificateType = types.includes(payment.certificate_type) ? payment.certificate_type : "presentation";
  const data: CertificateData = { paperId: payment.paper_id, name: payment.author_name, affiliation: payment.affiliation ?? "", paperTitle, type };
  await logGeneration(conference.id, payment.payment_id, data);
  return json(data);
});

/** Records who generated a certificate. A logging failure never blocks the certificate itself. */
async function logGeneration(conferenceId: string, paymentId: string, c: CertificateData) {
  const { error } = await db().from(tables().certificateLog).insert({
    conference_id: conferenceId,
    payment_id: paymentId,
    paper_id: c.paperId,
    name: c.name,
    affiliation: c.affiliation || null,
    paper_title: c.paperTitle,
    certificate_type: c.type,
    certificate_no: certificateNumber(c.type, c.paperId),
  });
  if (error) console.error("certificate log failed", error.message);
}
