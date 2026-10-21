import type * as PdfjsLib from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { groupLines } from "./lines";
import type { FontInfo, PdfDoc, PdfPage, TextRun } from "./types";

type Pdfjs = Pick<typeof PdfjsLib, "getDocument">;

/**
 * Reads every page of a PDF into runs, lines and font info. The pdfjs module is
 * passed in so the same code runs in the browser and under Node in tests.
 */
export async function extractPdf(pdfjs: Pdfjs, data: Uint8Array): Promise<PdfDoc> {
  const doc = await pdfjs.getDocument({ data, verbosity: 0, isEvalSupported: false }).promise;
  try {
    const fonts: Record<string, FontInfo> = {};
    const pages: PdfPage[] = [];

    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: 1 });
      // The operator list forces fonts to load so their names and embedding status are known.
      await page.getOperatorList();
      const content = await page.getTextContent();

      const runs: TextRun[] = [];
      for (const raw of content.items) {
        if (!("str" in raw)) continue;
        const item = raw as TextItem;
        if (!item.str) continue;
        const [, b, c, d, e, f] = item.transform;
        const size = Math.hypot(c, d) || Math.hypot(item.transform[0], b);
        runs.push({ str: item.str, x: e, y: f, width: item.width, size, fontId: item.fontName });
        if (!fonts[item.fontName]) fonts[item.fontName] = readFont(page.commonObjs, item.fontName);
      }

      pages.push({ number: n, width: viewport.width, height: viewport.height, runs, lines: groupLines(n, runs) });
      page.cleanup();
    }

    const meta = await doc.getMetadata().catch(() => null);
    const info = (meta?.info ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

    return {
      numPages: doc.numPages,
      pages,
      fonts,
      info: { title: str(info.Title), author: str(info.Author), producer: str(info.Producer) },
    };
  } finally {
    await doc.destroy();
  }
}

function readFont(objs: { get(id: string): unknown }, id: string): FontInfo {
  try {
    const font = objs.get(id) as { name?: string; missingFile?: boolean } | null;
    const name = (font?.name ?? id).replace(/^[A-Z]{6}\+/, "");
    return { id, name, embedded: !font?.missingFile };
  } catch {
    return { id, name: id, embedded: true };
  }
}
