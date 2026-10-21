import { describe, expect, it } from "vitest";
import { firstAuthorContact } from "@/lib/email/recipient";
import { extractHeader } from "@/lib/pdf/header";
import { loadPdf } from "./load";

describe("first author email from the PDF", () => {
  it.each([
    ["resources/accepted/133 Submission.pdf", "mehul.sharma.05@gmail.com", "Mehul Sharma"],
    ["resources/accepted/main.pdf", "himadeka9911@gmail.com", "Himashree Deka"],
    ["resources/accepted/Himashri_IHCI__Copy_ (2).pdf", "himashri.deka@iitg.ac.in", "Himashri Deka"],
    ["resources/rejected/134 Submission.pdf", "pt6385@srmist.edu.in", "T Y Pranav Sriram"],
    ["resources/rejected/136 Submission.pdf", "nandhini.kitcbe@gmail.com", "NANDHINI N"],
    ["resources/rejected/323 Submission.pdf", "fernandorawini@gmail.com", null],
  ])("%s → %s", async (path, email, name) => {
    const h = extractHeader(await loadPdf(path));
    expect(firstAuthorContact(h.authors, h.emails)).toEqual({ email, name });
  });

  it("prefers the address that matches the first author over the first one listed", () => {
    expect(firstAuthorContact(["Krishna Yadav", "Jane Roe"], ["jane@x.org", "k.yadav@y.org"])?.email).toBe("k.yadav@y.org");
  });

  it("returns null when the paper has no email", () => {
    expect(firstAuthorContact(["A Author"], [])).toBeNull();
  });
});
