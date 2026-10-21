import { readFileSync } from "node:fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { extractPdf } from "@/lib/pdf/extract";

export const loadPdf = (path: string) => extractPdf(pdfjs, new Uint8Array(readFileSync(path)));
