"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AuthorRow } from "@/lib/compare/authors";
import { withAuthorCheck } from "@/lib/compare/camera-ready";
import { compareVersions, type ComparisonResult, type VersionInfo } from "@/lib/compare/compare";
import { extractHeader } from "@/lib/pdf/header";
import type { PdfDoc } from "@/lib/pdf/types";
import { classify } from "@/lib/validate/classify";
import { validatePaper } from "@/lib/validate/validate";
import { FileDrop } from "./FileDrop";
import { CameraReadyVerdict } from "./CameraReadyVerdict";
import { useConference } from "./ConferenceContext";
import { Badge, Banner, Card } from "./ui";
import { usePdf } from "./usePdf";

function toVersionInfo(doc: PdfDoc): VersionInfo & { anonymized: boolean } {
  const h = extractHeader(doc);
  return { title: h.title, authors: h.authors, affiliations: h.affiliations, emails: h.emails, abstract: h.abstract, pages: doc.numPages, anonymized: h.anonymized };
}

export interface CameraReadyResult {
  initialFileName: string;
  finalFileName: string;
  result: ComparisonResult;
  final: VersionInfo;
}

interface Props {
  onResult?: (r: CameraReadyResult) => void;
  /** Called by the "Upload camera-ready paper" button. Until submissions exist, the button explains that uploads are not open yet. */
  onUploadCameraReady?: (file: { fileName: string }) => void;
}

export function CompareTab({ onResult, onUploadCameraReady }: Props) {
  const paperConfig = useConference().paper;
  const initialPdf = usePdf();
  const finalPdf = usePdf();
  const [initial, setInitial] = useState<ReturnType<typeof toVersionInfo> | null>(null);
  const [final, setFinal] = useState<ReturnType<typeof toVersionInfo> | null>(null);

  useEffect(() => setInitial(initialPdf.doc && !initialPdf.error ? toVersionInfo(initialPdf.doc) : null), [initialPdf.doc, initialPdf.error]);
  useEffect(() => setFinal(finalPdf.doc && !finalPdf.error ? toVersionInfo(finalPdf.doc) : null), [finalPdf.doc, finalPdf.error]);

  const result = useMemo(() => (initial && final ? compareVersions(initial, final, paperConfig.compare) : null), [initial, final, paperConfig]);
  // Report the first comparison of each pair of files (not every edit), so the caller can save it.
  const reportedPair = useRef<string | null>(null);
  useEffect(() => {
    if (!result || !final || !initialPdf.fileName || !finalPdf.fileName) return;
    const pair = `${initialPdf.fileName}|${finalPdf.fileName}|${initialPdf.doc?.numPages}|${finalPdf.doc?.numPages}`;
    if (reportedPair.current === pair) return;
    reportedPair.current = pair;
    onResult?.({ initialFileName: initialPdf.fileName, finalFileName: finalPdf.fileName, result, final });
  }, [result, final, initialPdf.fileName, finalPdf.fileName, initialPdf.doc, finalPdf.doc, onResult]);

  const finalFormat = useMemo(() => (finalPdf.doc && !finalPdf.error ? classify(validatePaper(finalPdf.doc, paperConfig), paperConfig) : null), [finalPdf.doc, finalPdf.error, paperConfig]);
  // Camera-ready only when the format passes AND the author list is unchanged (once both versions are in).
  const verdict = useMemo(() => (finalFormat && result ? withAuthorCheck(finalFormat, result, paperConfig.compare) : finalFormat), [finalFormat, result, paperConfig]);

  // Names typed over the ones read from the PDF are flagged, since they decide the verdict.
  const extractedInitial = useMemo(() => (initialPdf.doc ? toVersionInfo(initialPdf.doc).authors : []), [initialPdf.doc]);
  const extractedFinal = useMemo(() => (finalPdf.doc ? toVersionInfo(finalPdf.doc).authors : []), [finalPdf.doc]);
  const edited =
    (initial && !initial.anonymized && initial.authors.join("|") !== extractedInitial.join("|")) || (final && final.authors.join("|") !== extractedFinal.join("|"));

  const [uploadNote, setUploadNote] = useState<string | null>(null);
  useEffect(() => setUploadNote(null), [finalPdf.fileName]);

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        Upload the version that was submitted for review and the camera-ready version. Authors, affiliations and title are read from
        page 1 of each. Correct anything that was read wrongly in the boxes below; the comparison updates as you type.
      </p>

      <div className="grid gap-5 md:grid-cols-2">
        <VersionPanel title="Initial submission" pdf={initialPdf} info={initial} onChange={setInitial} />
        <VersionPanel title="Camera-ready" pdf={finalPdf} info={final} onChange={setFinal} />
      </div>

      {verdict && (
        <CameraReadyVerdict c={verdict} numPages={finalPdf.doc?.numPages ?? null}>
          {!result ? (
            <Banner tone="amber" title="Author check pending">
              Upload the initial submission too, so the author list can be compared. The paper counts as camera-ready only after that check.
            </Banner>
          ) : (
            <div className="space-y-3">
              {edited && (
                <p className="text-sm text-amber-900">
                  An author list was edited by hand. The organisers will check the authors against the PDF itself.
                </p>
              )}
              {verdict.cameraReady && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      onUploadCameraReady
                        ? onUploadCameraReady({ fileName: finalPdf.fileName! })
                        : setUploadNote("Camera-ready upload is not open yet. Please check back soon.")
                    }
                    className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-800"
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M10 13V3M6 7l4-4 4 4M4 13v3h12v-3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Upload camera-ready paper
                  </button>
                  {uploadNote && <span className="text-sm text-slate-600">{uploadNote}</span>}
                </div>
              )}
            </div>
          )}
        </CameraReadyVerdict>
      )}

      {result && <ResultView result={result} />}
    </div>
  );
}

