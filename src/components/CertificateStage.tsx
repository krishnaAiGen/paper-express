"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CERTIFICATE_HEIGHT, CERTIFICATE_WIDTH } from "./Certificate";

/** Scales the certificate to fit the window (same rule as the design) and offers printing / saving as PDF. */
export function CertificateStage({ children, backHref = "/" }: { children: ReactNode; backHref?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, Math.max(0.3, (el.clientWidth - 80) / CERTIFICATE_WIDTH)));
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div data-noprint="1" style={{ display: "flex", justifyContent: "center", gap: 10, paddingTop: 24 }}>
        <Link href={backHref} style={{ padding: "11px 14px", border: "1px solid #cfc9bc", background: "#fff", color: "#1b2033", fontSize: 14, borderRadius: 3, textDecoration: "none" }}>
          Back
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          style={{ padding: "11px 14px", border: "none", background: "#16213d", color: "#fff", fontFamily: "'Instrument Sans',sans-serif", fontSize: 14, fontWeight: 500, borderRadius: 3, cursor: "pointer" }}
        >
          Download PDF / Print
        </button>
      </div>
      <div data-stage="1" ref={stageRef} style={{ flex: 1, minWidth: 0, padding: 40, display: "flex", justifyContent: "center", alignItems: "flex-start", boxSizing: "border-box" }}>
        <div data-scalebox="1" style={{ width: Math.round(CERTIFICATE_WIDTH * scale), height: Math.round(CERTIFICATE_HEIGHT * scale), flex: "none" }}>
          <div
            data-scale="1"
            style={{
              width: CERTIFICATE_WIDTH,
              height: CERTIFICATE_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: "0 0",
              boxShadow: "0 1px 2px rgba(20,24,40,.08),0 18px 50px rgba(20,24,40,.12)",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
