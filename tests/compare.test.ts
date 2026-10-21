import { describe, expect, it } from "vitest";
import { paperConfig } from "@config/paper.config";
import { compareAuthors, nameScore } from "@/lib/compare/authors";
import { compareVersions, type VersionInfo } from "@/lib/compare/compare";
import { extractHeader } from "@/lib/pdf/header";
import { loadPdf } from "./load";

const T = paperConfig.compare.surnameMatch;

const version = async (path: string): Promise<VersionInfo> => {
  const doc = await loadPdf(path);
  const h = extractHeader(doc);
  return { ...h, pages: doc.numPages };
};

describe("author extraction", () => {
  it.each([
    ["resources/accepted/main.pdf", ["Himashree Deka", "Susmita Bhattacharjee", "Krishna Yadav", "Hanumant Singh Sekhawat"]],
    ["resources/accepted/Himashri_IHCI__Copy_ (2).pdf", ["Himashri Deka", "Diyora Ujas Vinodkumar", "Susmita Bhattacharjee", "H.S. Shekhawat"]],
    ["resources/accepted/133 Submission.pdf", ["Mehul Sharma", "Dilip Singh Sisodia", "Nikhat Khan"]],
    ["tests/fixtures/initial.pdf", ["Himashree Deka", "Susmita Bhattacharjee", "Hanumant Singh Sekhawat"]],
  ])("reads authors from %s", async (path, authors) => {
    expect(extractHeader(await loadPdf(path)).authors).toEqual(authors);
  });

  it("reads affiliations and expands grouped emails", async () => {
    const h = extractHeader(await loadPdf("resources/accepted/Himashri_IHCI__Copy_ (2).pdf"));
    expect(h.affiliations).toEqual(["Indian Institute of Technology Guwahati, India"]);
    expect(h.emails).toEqual(["himashri.deka@iitg.ac.in", "sbhattacharjee@iitg.ac.in", "h.s.shekhawat@iitg.ac.in"]);
  });

  it("recognises an anonymized submission", async () => {
    const h = extractHeader(await loadPdf("tests/fixtures/initial_anonymous.pdf"));
    expect(h.anonymized).toBe(true);
    expect(h.authors).toEqual([]);
  });
});

describe("name matching", () => {
  it("matches initials, accents and small spelling changes", () => {
    expect(nameScore("H.S. Shekhawat", "Hanumant Singh Sekhawat", T)).toBeGreaterThan(0);
    expect(nameScore("José Müller", "Jose Muller", T)).toBe(1);
    expect(nameScore("Himashri Deka", "Himashree Deka", T)).toBeGreaterThan(0);
  });

  it("does not match different people", () => {
    expect(nameScore("Krishna Yadav", "Susmita Bhattacharjee", T)).toBe(0);
    expect(nameScore("Amit Kumar", "Rahul Kumar", T)).toBe(0);
  });

  it("does not mark authors after an insertion as moved", () => {
    const rows = compareAuthors(["A Alpha", "B Beta", "C Gamma"], ["A Alpha", "X Extra", "B Beta", "C Gamma"], T);
    expect(rows.map((r) => r.status)).toEqual(["unchanged", "added", "unchanged", "unchanged"]);
  });
});

describe("initial vs camera-ready", () => {
  it("flags the added author, reorder, spelling change and new affiliation", async () => {
    const r = compareVersions(await version("tests/fixtures/initial.pdf"), await version("tests/fixtures/camera_reordered.pdf"), paperConfig.compare);
    expect(r.verdict).toBe("authors-changed");
    const byName = Object.fromEntries(r.authors.map((a) => [a.final?.name ?? a.initial!.name, a]));
    expect(byName["Krishna Yadav"].status).toBe("added");
    expect(byName["Hanumant Singh Shekhawat"].spelling).toBe(true);
    expect(byName["Susmita Bhattacharjee"].moved).toBe(true);
    expect(byName["Himashree Deka"].moved).toBe(true);
    expect(r.affiliations.added).toEqual(["SAI Lab, India"]);
    expect(r.emails.added).toEqual(["krishna@thesailab.com"]);
  });

  it("reports no differences for identical versions", async () => {
    const v = await version("resources/accepted/main.pdf");
    const r = compareVersions(v, v, paperConfig.compare);
    expect(r.verdict).toBe("match");
    expect(r.findings).toEqual([]);
  });

  it("asks for the author list when the initial version is anonymized", async () => {
    const r = compareVersions(await version("tests/fixtures/initial_anonymous.pdf"), await version("resources/accepted/main.pdf"), paperConfig.compare);
    expect(r.findings[0].message).toMatch(/double-blind/);
  });
});
