import type { Line, PdfDoc } from "./types";

export interface PaperHeader {
  title: string;
  titleSize: number | null;
  authors: string[];
  affiliations: string[];
  emails: string[];
  abstract: string;
  abstractSize: number | null;
  keywords: string;
  /** The author block reads like a double-blind placeholder. */
  anonymized: boolean;
  /** Raw author lines, shown to the user when the split looks wrong. */
  authorLines: string[];
}

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const GROUPED_EMAIL = /\{([^}]+)\}\s*@\s*([\w-]+(?:\.[\w-]+)+)/g;
const ORCID = /\[?\s*\d{4}[-−–]+\d{4}[-−–]+\d{4}[-−–]+\d{3}[\dX]\s*\]?/g;
const MARKERS = /[⋆*†‡§¶✉★∗]+/g;

/**
 * Reads the title, authors, affiliations and abstract from the first page of an
 * LNCS-style paper. The title is the largest text near the top, authors are the
 * next block at the largest remaining size, and affiliations run up to "Abstract".
 */
export function extractHeader(doc: PdfDoc): PaperHeader {
  const page = doc.pages[0];
  const empty: PaperHeader = {
    title: "", titleSize: null, authors: [], affiliations: [], emails: [],
    abstract: "", abstractSize: null, keywords: "", anonymized: false, authorLines: [],
  };
  if (!page || page.lines.length === 0) return empty;

  const lines = page.lines;
  const topHalf = lines.filter((l) => l.y > page.height * 0.45);
  if (topHalf.length === 0) return empty;

  const titleSize = Math.max(...topHalf.map((l) => l.size));
  const titleStart = lines.findIndex((l) => l.size === titleSize);
  let titleEnd = titleStart;
  while (titleEnd + 1 < lines.length && Math.abs(lines[titleEnd + 1].size - titleSize) < 0.5) titleEnd++;
  const title = clean(lines.slice(titleStart, titleEnd + 1).map((l) => l.text).join(" ").replace(MARKERS, ""));

  const abstractIdx = lines.findIndex((l, i) => i > titleEnd && /^abstract\b/i.test(l.text));
  const keywordsIdx = lines.findIndex((l, i) => i > titleEnd && /^key\s*words?\b/i.test(l.text));
  const headerEnd = abstractIdx >= 0 ? abstractIdx : keywordsIdx >= 0 ? keywordsIdx : Math.min(lines.length, titleEnd + 12);
  const header = lines.slice(titleEnd + 1, headerEnd);

  const { authorLines, rest } = splitAuthorBlock(header);
  const authorText = authorLines.map(authorLineText).join(" ");
  const authors = splitNames(authorText);
  const { affiliations, emails } = parseAffiliations(rest);

  let abstract = "";
  let abstractSize: number | null = null;
  if (abstractIdx >= 0) {
    const body = lines.slice(abstractIdx, keywordsIdx > abstractIdx ? keywordsIdx : undefined);
    abstractSize = mostCommonSize(body);
    const stop = body.findIndex((l, i) => i > 0 && abstractSize !== null && Math.abs(l.size - abstractSize) > 0.5);
    abstract = joinHyphenated(body.slice(0, stop > 0 ? stop : undefined).map((l) => l.text)).replace(/^abstract[.:\s—-]*/i, "");
  }

  let keywords = "";
  if (keywordsIdx >= 0) {
    const kwSize = lines[keywordsIdx].size;
    const kw: string[] = [];
    for (let i = keywordsIdx; i < lines.length && Math.abs(lines[i].size - kwSize) < 0.5 && kw.length < 6; i++) kw.push(lines[i].text);
    keywords = joinHyphenated(kw).replace(/^key\s*words?[.:\s—-]*/i, "");
  }

  const anonymized = /anonym|blind|withheld|redacted/i.test(authorText);
  return {
    title,
    titleSize,
    authors: anonymized ? [] : authors,
    affiliations,
    emails,
    abstract: clean(abstract),
    abstractSize,
    keywords: clean(keywords),
    anonymized,
    authorLines: authorLines.map((l) => l.text),
  };
}

/** Author lines are the leading lines at the largest size in the block; affiliations follow at a smaller size. */
function splitAuthorBlock(header: Line[]): { authorLines: Line[]; rest: Line[] } {
  if (header.length === 0) return { authorLines: [], rest: [] };
  const authorSize = Math.max(...header.map((l) => l.size));
  let i = 0;
  while (i < header.length && header[i].size >= authorSize - 0.5 && findEmails(header[i].text).length === 0) i++;
  return { authorLines: header.slice(0, i), rest: header.slice(i) };
}

/** Drops superscript affiliation markers (smaller runs) and leaves a separator in their place. */
function authorLineText(line: Line): string {
  return line.runs
    .map((r) => (r.size < line.size * 0.85 ? " , " : r.str))
    .join("")
    .replace(ORCID, " ")
    .replace(MARKERS, " ");
}

export function splitNames(text: string): string[] {
  return text
    .split(/\s*(?:,|;|&|\band\b|\\and)\s*/i)
    .map((s) => clean(s.replace(/\d+/g, "").replace(/\(.*?\)/g, "")))
    .filter((s) => /\p{L}{2,}/u.test(s) && !s.includes("@"));
}

function parseAffiliations(lines: Line[]): { affiliations: string[]; emails: string[] } {
  const emails: string[] = [];
  const affiliations: string[] = [];
  let current: string[] = [];
  const flush = () => {
    const a = clean(current.join(", ").replace(/,\s*,/g, ","));
    if (a) affiliations.push(a);
    current = [];
  };

  for (const line of lines) {
    const startsWithMarker = line.runs[0] && line.runs[0].size < line.size * 0.85 && /^\s*\d+\s*$/.test(line.runs[0].str);
    const found = findEmails(line.text);
    if (found.length) {
      emails.push(...found);
      flush();
      continue;
    }
    if (startsWithMarker) flush();
    const text = line.runs
      .filter((r) => !(r.size < line.size * 0.85 && /^\s*[\d,]+\s*$/.test(r.str)))
      .map((r) => r.str)
      .join("");
    if (/^(https?:|www\.)/i.test(text.trim())) continue;
    current.push(text.replace(MARKERS, ""));
  }
  flush();
  return { affiliations, emails: [...new Set(emails.map((e) => e.toLowerCase()))] };
}

export function findEmails(text: string): string[] {
  const out: string[] = [];
  const compact = text.replace(/\s*@\s*/g, "@");
  const withoutGroups = compact.replace(GROUPED_EMAIL, (_, users: string, domain: string) => {
    for (const u of users.split(/[,;]/)) if (u.trim()) out.push(`${u.trim()}@${domain}`);
    return " ";
  });
  for (const m of withoutGroups.matchAll(EMAIL)) out.push(m[0].replace(/[.,;]+$/, ""));
  return out;
}

function mostCommonSize(lines: Line[]): number | null {
  const count = new Map<number, number>();
  for (const l of lines) count.set(l.size, (count.get(l.size) ?? 0) + l.text.length);
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function joinHyphenated(parts: string[]): string {
  return parts.reduce((acc, p) => (acc.endsWith("-") ? acc.slice(0, -1) + p : acc ? `${acc} ${p}` : p), "");
}

function clean(s: string): string {
  return s.replace(/\s+/g, " ").replace(/\s+([,.;:])/g, "$1").replace(/^[\s,;.]+|[\s,;]+$/g, "").trim();
}
