import { jaroWinkler, normalizeText } from "./similarity";

export type AuthorStatus = "unchanged" | "spelling" | "moved" | "added" | "removed";

export interface AuthorRow {
  status: AuthorStatus;
  initial: { name: string; position: number } | null;
  final: { name: string; position: number } | null;
  /** Spelling changed and position changed can both apply. */
  moved: boolean;
  spelling: boolean;
}

interface ParsedName {
  raw: string;
  norm: string;
  given: string[];
  surname: string;
}

function parseName(raw: string): ParsedName {
  // "H.S. Shekhawat" → "h s shekhawat": split initials so they compare token by token.
  const norm = normalizeText(raw.replace(/\.(?=\S)/g, ". "));
  const tokens = norm.split(" ").filter(Boolean);
  return { raw, norm, surname: tokens.at(-1) ?? "", given: tokens.slice(0, -1) };
}

/** Given names are compatible when each token on the shorter side matches the same token or its initial on the other side. */
function givenCompatible(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.every((t, i) => {
    const o = long[i];
    if (!o) return false;
    if (t.length === 1 || o.length === 1) return t[0] === o[0];
    return jaroWinkler(t, o) >= 0.85;
  });
}

/** 0 when the names cannot be the same person, otherwise a similarity score. */
export function nameScore(a: string, b: string, surnameThreshold: number): number {
  const pa = parseName(a);
  const pb = parseName(b);
  if (pa.norm === pb.norm) return 1;
  const surname = jaroWinkler(pa.surname, pb.surname);
  if (surname < surnameThreshold || !givenCompatible(pa.given, pb.given)) return 0;
  return 0.5 + 0.5 * jaroWinkler(pa.norm, pb.norm);
}

/**
 * Pairs authors of the two versions (best score first), then marks additions,
 * removals, spelling changes and order changes.
 */
export function compareAuthors(initial: string[], final: string[], surnameThreshold: number): AuthorRow[] {
  const candidates: { i: number; f: number; score: number }[] = [];
  initial.forEach((a, i) =>
    final.forEach((b, f) => {
      const score = nameScore(a, b, surnameThreshold);
      if (score > 0) candidates.push({ i, f, score });
    }),
  );
  candidates.sort((x, y) => y.score - x.score);

  const pairOfInitial = new Map<number, number>();
  const usedFinal = new Set<number>();
  for (const c of candidates) {
    if (pairOfInitial.has(c.i) || usedFinal.has(c.f)) continue;
    pairOfInitial.set(c.i, c.f);
    usedFinal.add(c.f);
  }

  // An author has moved when their rank among the authors present in both versions changed.
  const keptInitial = [...pairOfInitial.keys()].sort((a, b) => a - b);
  const keptFinalOrder = [...pairOfInitial.values()].sort((a, b) => a - b);
  const movedInitial = new Set(keptInitial.filter((i, rank) => pairOfInitial.get(i) !== keptFinalOrder[rank]));

  const rows: AuthorRow[] = [];
  for (let f = 0; f < final.length; f++) {
    const i = [...pairOfInitial.entries()].find(([, ff]) => ff === f)?.[0];
    if (i === undefined) {
      rows.push({ status: "added", initial: null, final: { name: final[f], position: f + 1 }, moved: false, spelling: false });
      continue;
    }
    const spelling = parseName(initial[i]).norm !== parseName(final[f]).norm;
    const moved = movedInitial.has(i);
    rows.push({
      status: spelling ? "spelling" : moved ? "moved" : "unchanged",
      initial: { name: initial[i], position: i + 1 },
      final: { name: final[f], position: f + 1 },
      moved,
      spelling,
    });
  }
  initial.forEach((name, i) => {
    if (!pairOfInitial.has(i)) rows.push({ status: "removed", initial: { name, position: i + 1 }, final: null, moved: false, spelling: false });
  });
  return rows;
}
