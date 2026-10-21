import type { Line, TextRun } from "./types";

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Groups runs into lines. Runs belong to the same line when their baselines are
 * within a fraction of the font size. Larger runs are placed first so that
 * superscripts (affiliation markers, ORCID ids) attach to the line they sit on
 * instead of starting lines of their own.
 */
export function groupLines(page: number, runs: TextRun[]): Line[] {
  const sorted = [...runs].sort((a, b) => b.size - a.size || b.y - a.y || a.x - b.x);
  const groups: TextRun[][] = [];

  for (const run of sorted) {
    const group = groups.find((g) => {
      const anchor = g[0];
      return Math.abs(anchor.y - run.y) <= Math.max(anchor.size, run.size) * 0.45 && overlapsNoRun(g, run);
    });
    if (group) group.push(run);
    else groups.push([run]);
  }

  return groups
    .map((g) => toLine(page, g))
    .filter((l) => l.text.trim().length > 0)
    .sort((a, b) => b.y - a.y || a.x - b.x);
}

/** Two-column layouts put runs at the same height side by side; keep them apart when they are far away. */
function overlapsNoRun(group: TextRun[], run: TextRun): boolean {
  const right = Math.max(...group.map((r) => r.x + r.width));
  const left = Math.min(...group.map((r) => r.x));
  const gap = run.x > right ? run.x - right : left - (run.x + run.width);
  return gap < Math.max(run.size, group[0].size) * 1.2;
}

function toLine(page: number, runs: TextRun[]): Line {
  runs.sort((a, b) => a.x - b.x);
  const weight = new Map<string, { size: number; fontId: string; chars: number }>();
  let text = "";
  let prevEnd = -Infinity;

  for (const r of runs) {
    if (text && r.x - prevEnd > r.size * 0.15 && !text.endsWith(" ") && !r.str.startsWith(" ")) text += " ";
    text += r.str;
    prevEnd = Math.max(prevEnd, r.x + r.width);
    const chars = r.str.trim().length;
    if (!chars) continue;
    const key = `${round1(r.size)}|${r.fontId}`;
    const w = weight.get(key) ?? { size: round1(r.size), fontId: r.fontId, chars: 0 };
    // Weight by area so a long run of superscript ORCID digits cannot outvote the names it decorates.
    w.chars += chars * r.size * r.size;
    weight.set(key, w);
  }

  const dominant = [...weight.values()].sort((a, b) => b.chars - a.chars)[0] ?? { size: 0, fontId: "" };
  const baseline = runs.filter((r) => round1(r.size) === dominant.size);
  return {
    page,
    text: text.replace(/\s+/g, " ").trim(),
    x: Math.min(...runs.map((r) => r.x)),
    right: Math.max(...runs.map((r) => r.x + r.width)),
    y: Math.min(...(baseline.length ? baseline : runs).map((r) => r.y)),
    size: dominant.size,
    fontId: dominant.fontId,
    runs,
  };
}
