import { describe, expect, it } from "vitest";
import { paperConfig } from "@config/paper.config";
import { withAuthorCheck } from "@/lib/compare/camera-ready";
import { compareVersions, type VersionInfo } from "@/lib/compare/compare";
import { extractHeader } from "@/lib/pdf/header";
import { classify } from "@/lib/validate/classify";
import { validatePaper } from "@/lib/validate/validate";
import { loadPdf } from "./load";

async function check(initialPath: string, finalPath: string, cfg = paperConfig) {
  const version = async (path: string): Promise<VersionInfo> => {
    const doc = await loadPdf(path);
    return { ...extractHeader(doc), pages: doc.numPages };
  };
  const finalDoc = await loadPdf(finalPath);
  const comparison = compareVersions(await version(initialPath), await version(finalPath), cfg.compare);
  return withAuthorCheck(classify(validatePaper(finalDoc, cfg), cfg), comparison, cfg.compare);
}

describe("camera-ready with author check", () => {
  it("is camera-ready when the author list is unchanged", async () => {
    const c = await check("resources/accepted/main.pdf", "resources/accepted/main.pdf");
    expect(c.cameraReady).toBe(true);
    expect(c.mustFix).toEqual([]);
  });

  it("is not camera-ready when an author was added, even though the format passes", async () => {
    const c = await check("tests/fixtures/initial.pdf", "resources/accepted/main.pdf");
    expect(c.cameraReady).toBe(false);
    expect(c.status).toBe("needs-correction");
    expect(c.mustFix.map((i) => i.label)).toEqual(["Authors added"]);
    expect(c.mustFix[0].actual).toBe("Krishna Yadav");
  });

  it("blocks reordering, and keeps a spelling change as a recommendation", async () => {
    const c = await check("tests/fixtures/initial.pdf", "tests/fixtures/camera_reordered.pdf");
    expect(c.cameraReady).toBe(false);
    expect(c.mustFix.map((i) => i.label)).toEqual(["Authors added", "Author order changed"]);
    expect(c.recommended.map((i) => i.label)).toContain("Author name spelling changed");
  });

  it("follows the config when a change is not blocking", async () => {
    const cfg = { ...paperConfig, compare: { ...paperConfig.compare, blockingAuthorChanges: { added: false, removed: true, reordered: true, spelling: false } } };
    const c = await check("tests/fixtures/initial.pdf", "resources/accepted/main.pdf", cfg);
    expect(c.cameraReady).toBe(true);
    expect(c.recommended.map((i) => i.label)).toContain("Authors added");
  });
});
