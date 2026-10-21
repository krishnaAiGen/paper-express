"use client";

import { useCallback, useState } from "react";
import { readPdfFile } from "@/lib/pdf/browser";
import type { PdfDoc } from "@/lib/pdf/types";

export interface PdfState {
  fileName?: string;
  doc?: PdfDoc;
  busy: boolean;
  error?: string;
}

/** Turns a dropped file into a parsed PdfDoc, with readable errors for the usual failures. */
export async function parsePdf(name: string, data: Uint8Array | File): Promise<{ doc?: PdfDoc; error?: string }> {
  if (!/\.pdf$/i.test(name)) return { error: "This is not a PDF file." };
  try {
    const doc = await readPdfFile(data);
    const hasText = doc.pages.some((p) => p.runs.length > 0);
    return hasText ? { doc } : { doc, error: "This PDF has no text layer (scanned or exported as images), so it cannot be analysed." };
  } catch (e) {
    return { error: e instanceof Error && /password/i.test(e.message) ? "This PDF is password-protected." : "Could not read this PDF. It may be damaged." };
  }
}

export function usePdf() {
  const [state, setState] = useState<PdfState>({ busy: false });

  const load = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setState({ busy: true, fileName: file.name });
    setState({ busy: false, fileName: file.name, ...(await parsePdf(file.name, file)) });
  }, []);

  const reset = useCallback(() => setState({ busy: false }), []);

  return { ...state, load, reset };
}
