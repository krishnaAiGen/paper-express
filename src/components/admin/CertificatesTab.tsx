"use client";

import { useCallback, useEffect, useState } from "react";
import type { CertificateRecord } from "@/app/api/admin/certificates/route";
import { useConference } from "../ConferenceContext";
import { Badge, Banner, Card } from "../ui";

const typeLabel: Record<string, string> = { presentation: "Presentation", best: "Best Paper", doctoral: "Doctoral Symposium" };

/** Who has generated a certificate, for the admin dashboard. */
export function CertificatesTab() {
  const [rows, setRows] = useState<CertificateRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const conferenceId = useConference().id;

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/admin/certificates?conference=${encodeURIComponent(conferenceId)}`);
    const body = await res.json().catch(() => ({}));
    if (res.ok) setRows(body.certificates);
    else setError(body.error ?? res.statusText);
  }, [conferenceId]);

  useEffect(() => {
    load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const visible = (rows ?? []).filter((r) => !q || [r.paymentId, r.paperId, r.name, r.affiliation, r.paperTitle, r.certificateNo].some((v) => v?.toLowerCase().includes(q)));

  return (
    <Card
      title={rows ? `Certificates generated (${rows.length})` : "Certificates generated"}
      actions={
        <div className="flex items-center gap-3">
          {rows && rows.length > 0 && (
            <button className="text-sm text-blue-700 hover:underline" onClick={() => downloadCsv(rows)}>
              Download CSV
            </button>
          )}
          <button className="text-sm text-blue-700 hover:underline" onClick={load}>
            Refresh
          </button>
        </div>
      }
    >
      {error && <Banner tone="red" title={error} />}
      {rows && rows.length === 0 && <p className="text-sm text-slate-500">No one has generated a certificate yet.</p>}
      {rows && rows.length > 0 && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, paper ID, payment ID or title"
            className="mb-3 w-full max-w-md rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Name</th>
                  <th className="py-1.5 pr-3 font-medium">Paper ID</th>
                  <th className="py-1.5 pr-3 font-medium">Payment ID</th>
                  <th className="py-1.5 pr-3 font-medium">Type</th>
                  <th className="py-1.5 pr-3 font-medium">Certificate no.</th>
                  <th className="py-1.5 pr-3 font-medium">Paper</th>
                  <th className="py-1.5 pr-3 font-medium">Times</th>
                  <th className="py-1.5 font-medium">Last generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((r) => (
                  <tr key={r.paymentId} className="align-top">
                    <td className="py-2 pr-3">
                      <div className="font-medium text-slate-900">{r.name ?? "—"}</div>
                      {r.affiliation && <div className="text-xs text-slate-500">{r.affiliation}</div>}
                    </td>
                    <td className="py-2 pr-3 font-medium">{r.paperId ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{r.paymentId}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={r.type === "best" ? "amber" : "slate"}>{typeLabel[r.type ?? ""] ?? r.type ?? "—"}</Badge>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">{r.certificateNo ?? "—"}</td>
                    <td className="max-w-[18rem] py-2 pr-3 italic text-slate-700">{r.paperTitle ?? "—"}</td>
                    <td className="py-2 pr-3">{r.times}</td>
                    <td className="whitespace-nowrap py-2 text-slate-500" title={`First generated ${new Date(r.firstAt).toLocaleString()}`}>
                      {new Date(r.lastAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

function downloadCsv(rows: CertificateRecord[]) {
  const cell = (s: string | number | null) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const lines = [
    ["Name", "Affiliation", "Paper ID", "Payment ID", "Type", "Certificate no.", "Paper title", "Times generated", "First generated", "Last generated"].map(cell).join(","),
    ...rows.map((r) =>
      [r.name, r.affiliation, r.paperId, r.paymentId, typeLabel[r.type ?? ""] ?? r.type, r.certificateNo, r.paperTitle, r.times, r.firstAt, r.lastAt].map(cell).join(","),
    ),
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `certificates-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
