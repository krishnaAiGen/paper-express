// Copies the pdf.js worker into public/ so the browser can load it from /pdf.worker.min.mjs.
// public/ may not exist in a fresh clone: git does not keep empty folders and the worker itself is gitignored.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const publicDir = new URL("../public/", import.meta.url);
mkdirSync(publicDir, { recursive: true });
copyFileSync(require.resolve("pdfjs-dist/build/pdf.worker.min.mjs"), new URL("pdf.worker.min.mjs", publicDir));
