import type { PaperConfig } from "@config/paper.config";
import { compareAuthors, type AuthorRow } from "./authors";
import { normalizeText, textSimilarity } from "./similarity";

/** The fields of one version that take part in the comparison. Editable by the user before comparing. */
export interface VersionInfo {
  title: string;
  authors: string[];
  affiliations: string[];
  emails: string[];
  abstract: string;
  pages: number;
}

export interface Finding {
  level: "critical" | "warning" | "info";
  message: string;
}

export interface ListDiff {
  added: string[];
  removed: string[];
}

export interface ComparisonResult {
  verdict: "match" | "review" | "authors-changed";
  findings: Finding[];
  authors: AuthorRow[];
  affiliations: ListDiff;
  emails: ListDiff;
  titleSimilarity: number;
  abstractSimilarity: number;
}

export function compareVersions(initial: VersionInfo, final: VersionInfo, cfg: PaperConfig["compare"]): ComparisonResult {
  const authors = compareAuthors(initial.authors, final.authors, cfg.surnameMatch);
  const findings: Finding[] = [];

  const added = authors.filter((r) => r.status === "added");
  const removed = authors.filter((r) => r.status === "removed");
  const respelled = authors.filter((r) => r.spelling);
  const moved = authors.filter((r) => r.moved);

  if (initial.authors.length === 0) {
    findings.push({ level: "warning", message: "No authors found in the initial version (double-blind?). Enter the submitted author list to compare." });
  }
  if (added.length) findings.push({ level: "critical", message: `${plural(added.length, "author")} added: ${added.map((r) => r.final!.name).join(", ")}` });
  if (removed.length) findings.push({ level: "critical", message: `${plural(removed.length, "author")} removed: ${removed.map((r) => r.initial!.name).join(", ")}` });
  if (moved.length) findings.push({ level: "warning", message: `Author order changed for ${moved.map((r) => r.final!.name).join(", ")}` });
  for (const r of respelled) findings.push({ level: "warning", message: `Name spelling changed: "${r.initial!.name}" → "${r.final!.name}"` });

  const affiliations = diffList(initial.affiliations, final.affiliations);
  if (affiliations.added.length) findings.push({ level: "warning", message: `Affiliation added: ${affiliations.added.join("; ")}` });
  if (affiliations.removed.length) findings.push({ level: "warning", message: `Affiliation removed: ${affiliations.removed.join("; ")}` });

  const emails = diffList(initial.emails, final.emails);
  if (emails.added.length) findings.push({ level: "info", message: `Email added: ${emails.added.join(", ")}` });
  if (emails.removed.length) findings.push({ level: "info", message: `Email removed: ${emails.removed.join(", ")}` });

  const titleSimilarity = textSimilarity(initial.title, final.title);
  if (titleSimilarity < cfg.titleSimilarity) {
    findings.push({ level: "warning", message: `Title changed (${pct(titleSimilarity)} similar)` });
  }

  const abstractSimilarity = initial.abstract && final.abstract ? textSimilarity(initial.abstract, final.abstract) : 1;
  if (abstractSimilarity < cfg.abstractSimilarity) {
    findings.push({ level: "info", message: `Abstract substantially rewritten (${pct(abstractSimilarity)} similar)` });
  }
  if (initial.pages !== final.pages) {
    findings.push({ level: "info", message: `Page count changed: ${initial.pages} → ${final.pages}` });
  }

  const verdict = added.length || removed.length ? "authors-changed" : findings.some((f) => f.level !== "info") ? "review" : "match";
  return { verdict, findings, authors, affiliations, emails, titleSimilarity, abstractSimilarity };
}

/** Set difference on normalised strings, so case and punctuation changes are not reported. */
function diffList(a: string[], b: string[]): ListDiff {
  const na = new Set(a.map(normalizeText));
  const nb = new Set(b.map(normalizeText));
  return {
    added: b.filter((x) => !na.has(normalizeText(x))),
    removed: a.filter((x) => !nb.has(normalizeText(x))),
  };
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const pct = (x: number) => `${Math.round(x * 100)}%`;
