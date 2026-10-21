import { normalizeText } from "@/lib/compare/similarity";

export interface FirstAuthorContact {
  email: string;
  /** The first author's name, when it reads like a clean name; used to greet them. */
  name: string | null;
}

/**
 * The first author's email from the addresses printed in the paper. LNCS lists
 * emails per institution, not per author, so the address whose local part
 * contains the first author's surname or given name wins; otherwise the first
 * address listed.
 */
export function firstAuthorContact(authors: string[], emails: string[]): FirstAuthorContact | null {
  if (emails.length === 0) return null;
  const first = authors[0] ?? "";
  const tokens = normalizeText(first).split(" ").filter((t) => t.length >= 3);
  const surname = tokens.at(-1);

  const score = (email: string) => {
    const local = normalizeText(email.split("@")[0]).replace(/\s+/g, "");
    if (surname && local.includes(surname)) return 2;
    if (tokens.some((t) => local.includes(t))) return 1;
    return 0;
  };
  const best = emails.reduce((a, b) => (score(b) > score(a) ? b : a), emails[0]);
  return { email: best, name: looksLikeName(first) ? first : null };
}

/** Rejects author lines that swallowed affiliation text in non-LNCS layouts. */
function looksLikeName(s: string) {
  const words = s.trim().split(/\s+/);
  return words.length >= 2 && words.length <= 5 && !/universit|institut|department|college|school|lab|\d/i.test(s);
}
