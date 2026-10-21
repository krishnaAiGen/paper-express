import type { PaperConfig } from "@config/paper.config";
import type { CheckResult, ValidationReport } from "./validate";

/**
 * - accepted: every "must" check passes and the paper is within the page limit (camera-ready)
 * - extra-pages: camera-ready, but over the page limit and within the paid extension
 * - needs-correction: a "must" check failed, or the paper is past the paid extension (not camera-ready)
 * - unreadable: the PDF could not be analysed (not camera-ready)
 */
export type PaperStatus = "accepted" | "extra-pages" | "needs-correction" | "unreadable";

export interface Issue {
  label: string;
  actual: string;
  expected: string;
  pages?: number[];
  fix: string;
}

export interface Classification {
  status: PaperStatus;
  cameraReady: boolean;
  /** Failed "must" checks: the paper is not camera-ready until these are fixed. */
  mustFix: Issue[];
  /** Failed "optional" checks: recommended, but the paper is camera-ready without them. */
  recommended: Issue[];
  /** Pages beyond the limit that the authors pay for; 0 when within the limit. */
  extraPages: number;
  /** mustFix written as sentences, for emails and saved results. */
  reasons: string[];
  /** recommended and the extra-page note written as sentences. */
  notes: string[];
  /** Whether a correction email should go to the authors. */
  mailable: boolean;
}

export function classify(report: ValidationReport, cfg: PaperConfig): Classification {
  const failed = report.checks.filter((c) => c.status === "fail");
  const pages = report.numPages;
  const withinPaidExtension = pages > cfg.maxPages && pages <= cfg.extraPagesMax;

  const mustFix: Issue[] = [];
  for (const c of failed.filter((c) => c.requirement === "must")) {
    if (c.id !== "pageLimit") mustFix.push(issue(c));
    else if (!withinPaidExtension)
      mustFix.push({
        ...issue(c),
        expected: `≤ ${cfg.maxPages} pages (≤ ${cfg.extraPagesMax} with the extra-page fee)`,
        fix: `Shorten the paper to at most ${cfg.extraPagesMax} pages including references. Pages beyond ${cfg.maxPages} are charged as extra pages.`,
      });
  }
  const recommended = failed.filter((c) => c.requirement === "optional").map(issue);
  const extraPages = withinPaidExtension ? pages - cfg.maxPages : 0;

  const status: PaperStatus = mustFix.length ? "needs-correction" : extraPages ? "extra-pages" : "accepted";
  const notes = recommended.map(describe);
  if (extraPages) notes.unshift(`${pages} pages: ${extraPages} extra page(s) beyond ${cfg.maxPages}, charged as extra pages.`);

  return {
    status,
    cameraReady: status === "accepted" || status === "extra-pages",
    mustFix,
    recommended,
    extraPages,
    reasons: mustFix.map(describe),
    notes,
    mailable: status === "needs-correction",
  };
}

export function unreadable(message: string): Classification {
  const fix = "Export the paper again as a text-based PDF (not scanned or printed to image), without a password.";
  return {
    status: "unreadable",
    cameraReady: false,
    mustFix: [{ label: "Readable PDF", actual: message, expected: "a PDF with selectable text", fix }],
    recommended: [],
    extraPages: 0,
    reasons: [`${message} ${fix}`],
    notes: [],
    mailable: true,
  };
}

const issue = (c: CheckResult): Issue => ({ label: c.label, actual: c.actual, expected: c.expected, pages: c.pages, fix: c.fix });

function describe(i: Issue) {
  const where = i.pages?.length ? ` (page${i.pages.length > 1 ? "s" : ""} ${i.pages.join(", ")})` : "";
  return `${i.label}: found ${i.actual}, expected ${i.expected}${where}. How to fix: ${i.fix}`;
}

export const statusLabel: Record<PaperStatus, string> = {
  accepted: "Camera-ready",
  "extra-pages": "Camera-ready (extra pages)",
  "needs-correction": "Not camera-ready",
  unreadable: "Unreadable",
};

/** "121 Submission.pdf" → "121". */
export function paperIdFromFileName(name: string): string | null {
  const base = name.split("/").pop() ?? name;
  return base.match(/^\s*(\d+)/)?.[1] ?? null;
}
