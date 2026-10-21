"use client";

import { useMemo, useState } from "react";
import { firstAuthorContact } from "@/lib/email/recipient";
import { correctionEmail } from "@/lib/email/template";
import { classify, paperIdFromFileName, statusLabel, unreadable, type PaperStatus } from "@/lib/validate/classify";
import { validatePaper } from "@/lib/validate/validate";
import { useConference } from "../ConferenceContext";
import { FileDrop } from "../FileDrop";
import { Badge, Banner, Card } from "../ui";
import { parsePdf } from "../usePdf";

interface Row {
  key: string;
  fileName: string;
  paperId: string | null;
  pages: number | null;
  status: PaperStatus;
  reasons: string[];
  notes: string[];
  mailable: boolean;
  title: string | null;
  authors: string[];
  pdfEmails: string[];
  authorName: string | null;
  recipients: string;
  /** Where the address came from, shown under the input. */
  recipientSource: "pdf" | "payment" | "none" | "edited";
  mail: { state: "idle" | "sending" | "sent" | "failed"; error?: string };
}

type Filter = "all" | PaperStatus;

const statusTone: Record<PaperStatus, "green" | "blue" | "red" | "slate"> = {
  accepted: "green",
  "extra-pages": "blue",
  "needs-correction": "red",
  unreadable: "slate",
};

const EMAIL_BATCH = 10;
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const splitRecipients = (s: string) => s.split(/[,;\s]+/).filter(Boolean);

/** Expands .zip files and returns every PDF inside, with its name. */
async function collectPdfs(files: File[]): Promise<{ name: string; data: Uint8Array }[]> {
  const out: { name: string; data: Uint8Array }[] = [];
  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      const { default: JSZip } = await import("jszip");
      const zip = await JSZip.loadAsync(file);
      for (const entry of Object.values(zip.files)) {
        if (entry.dir || !/\.pdf$/i.test(entry.name) || entry.name.includes("__MACOSX/")) continue;
        out.push({ name: entry.name.split("/").pop()!, data: await entry.async("uint8array") });
      }
    } else if (/\.pdf$/i.test(file.name)) {
      out.push({ name: file.name, data: new Uint8Array(await file.arrayBuffer()) });
    }
  }
  return out;
}

