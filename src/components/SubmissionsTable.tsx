"use client";

import { useCallback, useEffect, useState } from "react";
import { statusLabel, type PaperStatus } from "@/lib/validate/classify";
import { useConference } from "./ConferenceContext";
import { Badge, Banner, Card } from "./ui";

interface Submission {
  id: string;
  created_at: string;
  paper_id: string | null;
  file_name: string;
  source: string;
  kind: string;
  status: string;
  num_pages: number | null;
  reasons: string[];
}

const label = (s: string) =>
  ({ ...statusLabel, match: "No changes", review: "Needs review", "authors-changed": "Authors changed" } as Record<string, string>)[s] ?? s;
const tone = (s: string) =>
  s === "accepted" || s === "match" ? "green" : s === "extra-pages" ? "blue" : s === "review" ? "amber" : s === "unreadable" ? "slate" : "red";

/** Saved check results. Admins see all papers; authors see their own. */
export function SubmissionsTable({ refreshKey = 0, showSource = false }: { refreshKey?: number; showSource?: boolean }) {
  const [rows, setRows] = useState<Submission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const conferenceId = useConference().id;

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/submissions?conference=${encodeURIComponent(conferenceId)}`);
    const body = await res.json().catch(() => ({}));
    if (res.ok) setRows(body.submissions);
    else setError(body.error ?? res.statusText);
  }, [conferenceId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const statuses = [...new Set((rows ?? []).map((r) => r.status))];
  const visible = (rows ?? []).filter((r) => filter === "all" || r.status === filter);

  return (
    <Card
      title="Saved results"
      actions={
        <button className="text-sm text-blue-700 hover:underline" onClick={load}>
          Refresh
        </button>
      }
    >
      {error && <Banner tone="red" title={`Could not load results: ${error}`} />}
      {rows && rows.length === 0 && <p className="text-sm text-slate-500">No results saved yet.</p>}
      {rows && rows.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {["all", ...statuses].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === s ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                {s === "all" ? "All" : label(s)} ({s === "all" ? rows.length : rows.filter((r) => r.status === s).length})
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">When</th>
                  <th className="py-1.5 pr-3 font-medium">Paper ID</th>
                  <th className="py-1.5 pr-3 font-medium">File</th>
                  <th className="py-1.5 pr-3 font-medium">Check</th>
                  {showSource && <th className="py-1.5 pr-3 font-medium">By</th>}
                  <th className="py-1.5 pr-3 font-medium">Pages</th>
                  <th className="py-1.5 pr-3 font-medium">Status</th>
                  <th className="py-1.5 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="whitespace-nowrap py-2 pr-3 text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-3 font-medium">{r.paper_id ?? "—"}</td>
                    <td className="max-w-[12rem] break-words py-2 pr-3">{r.file_name}</td>
                    <td className="py-2 pr-3">{r.kind === "camera-ready" ? "Camera-ready" : "Format"}</td>
                    {showSource && <td className="py-2 pr-3">{r.source}</td>}
                    <td className="py-2 pr-3">{r.num_pages ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={tone(r.status) as "green"}>{label(r.status as PaperStatus)}</Badge>
                    </td>
                    <td className="py-2">
                      {r.reasons.length ? (
                        <ul className="list-disc space-y-0.5 pl-4">
                          {r.reasons.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
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
