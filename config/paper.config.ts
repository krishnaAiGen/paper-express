import { z } from "zod";

/**
 * Default validation settings, shared by every conference. A conference can
 * override any of them in config/conferences.ts. Edit the values in `rawConfig`;
 * the schema below rejects typos and out-of-range values at startup.
 *
 * Defaults follow the Springer LNCS template (llncs.cls). All sizes are in
 * PDF points (1 pt = 1/72 inch, 1 cm = 28.35 pt).
 */
const rawConfig = {
  template: "Springer LNCS",

  /** Maximum number of pages, references included. */
  maxPages: 10,
  /**
   * Papers up to this many pages are allowed if the authors pay for the extra
   * pages. They are listed separately and are never emailed as format failures.
   */
  extraPagesMax: 15,

  /** Accepted paper sizes. */
  pageSizes: [
    { name: "A4", widthPt: 595.28, heightPt: 841.89 },
    { name: "US Letter", widthPt: 612, heightPt: 792 },
  ],
  pageSizeTolerancePt: 3,

  /** LNCS text block is 12.2 cm wide. */
  textWidthPt: 345.8,
  textWidthTolerancePt: 12,

  fonts: {
    bodyPt: 10,
    titlePt: 14.4,
    abstractPt: 9,
    referencesPt: 9,
    tolerancePt: 0.6,
    /** Substrings of acceptable body font names (case-insensitive). */
    allowedFamilies: ["SFRM", "CMR", "LMRoman", "Times", "NimbusRom", "TeXGyreTermes", "STIX"],
  },

  requireEmbeddedFonts: true,

  /** Template leftovers that should not appear in a submitted paper. */
  placeholderPhrases: [
    "Suppressed Due to Excessive Length",
    "Supported by organization x",
    "First Author",
    "Second Author",
    "Princeton University",
    "abc@uni-heidelberg.de",
  ],

  /**
   * Which checks a paper must pass to be camera-ready.
   *   "must"     failing it means the paper is NOT camera-ready (and the authors get the correction email)
   *   "optional" failing it is shown to the authors as a recommended fix, but the paper is still camera-ready
   *   "off"      the check is skipped
   */
  checks: {
    pageLimit: "must",
    pageSize: "must",
    columns: "must",
    textWidth: "must",
    bodyFont: "must",
    abstract: "must",
    fontFamily: "optional",
    title: "optional",
    keywords: "optional",
    references: "optional",
    embeddedFonts: "optional",
    placeholders: "optional",
  },

  compare: {
    /** Jaro-Winkler score above which two surnames are treated as the same person. */
    surnameMatch: 0.88,
    /** Title similarity below this is flagged as a title change. */
    titleSimilarity: 0.9,
    /** Abstract similarity below this is flagged. */
    abstractSimilarity: 0.6,
    /**
     * Author-list changes between the initial and camera-ready versions that make
     * the paper NOT camera-ready. Changes set to false are shown as warnings only.
     */
    blockingAuthorChanges: {
      added: true,
      removed: true,
      reordered: true,
      spelling: false,
    },
  },
} as const;

const requirement = z.enum(["must", "optional", "off"]);

const schema = z.object({
  template: z.string(),
  maxPages: z.number().int().positive(),
  extraPagesMax: z.number().int().positive(),
  pageSizes: z.array(z.object({ name: z.string(), widthPt: z.number().positive(), heightPt: z.number().positive() })).min(1),
  pageSizeTolerancePt: z.number().nonnegative(),
  textWidthPt: z.number().positive(),
  textWidthTolerancePt: z.number().nonnegative(),
  fonts: z.object({
    bodyPt: z.number().positive(),
    titlePt: z.number().positive(),
    abstractPt: z.number().positive(),
    referencesPt: z.number().positive(),
    tolerancePt: z.number().nonnegative(),
    allowedFamilies: z.array(z.string()),
  }),
  requireEmbeddedFonts: z.boolean(),
  placeholderPhrases: z.array(z.string()),
  checks: z.object({
    pageLimit: requirement,
    pageSize: requirement,
    columns: requirement,
    textWidth: requirement,
    bodyFont: requirement,
    abstract: requirement,
    fontFamily: requirement,
    title: requirement,
    keywords: requirement,
    references: requirement,
    embeddedFonts: requirement,
    placeholders: requirement,
  }),
  compare: z.object({
    surnameMatch: z.number().min(0).max(1),
    titleSimilarity: z.number().min(0).max(1),
    abstractSimilarity: z.number().min(0).max(1),
    blockingAuthorChanges: z.object({ added: z.boolean(), removed: z.boolean(), reordered: z.boolean(), spelling: z.boolean() }),
  }),
});

export type PaperConfig = z.infer<typeof schema>;
export type Requirement = z.infer<typeof requirement>;
export type CheckId = keyof PaperConfig["checks"];

const validated = schema.refine((c) => c.extraPagesMax >= c.maxPages, { message: "extraPagesMax must be at least maxPages" });

/** The defaults. Prefer the conference's own config (config/conferences.ts) in app code. */
export const paperConfig: PaperConfig = validated.parse(rawConfig);

export interface PaperConfigOverrides extends Partial<Omit<PaperConfig, "fonts" | "checks" | "compare">> {
  fonts?: Partial<PaperConfig["fonts"]>;
  checks?: Partial<PaperConfig["checks"]>;
  compare?: Partial<Omit<PaperConfig["compare"], "blockingAuthorChanges">> & { blockingAuthorChanges?: Partial<PaperConfig["compare"]["blockingAuthorChanges"]> };
}

/** The defaults with a conference's overrides applied, validated the same way. */
export function buildPaperConfig(o: PaperConfigOverrides = {}): PaperConfig {
  return validated.parse({
    ...paperConfig,
    ...o,
    fonts: { ...paperConfig.fonts, ...o.fonts },
    checks: { ...paperConfig.checks, ...o.checks },
    compare: {
      ...paperConfig.compare,
      ...o.compare,
      blockingAuthorChanges: { ...paperConfig.compare.blockingAuthorChanges, ...o.compare?.blockingAuthorChanges },
    },
  });
}
