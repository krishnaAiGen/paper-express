"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { paperIdFromFileName } from "@/lib/validate/classify";
import { saveCameraReadyResult, saveFormatResult } from "../api";
import { CompareTab, type CameraReadyResult } from "../CompareTab";
import { useConference } from "../ConferenceContext";
import { FormatTab, type FormatResult } from "../FormatTab";
import { LogoutButton } from "../LoginForm";
import { SubmissionsTable } from "../SubmissionsTable";
import { Tabs } from "../Tabs";
import { BulkTab } from "./BulkTab";
import { CertificatesTab } from "./CertificatesTab";

/** Admin tools for the conference chosen at /admin. Every tab reads and writes only that conference's records. */
export function AdminDashboard({ email, senderName, env }: { email: string; senderName: string; env: string }) {
  const conference = useConference();
  const [refresh, setRefresh] = useState(0);
  const bump = (res: { ok: boolean }) => res.ok && setRefresh((n) => n + 1);
  const onFormat = useCallback((r: FormatResult) => saveFormatResult(conference.id, r, paperIdFromFileName(r.fileName), "admin").then(bump), [conference.id]);
  const onCompare = useCallback(
    (r: CameraReadyResult) => saveCameraReadyResult(conference.id, r, paperIdFromFileName(r.finalFileName), "admin").then(bump),
    [conference.id],
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Admin{env === "test" && <span className="ml-2 text-amber-700">test data</span>}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{conference.name}</h1>
          <p className="text-sm text-slate-700">{conference.fullName}</p>
          <p className="text-xs text-slate-500">Signed in as {email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin" className="rounded px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            Change conference
          </Link>
          <LogoutButton />
        </div>
      </header>
      {env === "test" && (
        <p className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Test mode: emails are delivered to the sender&apos;s own inbox, not to authors. Set APP_ENV=prod to email authors.
        </p>
      )}
      <Tabs
        tabs={[
          { id: "bulk", label: "Bulk check", content: <BulkTab senderName={senderName} /> },
          { id: "saved", label: "Saved results", content: <SubmissionsTable refreshKey={refresh} showSource /> },
          ...(conference.certificates ? [{ id: "certificates", label: "Certificates", content: <CertificatesTab /> }] : []),
          { id: "format", label: "Format check", content: <FormatTab onResult={onFormat} /> },
          { id: "compare", label: "Camera-ready check", content: <CompareTab onResult={onCompare} /> },
        ]}
      />
    </main>
  );
}
