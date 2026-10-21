"use client";

import type { CameraReadyResult } from "./CompareTab";
import type { FormatResult } from "./FormatTab";

async function post(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) return { ok: true };
    return { ok: false, error: (await res.json().catch(() => ({}))).error ?? res.statusText };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export const login = (url: string, body: unknown) => post(url, body);
export const logout = () => post("/api/auth/logout", {});

export function saveFormatResult(conferenceId: string, r: FormatResult, paperId: string | null, source?: "admin") {
  return post("/api/submissions", {
    conferenceId,
    source,
    items: [
      {
        kind: "format",
        fileName: r.fileName,
        paperId,
        status: r.classification.status,
        numPages: r.report.numPages,
        reasons: r.classification.reasons,
        title: r.report.header.title,
        authors: r.report.header.authors,
        emails: r.report.header.emails,
        details: { notes: r.classification.notes, checks: r.report.checks },
      },
    ],
  });
}

export function saveCameraReadyResult(conferenceId: string, r: CameraReadyResult, paperId: string | null, source?: "admin") {
  return post("/api/submissions", {
    conferenceId,
    source,
    items: [
      {
        kind: "camera-ready",
        fileName: r.finalFileName,
        paperId,
        status: r.result.verdict,
        numPages: r.final.pages,
        reasons: r.result.findings.map((f) => f.message),
        title: r.final.title,
        authors: r.final.authors,
        emails: r.final.emails,
        details: { initialFileName: r.initialFileName, authors: r.result.authors },
      },
    ],
  });
}
