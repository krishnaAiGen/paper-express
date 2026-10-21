"use client";

import { useRef, useState } from "react";

interface Props {
  label: string;
  hint?: string;
  fileName?: string;
  busy?: boolean;
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  /** Shows a × button once a file is loaded. */
  onClear?: () => void;
}

export function FileDrop({ label, hint, fileName, busy, accept = "application/pdf,.pdf", multiple, onFiles, onClear }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (files: FileList | null) => {
    if (files?.length) onFiles(Array.from(files));
    if (input.current) input.current.value = "";
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files);
        }}
        className={`flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-12 py-8 text-center transition-colors ${
          over ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white hover:border-slate-400"
        }`}
      >
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        {busy ? (
          <span className="text-sm text-slate-500">Reading…</span>
        ) : fileName ? (
          <span className="max-w-full truncate text-sm text-blue-700">{fileName}</span>
        ) : (
          <span className="text-sm text-slate-500">{hint ?? "Drop a PDF here or click to choose"}</span>
        )}
      </button>
      {fileName && onClear && !busy && (
        <button
          type="button"
          onClick={onClear}
          title="Upload a new paper"
          aria-label="Remove this file and upload a new paper"
          className="group absolute right-2 top-2 flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 shadow-sm hover:border-red-300 hover:text-red-700"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
          </svg>
          Upload a new paper
        </button>
      )}
      <input ref={input} type="file" accept={accept} multiple={multiple} className="hidden" onChange={(e) => take(e.target.files)} />
    </div>
  );
}
