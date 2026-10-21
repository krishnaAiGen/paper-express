"use client";

import { useEffect, useMemo, useRef } from "react";
import { classify, type Classification } from "@/lib/validate/classify";
import { validatePaper, type CheckResult, type ValidationReport } from "@/lib/validate/validate";
import { FileDrop } from "./FileDrop";
import { CameraReadyVerdict } from "./CameraReadyVerdict";
import { useConference } from "./ConferenceContext";
import { Badge, Banner, Card } from "./ui";
import { usePdf } from "./usePdf";

export interface FormatResult {
  fileName: string;
  report: ValidationReport;
  classification: Classification;
}

export function FormatTab({ onResult }: { onResult?: (r: FormatResult) => void }) {
  const paperConfig = useConference().paper;
  const pdf = usePdf();
  const report = useMemo(() => (pdf.doc && !pdf.error ? validatePaper(pdf.doc, paperConfig) : null), [pdf.doc, pdf.error, paperConfig]);
  const classification = useMemo(() => (report ? classify(report, paperConfig) : null), [report, paperConfig]);

  // Report each new analysis once, so the caller can save it.
  const reported = useRef<ValidationReport | null>(null);
  useEffect(() => {
    if (report && classification && pdf.fileName && reported.current !== report) {
      reported.current = report;
      onResult?.({ fileName: pdf.fileName, report, classification });
    }
  }, [report, classification, pdf.fileName, onResult]);

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        Checks a paper against the {paperConfig.template} template: {paperConfig.maxPages} pages maximum including references
        (up to {paperConfig.extraPagesMax} with paid extra pages), single column, {paperConfig.fonts.bodyPt} pt body text and the
        standard front matter. The PDF is read in your browser and is not uploaded.
      </p>
      <FileDrop label="Paper PDF" fileName={pdf.fileName} busy={pdf.busy} onFiles={pdf.load} onClear={pdf.reset} />
      {pdf.error && <Banner tone="red" title={pdf.error} />}
      {report && classification && <ReportView report={report} classification={classification} />}
    </div>
  );
}

function ReportView({ report, classification }: { report: ValidationReport; classification: Classification }) {
  return (
    <div className="space-y-5">
      <CameraReadyVerdict c={classification} numPages={report.numPages} />
      <details className="rounded-lg border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-slate-800">All checks ({report.checks.length})</summary>
        <div className="border-t border-slate-200 p-4">
          <ChecksTable checks={report.checks} extraPages={classification.extraPages} />
        </div>
      </details>
      <Card title="Detected front matter">
        <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">Title</dt>
          <dd>{report.header.title || "—"}</dd>
          <dt className="text-slate-500">Authors</dt>
          <dd>{report.header.anonymized ? "Anonymized" : report.header.authors.join(", ") || "—"}</dd>
          <dt className="text-slate-500">Affiliations</dt>
          <dd>{report.header.affiliations.join("; ") || "—"}</dd>
          <dt className="text-slate-500">Keywords</dt>
          <dd>{report.header.keywords || "—"}</dd>
        </dl>
      </Card>
    </div>
  );
}

export function ChecksTable({ checks, extraPages = 0 }: { checks: CheckResult[]; extraPages?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-1.5 pr-3 font-medium">Result</th>
            <th className="py-1.5 pr-3 font-medium">Check</th>
            <th className="py-1.5 pr-3 font-medium">Type</th>
            <th className="py-1.5 pr-3 font-medium">Found</th>
            <th className="py-1.5 pr-3 font-medium">Expected</th>
            <th className="py-1.5 font-medium">Pages</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {checks.map((c) => (
            <tr key={c.id} className="align-top">
              <td className="py-2 pr-3">
                <StatusBadge check={c} extraPages={extraPages} />
              </td>
              <td className="py-2 pr-3 font-medium text-slate-800">{c.label}</td>
              <td className="py-2 pr-3 text-slate-500">{c.requirement === "must" ? "Must" : "Optional"}</td>
              <td className="py-2 pr-3">{c.actual}</td>
              <td className="py-2 pr-3 text-slate-500">{c.expected}</td>
              <td className="py-2 text-slate-500">{c.pages?.length ? c.pages.join(", ") : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ check, extraPages }: { check: CheckResult; extraPages: number }) {
  if (check.status === "pass") return <Badge tone="green">✓ Pass</Badge>;
  if (check.status === "skipped") return <Badge tone="slate">Skipped</Badge>;
  if (check.id === "pageLimit" && extraPages > 0) return <Badge tone="blue">Extra pages</Badge>;
  if (check.requirement === "must") return <Badge tone="red">✗ Must fix</Badge>;
  return <Badge tone="amber">Recommended</Badge>;
}