export function BulkTab({ senderName }: { senderName: string }) {
  const conference = useConference();
  const paperConfig = conference.paper;
  const [rows, setRows] = useState<Row[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [notice, setNotice] = useState<{ tone: "green" | "red" | "amber"; text: string } | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [preview, setPreview] = useState<Row | null>(null);

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function run(files: File[]) {
    setNotice(null);
    const pdfs = await collectPdfs(files);
    if (pdfs.length === 0) {
      setNotice({ tone: "red", text: "No PDF files found. Upload PDFs or a .zip containing PDFs." });
      return;
    }
    setRows([]);
    setFilter("all");
    setProgress({ done: 0, total: pdfs.length });

    const results: Row[] = [];
    for (const [i, pdf] of pdfs.entries()) {
      const { doc, error } = await parsePdf(pdf.name, pdf.data);
      const report = doc && !error ? validatePaper(doc, paperConfig) : null;
      const c = report ? classify(report, paperConfig) : unreadable(error ?? "Could not read the PDF.");
      const contact = report ? firstAuthorContact(report.header.authors, report.header.emails) : null;
      const row: Row = {
        key: `${i}:${pdf.name}`,
        fileName: pdf.name,
        paperId: paperIdFromFileName(pdf.name),
        pages: doc?.numPages ?? null,
        status: c.status,
        reasons: c.reasons,
        notes: c.notes,
        mailable: c.mailable,
        title: report?.header.title || null,
        authors: report?.header.authors ?? [],
        pdfEmails: report?.header.emails ?? [],
        authorName: contact?.name ?? null,
        recipients: contact?.email ?? "",
        recipientSource: contact ? "pdf" : "none",
        mail: { state: "idle" },
      };
      results.push(row);
      setRows([...results]);
      setProgress({ done: i + 1, total: pdfs.length });
    }
    setProgress(null);

    // The first author's email comes from the PDF; the payment record is only a fallback when the PDF has none.
    const ids = [...new Set(results.filter((r) => r.recipientSource === "none" && r.paperId).map((r) => r.paperId!))];
    const [recipientsRes, saveRes] = await Promise.all([
      fetch("/api/admin/recipients", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conferenceId: conference.id, paperIds: ids }) }),
      fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conferenceId: conference.id,
          source: "admin-bulk",
          items: results.map((r) => ({
            kind: "format",
            fileName: r.fileName,
            paperId: r.paperId,
            status: r.status,
            numPages: r.pages,
            reasons: r.reasons,
            title: r.title,
            authors: r.authors,
            emails: r.pdfEmails,
            details: { notes: r.notes },
          })),
        }),
      }),
    ]);
    if (recipientsRes.ok) {
      const { recipients } = (await recipientsRes.json()) as { recipients: Record<string, { name: string | null; emails: string[] }> };
      setRows((rs) =>
        rs.map((r) => {
          const onFile = r.paperId ? recipients[r.paperId] : undefined;
          if (r.recipientSource !== "none" || !onFile?.emails.length) return r;
          return { ...r, recipients: onFile.emails[0], authorName: r.authorName ?? onFile.name, recipientSource: "payment" as const };
        }),
      );
    }
    setNotice(
      saveRes.ok
        ? { tone: "green", text: `Checked ${results.length} paper(s) and saved the results.` }
        : { tone: "amber", text: `Checked ${results.length} paper(s), but saving to the database failed: ${(await saveRes.json().catch(() => ({}))).error ?? saveRes.statusText}` },
    );
  }

  async function sendEmails(targets: Row[]) {
    setConfirmBulk(false);
    for (const t of targets) update(t.key, { mail: { state: "sending" } });
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < targets.length; i += EMAIL_BATCH) {
      const batch = targets.slice(i, i + EMAIL_BATCH);
      try {
        const res = await fetch("/api/admin/email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            conferenceId: conference.id,
            items: batch.map((r) => ({
              key: r.key,
              paperId: r.paperId,
              fileName: r.fileName,
              title: r.title,
              authorName: r.authorName,
              reasons: r.reasons,
              to: splitRecipients(r.recipients),
            })),
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? res.statusText);
        for (const result of body.results as { key: string; ok: boolean; error?: string }[]) {
          update(result.key, { mail: result.ok ? { state: "sent" } : { state: "failed", error: result.error } });
          if (result.ok) sent++;
          else failed++;
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : "Send failed";
        for (const r of batch) update(r.key, { mail: { state: "failed", error } });
        failed += batch.length;
      }
    }
    setNotice(failed ? { tone: "amber", text: `${sent} email(s) sent, ${failed} failed. Failed rows show the error.` } : { tone: "green", text: `${sent} email(s) sent.` });
  }

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: rows.length, accepted: 0, "extra-pages": 0, "needs-correction": 0, unreadable: 0 };
    for (const r of rows) c[r.status]++;
    return c;
  }, [rows]);

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const canEmail = (r: Row) => r.mailable && r.mail.state !== "sent" && r.mail.state !== "sending" && splitRecipients(r.recipients).every(isEmail) && splitRecipients(r.recipients).length > 0;
  const bulkTargets = rows.filter(canEmail);
  const missingRecipients = rows.filter((r) => r.mailable && r.mail.state !== "sent" && !canEmail(r) && r.mail.state !== "sending").length;

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        Upload several PDFs or a .zip of PDFs. The paper ID is taken from the file name (&quot;121 Submission.pdf&quot; → 121). Papers that
        only exceed the page limit by paid extra pages (up to {paperConfig.extraPagesMax}) are listed separately and never emailed.
      </p>
      <FileDrop
        label="Papers to check"
        hint="Drop PDFs or a .zip here, or click to choose"
        accept=".pdf,.zip,application/pdf,application/zip"
        multiple
        busy={!!progress}
        fileName={rows.length ? `${rows.length} paper(s) checked` : undefined}
        onFiles={run}
        onClear={() => {
          setRows([]);
          setNotice(null);
        }}
      />
      {progress && (
        <div className="space-y-1">
          <p className="text-sm text-slate-600">
            Checking {progress.done} of {progress.total}…
          </p>
          <div className="h-2 overflow-hidden rounded bg-slate-200">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
        </div>
      )}
      {notice && <Banner tone={notice.tone} title={notice.text} />}

      {rows.length > 0 && (
        <Card
          title="Results"
          actions={
            confirmBulk ? (
              <span className="flex items-center gap-2 text-sm">
                Send {bulkTargets.length} email(s)?
                <button className="rounded bg-red-600 px-2.5 py-1 font-medium text-white hover:bg-red-700" onClick={() => sendEmails(bulkTargets)}>
                  Send
                </button>
                <button className="rounded border border-slate-300 px-2.5 py-1 hover:bg-slate-50" onClick={() => setConfirmBulk(false)}>
                  Cancel
                </button>
              </span>
            ) : (
              <button
                disabled={!bulkTargets.length}
                onClick={() => setConfirmBulk(true)}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Email all authors needing correction ({bulkTargets.length})
              </button>
            )
          }
        >
          <div className="mb-3 flex flex-wrap gap-2">
            {(["all", "needs-correction", "extra-pages", "accepted", "unreadable"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === f ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                {f === "all" ? "All" : statusLabel[f]} ({counts[f]})
              </button>
            ))}
            <button className="ml-auto text-xs text-blue-700 hover:underline" onClick={() => downloadCsv(rows)}>
              Download CSV
            </button>
          </div>
          {missingRecipients > 0 && (
            <p className="mb-3 text-xs text-amber-800">{missingRecipients} paper(s) needing correction have no valid email address. Enter one in the &quot;Email to&quot; column.</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Paper ID</th>
                  <th className="py-1.5 pr-3 font-medium">File</th>
                  <th className="py-1.5 pr-3 font-medium">Pages</th>
                  <th className="py-1.5 pr-3 font-medium">Status</th>
                  <th className="py-1.5 pr-3 font-medium">Reason</th>
                  <th className="py-1.5 pr-3 font-medium">Email to</th>
                  <th className="py-1.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((r) => (
                  <tr key={r.key} className="align-top">
                    <td className="py-2 pr-3 font-medium">{r.paperId ?? <span className="text-slate-400">—</span>}</td>
                    <td className="max-w-[12rem] break-words py-2 pr-3">{r.fileName}</td>
                    <td className="py-2 pr-3">{r.pages ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge>
                    </td>
                    <td className="min-w-[16rem] py-2 pr-3">
                      {r.reasons.length > 0 && (
                        <ul className="list-disc space-y-0.5 pl-4 text-red-800">
                          {r.reasons.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      )}
                      {r.notes.length > 0 && (
                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-500">
                          {r.notes.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      )}
                      {!r.reasons.length && !r.notes.length && <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-2 pr-3">
                      {r.mailable ? (
                        <>
                          <input
                            className="w-52 rounded border border-slate-300 px-2 py-1 text-xs"
                            value={r.recipients}
                            placeholder="author@example.com"
                            onChange={(e) => update(r.key, { recipients: e.target.value, recipientSource: "edited" })}
                          />
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            {{ pdf: "First author, from the PDF", payment: "From payment record (no email in PDF)", none: "No email found: enter one", edited: "Edited" }[r.recipientSource]}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">not emailed</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap py-2">
                      {r.mailable && (
                        <div className="flex flex-col items-start gap-1">
                          <button
                            disabled={!canEmail(r)}
                            onClick={() => sendEmails([r])}
                            className="rounded border border-blue-600 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                          >
                            {r.mail.state === "sending" ? "Sending…" : r.mail.state === "sent" ? "Sent ✓" : "Email author"}
                          </button>
                          <button className="text-xs text-slate-500 hover:underline" onClick={() => setPreview(r)}>
                            Preview
                          </button>
                          {r.mail.state === "failed" && <span className="max-w-[10rem] whitespace-normal text-xs text-red-700">{r.mail.error}</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {preview && <EmailPreview row={preview} senderName={senderName} onClose={() => setPreview(null)} />}
    </div>
  );
}

function EmailPreview({ row, senderName, onClose }: { row: Row; senderName: string; onClose: () => void }) {
  const conference = useConference();
  const email = correctionEmail({ paperId: row.paperId, fileName: row.fileName, title: row.title, reasons: row.reasons, authorName: row.authorName }, senderName, conference);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-3">
          <div className="text-sm">
            <p>
              <span className="text-slate-500">To:</span> {row.recipients || "—"}
            </p>
            <p>
              <span className="text-slate-500">Subject:</span> <strong>{email.subject}</strong>
            </p>
          </div>
          <button onClick={onClose} aria-label="Close preview" className="text-slate-500 hover:text-slate-800">
            ✕
          </button>
        </header>
        <div className="px-5 py-4" dangerouslySetInnerHTML={{ __html: email.html }} />
      </div>
    </div>
  );
}

function downloadCsv(rows: Row[]) {
  const cell = (s: string | number | null) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const lines = [
    ["Paper ID", "File", "Pages", "Status", "Reasons", "Notes", "Email to", "Email status"].map(cell).join(","),
    ...rows.map((r) => [r.paperId, r.fileName, r.pages, statusLabel[r.status], r.reasons.join(" | "), r.notes.join(" | "), r.recipients, r.mail.state].map(cell).join(",")),
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `format-check-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
