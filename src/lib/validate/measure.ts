import type { Line, PdfDoc } from "@/lib/pdf/types";

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Font size carrying the most characters in the document. */
export function bodyFontSize(doc: PdfDoc): number | null {
  const count = new Map<number, number>();
  for (const p of doc.pages) for (const r of p.runs) count.set(round1(r.size), (count.get(round1(r.size)) ?? 0) + r.str.trim().length);
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** Font name carrying the most characters at the body size. */
export function bodyFontName(doc: PdfDoc, bodySize: number): string | null {
  const count = new Map<string, number>();
  for (const p of doc.pages)
    for (const r of p.runs) {
      if (Math.abs(r.size - bodySize) > 0.3) continue;
      const name = doc.fonts[r.fontId]?.name ?? r.fontId;
      count.set(name, (count.get(name) ?? 0) + r.str.trim().length);
    }
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** Full-length lines of body text, which define the text block. */
export function bodyLines(doc: PdfDoc, bodySize: number): Line[] {
  return doc.pages.flatMap((p) => p.lines.filter((l) => Math.abs(l.size - bodySize) <= 0.3 && l.text.length >= 25));
}

function percentile(values: number[], q: number): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))];
}

/** Width of the text block: from the usual left edge to the usual right edge of body lines. */
export function textBlockWidth(lines: Line[]): number | null {
  if (lines.length < 10) return null;
  return percentile(lines.map((l) => l.right), 0.9) - percentile(lines.map((l) => l.x), 0.1);
}

/**
 * Pages laid out in two columns: a good share of body lines sit entirely in the
 * left half and another good share entirely in the right half.
 */
export function twoColumnPages(doc: PdfDoc, bodySize: number): number[] {
  const pages: number[] = [];
  for (const page of doc.pages) {
    const lines = page.lines.filter((l) => Math.abs(l.size - bodySize) <= 0.3 && l.text.length >= 15);
    if (lines.length < 10) continue;
    const mid = page.width / 2;
    const left = lines.filter((l) => l.right < mid + 5).length;
    const right = lines.filter((l) => l.x > mid - 5).length;
    if (left / lines.length > 0.25 && right / lines.length > 0.25) pages.push(page.number);
  }
  return pages;
}

/** Heading line that starts the reference list, searched from the end of the paper. */
export function findReferences(doc: PdfDoc): { page: number; size: number | null } | null {
  for (let i = doc.pages.length - 1; i >= 0; i--) {
    const page = doc.pages[i];
    const idx = page.lines.findIndex((l) => /^(\d+\.?\s*)?(references|bibliography|literature cited)$/i.test(l.text.trim()));
    if (idx < 0) continue;
    const after = [...page.lines.slice(idx + 1), ...doc.pages.slice(i + 1).flatMap((p) => p.lines)];
    const count = new Map<number, number>();
    for (const l of after) count.set(l.size, (count.get(l.size) ?? 0) + l.text.length);
    const size = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { page: page.number, size };
  }
  return null;
}