function VersionPanel({
  title,
  pdf,
  info,
  onChange,
}: {
  title: string;
  pdf: ReturnType<typeof usePdf>;
  info: ReturnType<typeof toVersionInfo> | null;
  onChange: (v: ReturnType<typeof toVersionInfo>) => void;
}) {
  return (
    <div className="space-y-3">
      <FileDrop label={title} fileName={pdf.fileName} busy={pdf.busy} onFiles={pdf.load} onClear={pdf.reset} />
      {pdf.error && <Banner tone="red" title={pdf.error} />}
      {info && (
        <Card title={`${title}: detected details`}>
          <div className="space-y-3 text-sm">
            {info.anonymized && (
              <Banner tone="amber" title="This version is anonymized">
                Paste the author list from the submission system (one name per line) so it can be compared.
              </Banner>
            )}
            <Field label="Title">
              <textarea rows={2} className={inputClass} value={info.title} onChange={(e) => onChange({ ...info, title: e.target.value })} />
            </Field>
            <Field label={`Authors (${info.authors.length}), one per line`}>
              <LinesInput rows={Math.max(3, info.authors.length + 1)} value={info.authors} onChange={(authors) => onChange({ ...info, authors })} />
            </Field>
            <Field label="Affiliations, one per line">
              <LinesInput rows={Math.max(2, info.affiliations.length + 1)} value={info.affiliations} onChange={(affiliations) => onChange({ ...info, affiliations })} />
            </Field>
            <Field label="Emails">
              <p className="break-all text-slate-700">{info.emails.join(", ") || "—"}</p>
            </Field>
            <p className="text-xs text-slate-500">{info.pages} pages</p>
          </div>
        </Card>
      )}
    </div>
  );
}

const inputClass = "w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

/** A textarea holding one entry per line. Keeps the raw text while typing so blank lines are not swallowed. */
function LinesInput({ value, onChange, rows }: { value: string[]; onChange: (v: string[]) => void; rows: number }) {
  const [text, setText] = useState(value.join("\n"));
  useEffect(() => {
    setText((t) => (sameLines(t, value) ? t : value.join("\n")));
  }, [value]);
  return (
    <textarea
      rows={rows}
      className={inputClass}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(toLines(e.target.value));
      }}
    />
  );
}

const toLines = (t: string) => t.split("\n").map((s) => s.trim()).filter(Boolean);
const sameLines = (t: string, v: string[]) => toLines(t).join("\n") === v.join("\n");

function ResultView({ result }: { result: ComparisonResult }) {
  const banner =
    result.verdict === "authors-changed" ? (
      <Banner tone="red" title="Author list changed between versions" />
    ) : result.verdict === "review" ? (
      <Banner tone="amber" title="Differences found, review before accepting" />
    ) : (
      <Banner tone="green" title="No differences in authors, affiliations or title" />
    );

  return (
    <div className="space-y-5">
      {banner}
      {result.findings.length > 0 && (
        <Card title="What changed">
          <ul className="space-y-1.5 text-sm">
            {result.findings.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <Badge tone={f.level === "critical" ? "red" : f.level === "warning" ? "amber" : "blue"}>
                  {f.level === "critical" ? "Critical" : f.level === "warning" ? "Review" : "Note"}
                </Badge>
                <span>{f.message}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card title="Authors side by side">
        <AuthorsTable rows={result.authors} />
      </Card>
    </div>
  );
}

const statusBadge: Record<AuthorRow["status"], React.ReactNode> = {
  unchanged: <Badge tone="green">Same</Badge>,
  spelling: <Badge tone="amber">Spelling changed</Badge>,
  moved: <Badge tone="amber">Position changed</Badge>,
  added: <Badge tone="red">Added</Badge>,
  removed: <Badge tone="red">Removed</Badge>,
};

function AuthorsTable({ rows }: { rows: AuthorRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">No authors on either side.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-1.5 pr-3 font-medium">Initial submission</th>
            <th className="py-1.5 pr-3 font-medium">Camera-ready</th>
            <th className="py-1.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i} className={r.status === "added" || r.status === "removed" ? "bg-red-50/50" : ""}>
              <td className="py-2 pr-3">{r.initial ? `${r.initial.position}. ${r.initial.name}` : <span className="text-slate-400">—</span>}</td>
              <td className="py-2 pr-3">{r.final ? `${r.final.position}. ${r.final.name}` : <span className="text-slate-400">—</span>}</td>
              <td className="space-x-1 py-2">
                {statusBadge[r.status]}
                {r.spelling && r.moved && statusBadge.moved}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
