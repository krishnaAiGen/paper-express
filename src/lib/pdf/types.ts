/** A run of text as drawn in the PDF. Coordinates are PDF points, origin bottom-left. */
export interface TextRun {
  str: string;
  x: number;
  y: number;
  width: number;
  size: number;
  fontId: string;
}

/** Runs that share a baseline, left to right. */
export interface Line {
  page: number;
  text: string;
  x: number;
  right: number;
  y: number;
  /** Size of the font carrying most characters on the line. */
  size: number;
  fontId: string;
  runs: TextRun[];
}

export interface FontInfo {
  id: string;
  /** PostScript name with the subset prefix removed, e.g. "SFRM1000". */
  name: string;
  embedded: boolean;
}

export interface PdfPage {
  number: number;
  width: number;
  height: number;
  runs: TextRun[];
  lines: Line[];
}

export interface PdfDoc {
  numPages: number;
  pages: PdfPage[];
  fonts: Record<string, FontInfo>;
  info: { title?: string; author?: string; producer?: string };
}
