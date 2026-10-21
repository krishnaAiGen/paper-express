import type { PaperConfig } from "@config/paper.config";
import type { Classification, Issue } from "@/lib/validate/classify";
import type { ComparisonResult } from "./compare";

/**
 * Combines the camera-ready PDF's format result with the author comparison: a
 * blocking author-list change (per config) makes the paper not camera-ready,
 * whatever its format.
 */
export function withAuthorCheck(format: Classification, comparison: ComparisonResult, cfg: PaperConfig["compare"]): Classification {
  const block = cfg.blockingAuthorChanges;
  const rows = comparison.authors;
  const added = rows.filter((r) => r.status === "added").map((r) => r.final!.name);
  const removed = rows.filter((r) => r.status === "removed").map((r) => r.initial!.name);
  const moved = rows.filter((r) => r.moved).map((r) => `${r.final!.name} (${r.initial!.position} → ${r.final!.position})`);
  const respelled = rows.filter((r) => r.spelling).map((r) => `${r.initial!.name} → ${r.final!.name}`);

  const fix = "The author list cannot change after submission. Upload a camera-ready version with the same authors, in the same order, as the initial submission, or contact the program chairs.";
  const changes: { blocking: boolean; issue: Issue }[] = [];
  if (added.length) changes.push({ blocking: block.added, issue: { label: "Authors added", actual: added.join(", "), expected: "no new authors", fix } });
  if (removed.length) changes.push({ blocking: block.removed, issue: { label: "Authors removed", actual: removed.join(", "), expected: "no authors removed", fix } });
  if (moved.length) changes.push({ blocking: block.reordered, issue: { label: "Author order changed", actual: moved.join(", "), expected: "same order as the initial submission", fix } });
  if (respelled.length)
    changes.push({
      blocking: block.spelling,
      issue: { label: "Author name spelling changed", actual: respelled.join("; "), expected: "same names", fix: "Check that the spelling change is a correction of the same person's name." },
    });

  const blocking = changes.filter((c) => c.blocking).map((c) => c.issue);
  const advisory = changes.filter((c) => !c.blocking).map((c) => c.issue);
  if (!blocking.length && !advisory.length) return format;

  const describe = (i: Issue) => `${i.label}: ${i.actual}. How to fix: ${i.fix}`;
  const mustFix = [...blocking, ...format.mustFix];
  const cameraReady = format.cameraReady && blocking.length === 0;
  return {
    ...format,
    status: cameraReady ? format.status : "needs-correction",
    cameraReady,
    mustFix,
    recommended: [...advisory, ...format.recommended],
    reasons: [...blocking.map(describe), ...format.reasons],
    notes: [...advisory.map(describe), ...format.notes],
    mailable: !cameraReady,
  };
}
