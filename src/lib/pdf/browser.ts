import { extractPdf } from "./extract";
import type { PdfDoc } from "./types";

/** Parses a PDF in the browser. The file never leaves the user's machine. */
export async function readPdfFile(file: File | Uint8Array): Promise<PdfDoc> {
  const pdfjs = await import("pdfjs-dist");
  // Copied into public/ by scripts/copy-pdf-worker.mjs before dev and build.
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const data = file instanceof Uint8Array ? file : new Uint8Array(await file.arrayBuffer());
  return extractPdf(pdfjs, data);
}
