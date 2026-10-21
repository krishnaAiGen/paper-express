import type { ReactNode } from "react";
import { useConference } from "./ConferenceContext";
import type { Classification, Issue } from "@/lib/validate/classify";

function Icon({ ok }: { ok: boolean }) {
  return (
    <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${ok ? "bg-green-600" : "bg-red-600"}`} aria-hidden>
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {ok ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M6 6l12 12M18 6L6 18" />}
      </svg>
    </span>
  );
}

function IssueList({ issues, tone }: { issues: Issue[]; tone: "red" | "amber" }) {
  return (
    <ol className="space-y-3">
      {issues.map((i, n) => (
        <li key={n} className={`rounded-md border-l-4 bg-white px-3 py-2 ${tone === "red" ? "border-red-500" : "border-amber-400"}`}>
          <p className="font-medium text-slate-900">{i.label}</p>
          <p className="text-sm text-slate-600">
            Found {i.actual}; expected {i.expected}
            {i.pages?.length ? ` (page${i.pages.length > 1 ? "s" : ""} ${i.pages.join(", ")})` : ""}.
          </p>
          <p className="mt-1 text-sm text-slate-800">
            <span className="font-medium">How to fix:</span> {i.fix}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** The headline result for authors: camera-ready (green tick) or not (red cross), with what to fix. */
/** `children` render under the verdict, e.g. the upload button or a note. */
export function CameraReadyVerdict({ c, numPages, children }: { c: Classification; numPages: number | null; children?: ReactNode }) {
  const paperConfig = useConference().paper;
  return (
    <section className={`rounded-xl border-2 p-5 ${c.cameraReady ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`} aria-live="polite">
      <div className="flex items-center gap-4">
        <Icon ok={c.cameraReady} />
        <div>
          <h2 className={`text-xl font-semibold ${c.cameraReady ? "text-green-900" : "text-red-900"}`}>
            {c.cameraReady ? "Your paper is camera-ready" : "Your paper is not camera-ready"}
          </h2>
          <p className="text-sm text-slate-700">
            {c.cameraReady
              ? c.recommended.length
                ? `All required checks passed. ${c.recommended.length} optional improvement(s) are listed below.`
                : "All required checks passed."
              : `${c.mustFix.length} required check(s) failed. Fix ${c.mustFix.length === 1 ? "it" : "them"} and upload the paper again.`}
          </p>
        </div>
      </div>

      {c.extraPages > 0 && (
        <p className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          Your paper has {numPages} pages, {c.extraPages} more than the {paperConfig.maxPages}-page limit. This is allowed up to{" "}
          {paperConfig.extraPagesMax} pages, but the extra page{c.extraPages > 1 ? "s are" : " is"} charged.
        </p>
      )}

      {c.mustFix.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-red-900">Must fix</h3>
          <IssueList issues={c.mustFix} tone="red" />
        </div>
      )}

      {c.recommended.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-900">Recommended (optional)</h3>
          <IssueList issues={c.recommended} tone="amber" />
        </div>
      )}

      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}
