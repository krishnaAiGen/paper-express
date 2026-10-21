import { describe, expect, it } from "vitest";
import { getConference } from "@config/conferences";
import { paperConfig } from "@config/paper.config";
import { correctionEmail } from "@/lib/email/template";
import { classify, paperIdFromFileName } from "@/lib/validate/classify";
import { validatePaper } from "@/lib/validate/validate";
import { loadPdf } from "./load";

const classifyFile = async (path: string, cfg = paperConfig) => classify(validatePaper(await loadPdf(path), cfg), cfg);

describe("paper status", () => {
  it("accepts a clean paper", async () => {
    expect((await classifyFile("resources/accepted/main.pdf")).status).toBe("accepted");
  });

  it("puts an 11-page paper that is otherwise fine under extra pages, not in the mailing list", async () => {
    const c = await classifyFile("resources/accepted/133 Submission.pdf");
    expect(c.status).toBe("extra-pages");
    expect(c.mailable).toBe(false);
    expect(c.notes[0]).toMatch(/1 extra page/);
  });

  it("requires correction when the paper is past the paid extension", async () => {
    const c = await classifyFile("resources/accepted/133 Submission.pdf", { ...paperConfig, extraPagesMax: 10 });
    expect(c.status).toBe("needs-correction");
    expect(c.reasons[0]).toMatch(/11 pages/);
  });

  it("requires correction for a two-column paper and gives readable reasons", async () => {
    const c = await classifyFile("resources/rejected/323 Submission.pdf");
    expect(c.status).toBe("needs-correction");
    expect(c.mailable).toBe(true);
    expect(c.reasons.join("\n")).toMatch(/Single-column layout: found 2 columns/);
  });
});

describe("paper ID from file name", () => {
  it.each([
    ["121 Submission.pdf", "121"],
    ["folder/323 Submission.pdf", "323"],
    ["  42_final.pdf", "42"],
    ["Himashri_IHCI.pdf", null],
  ])("%s → %s", (name, id) => expect(paperIdFromFileName(name)).toBe(id));
});

describe("correction email", () => {
  it("lists the reasons and escapes HTML", () => {
    const e = correctionEmail({ paperId: "121", fileName: "121 Submission.pdf", title: "A <b>bold</b> title", reasons: ["Reason one.", "Reason two."] }, "PC Chairs", getConference("taiis-2026")!);
    expect(e.subject).toContain("Paper 121");
    expect(e.subject).toContain("TAIIS 2026");
    expect(e.text).toContain("1. Reason one.");
    expect(e.text).toContain("2. Reason two.");
    expect(e.html).toContain("A &lt;b&gt;bold&lt;/b&gt; title");
    expect(e.html).not.toContain("<b>bold</b>");
  });
});
