import { describe, expect, it } from "vitest";
import { paperConfig } from "@config/paper.config";
import { classify } from "@/lib/validate/classify";
import { validatePaper } from "@/lib/validate/validate";
import { loadPdf } from "./load";

const failed = async (path: string) => {
  const report = validatePaper(await loadPdf(path), paperConfig);
  return { report, c: classify(report, paperConfig), ids: report.checks.filter((c) => c.status === "fail").map((c) => c.id) };
};

describe("format validation", () => {
  it("accepts a clean LNCS paper", async () => {
    const { c, ids } = await failed("resources/accepted/main.pdf");
    expect(ids).toEqual([]);
    expect(c.cameraReady).toBe(true);
    expect(c.recommended).toEqual([]);
  });

  it("is camera-ready with the running-head placeholder as a recommendation", async () => {
    const { c, ids } = await failed("resources/accepted/Himashri_IHCI__Copy_ (2).pdf");
    expect(ids).toEqual(["placeholders"]);
    expect(c.cameraReady).toBe(true);
    expect(c.recommended.map((i) => i.label)).toEqual(["No template placeholder text"]);
    expect(c.recommended[0].fix).toMatch(/authorrunning/);
  });

  it("rejects an 11-page paper against the 10-page limit", async () => {
    const { ids } = await failed("resources/accepted/133 Submission.pdf");
    expect(ids).toContain("pageLimit");
    expect(ids).not.toContain("columns");
    expect(ids).not.toContain("textWidth");
  });

  it("honours a changed page limit", async () => {
    const report = validatePaper(await loadPdf("resources/accepted/133 Submission.pdf"), { ...paperConfig, maxPages: 12 });
    expect(report.checks.find((c) => c.id === "pageLimit")?.status).toBe("pass");
  });

  it.each(["134", "136", "323"])("rejects the two-column IEEE-style paper %s", async (n) => {
    const { c, ids } = await failed(`resources/rejected/${n} Submission.pdf`);
    expect(c.cameraReady).toBe(false);
    expect(ids).toEqual(expect.arrayContaining(["columns", "textWidth"]));
  });

  it("treats a missing embedded font as optional", async () => {
    const report = validatePaper(await loadPdf("resources/accepted/main.pdf"), paperConfig);
    const fonts = report.checks.find((x) => x.id === "embeddedFonts")!;
    Object.assign(fonts, { status: "fail", actual: "not embedded: Times New Roman" });
    const c = classify(report, paperConfig);
    expect(c.cameraReady).toBe(true);
    expect(c.mailable).toBe(false);
    expect(c.recommended[0].fix).toMatch(/PDF\/A/);
  });
});
