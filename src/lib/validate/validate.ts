import type { CheckId, PaperConfig, Requirement } from "@config/paper.config";
import { extractHeader, type PaperHeader } from "@/lib/pdf/header";
import type { PdfDoc } from "@/lib/pdf/types";
import { bodyFontName, bodyFontSize, bodyLines, findReferences, textBlockWidth, twoColumnPages } from "./measure";

export interface CheckResult {
  id: CheckId;
  label: string;
  status: "pass" | "fail" | "skipped";
  requirement: Exclude<Requirement, "off">;
  expected: string;
  actual: string;
  pages?: number[];
  /** What the author should do when the check fails. */
  fix: string;
}

export interface ValidationReport {
  checks: CheckResult[];
  header: PaperHeader;
  numPages: number;
}

type Outcome = Pick<CheckResult, "status" | "expected" | "actual" | "pages">;

const pt = (n: number | null) => (n === null ? "not found" : `${n.toFixed(1)} pt`);
const near = (v: number | null, target: number, tol: number) => v !== null && Math.abs(v - target) <= tol;
const cm = (p: number) => `${(p / 28.3465).toFixed(1)} cm`;

export function validatePaper(doc: PdfDoc, cfg: PaperConfig): ValidationReport {
  const header = extractHeader(doc);
  const body = bodyFontSize(doc);
  const lines = body === null ? [] : bodyLines(doc, body);
  const f = cfg.fonts;

  const rules: Record<CheckId, { label: string; fix: string; run: () => Outcome }> = {
    pageLimit: {
      label: "Page limit (including references)",
      fix: `Shorten the paper to ${cfg.maxPages} pages including references. Up to ${cfg.extraPagesMax} pages are possible with the extra-page fee.`,
      run: () => ({ status: doc.numPages <= cfg.maxPages ? "pass" : "fail", expected: `≤ ${cfg.maxPages} pages`, actual: `${doc.numPages} pages` }),
    },
    pageSize: {
      label: "Paper size",
      fix: `Export the PDF on ${cfg.pageSizes.map((s) => s.name).join(" or ")} paper.`,
      run: () => {
        const bad = doc.pages.filter(
          (p) => !cfg.pageSizes.some((s) => Math.abs(p.width - s.widthPt) <= cfg.pageSizeTolerancePt && Math.abs(p.height - s.heightPt) <= cfg.pageSizeTolerancePt),
        );
        const first = doc.pages[0];
        const named = cfg.pageSizes.find((s) => first && Math.abs(first.width - s.widthPt) <= cfg.pageSizeTolerancePt && Math.abs(first.height - s.heightPt) <= cfg.pageSizeTolerancePt);
        return {
          status: bad.length ? "fail" : "pass",
          expected: cfg.pageSizes.map((s) => s.name).join(" or "),
          actual: named?.name ?? (first ? `${Math.round(first.width)} × ${Math.round(first.height)} pt` : "no pages"),
          pages: bad.map((p) => p.number),
        };
      },
    },
    columns: {
      label: "Single-column layout",
      fix: "Use the single-column Springer LNCS template (llncs.cls in LaTeX, or the LNCS Word template). Two-column IEEE or ACM templates are not accepted.",
      run: () => {
        const pages = body === null ? [] : twoColumnPages(doc, body);
        return { status: pages.length ? "fail" : "pass", expected: "1 column", actual: pages.length ? `2 columns on ${pages.length} page(s)` : "1 column", pages };
      },
    },
    textWidth: {
      label: "Text block width",
      fix: "Use the LNCS template without changing its margins (text block 12.2 × 19.3 cm).",
      run: () => {
        const w = textBlockWidth(lines);
        if (w === null) return { status: "skipped", expected: cm(cfg.textWidthPt), actual: "not enough body text" };
        return { status: Math.abs(w - cfg.textWidthPt) <= cfg.textWidthTolerancePt ? "pass" : "fail", expected: `${cm(cfg.textWidthPt)} (±${cm(cfg.textWidthTolerancePt)})`, actual: cm(w) };
      },
    },
    bodyFont: {
      label: "Body font size",
      fix: `Set the main text to ${f.bodyPt} pt, as in the LNCS template.`,
      run: () => ({ status: near(body, f.bodyPt, f.tolerancePt) ? "pass" : "fail", expected: pt(f.bodyPt), actual: pt(body) }),
    },
    fontFamily: {
      label: "Body font family",
      fix: "Use the template's font: Computer Modern in LaTeX, Times New Roman in Word.",
      run: () => {
        const name = body === null ? null : bodyFontName(doc, body);
        const ok = !!name && f.allowedFamilies.some((a) => name.toLowerCase().includes(a.toLowerCase()));
        return { status: ok ? "pass" : "fail", expected: "Computer Modern / Latin Modern / Times", actual: name ?? "not found" };
      },
    },
    title: {
      label: "Title font size",
      fix: `Use the template's title style (${f.titlePt} pt bold).`,
      run: () => ({ status: near(header.titleSize, f.titlePt, f.tolerancePt) ? "pass" : "fail", expected: pt(f.titlePt), actual: pt(header.titleSize) }),
    },
    abstract: {
      label: `Abstract present, ${f.abstractPt} pt`,
      fix: `Add an abstract on the first page using the template's abstract style (${f.abstractPt} pt).`,
      run: () => {
        if (!header.abstract) return { status: "fail", expected: `Abstract at ${pt(f.abstractPt)}`, actual: "no abstract on page 1" };
        return { status: near(header.abstractSize, f.abstractPt, f.tolerancePt) ? "pass" : "fail", expected: pt(f.abstractPt), actual: pt(header.abstractSize) };
      },
    },
    keywords: {
      label: "Keywords present",
      fix: "Add keywords after the abstract (\\keywords{...} in LaTeX, or the Keywords style in Word).",
      run: () => ({ status: header.keywords ? "pass" : "fail", expected: "Keywords after abstract", actual: header.keywords ? "found" : "not found" }),
    },
    references: {
      label: `References section, ${f.referencesPt} pt`,
      fix: `Add a "References" section using the template's reference style (${f.referencesPt} pt, splncs04 in LaTeX).`,
      run: () => {
        const refs = findReferences(doc);
        if (!refs) return { status: "fail", expected: `References at ${pt(f.referencesPt)}`, actual: "no References heading found" };
        return { status: near(refs.size, f.referencesPt, f.tolerancePt) ? "pass" : "fail", expected: pt(f.referencesPt), actual: pt(refs.size), pages: [refs.page] };
      },
    },
    embeddedFonts: {
      label: "All fonts embedded",
      fix: "Save the PDF with all fonts embedded. In Word: File → Save As → PDF → Options → tick \"PDF/A compliant\". In LaTeX, pdflatex embeds fonts by default; re-export any figure that contains text.",
      run: () => {
        const missing = Object.values(doc.fonts).filter((x) => !x.embedded).map((x) => x.name);
        return { status: missing.length ? "fail" : "pass", expected: "all embedded", actual: missing.length ? `not embedded: ${[...new Set(missing)].join(", ")}` : "all embedded" };
      },
    },
    placeholders: {
      label: "No template placeholder text",
      fix: "Replace the template's placeholder text: set \\titlerunning and \\authorrunning in LaTeX, and remove sample text such as \"Supported by organization x\".",
      run: () => {
        const hits = new Map<string, number[]>();
        for (const p of doc.pages) {
          const text = p.lines.map((l) => l.text).join("\n").toLowerCase();
          for (const phrase of cfg.placeholderPhrases) if (text.includes(phrase.toLowerCase())) hits.set(phrase, [...(hits.get(phrase) ?? []), p.number]);
        }
        return {
          status: hits.size ? "fail" : "pass",
          expected: "none",
          actual: hits.size ? [...hits.keys()].map((h) => `"${h}"`).join(", ") : "none",
          pages: [...new Set([...hits.values()].flat())].sort((a, b) => a - b),
        };
      },
    },
  };

  const checks: CheckResult[] = [];
  for (const [id, rule] of Object.entries(rules) as [CheckId, (typeof rules)[CheckId]][]) {
    const requirement = cfg.checks[id];
    if (requirement === "off") continue;
    checks.push({ id, label: rule.label, fix: rule.fix, requirement, ...rule.run() });
  }
  return { checks, header, numPages: doc.numPages };
}
