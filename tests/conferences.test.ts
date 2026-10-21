import { describe, expect, it } from "vitest";
import { conferences, getConference } from "@config/conferences";
import { buildPaperConfig, paperConfig } from "@config/paper.config";

describe("conferences", () => {
  it("lists TAIIS 2026 and SysCom 2026 with unique ids", () => {
    expect(conferences.map((c) => c.name)).toEqual(["TAIIS 2026", "SysCom 2026"]);
    expect(new Set(conferences.map((c) => c.id)).size).toBe(conferences.length);
  });

  it("finds a conference by id and rejects unknown ids", () => {
    expect(getConference("taiis-2026")?.name).toBe("TAIIS 2026");
    expect(getConference("nope")).toBeNull();
    expect(getConference(undefined)).toBeNull();
  });

  it("lets a conference override single rules and keeps the rest", () => {
    const c = buildPaperConfig({ maxPages: 12, extraPagesMax: 16, checks: { embeddedFonts: "must" }, compare: { blockingAuthorChanges: { reordered: false } } });
    expect(c.maxPages).toBe(12);
    expect(c.checks.embeddedFonts).toBe("must");
    expect(c.checks.columns).toBe(paperConfig.checks.columns);
    expect(c.compare.blockingAuthorChanges).toEqual({ ...paperConfig.compare.blockingAuthorChanges, reordered: false });
    expect(c.fonts).toEqual(paperConfig.fonts);
  });

  it("rejects invalid overrides", () => {
    expect(() => buildPaperConfig({ maxPages: 12, extraPagesMax: 10 })).toThrow(/extraPagesMax/);
  });
});
